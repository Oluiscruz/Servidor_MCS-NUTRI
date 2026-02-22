const express = require('express');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

module.exports = function(passport, getConnection) {
    const router = express.Router();
    const FRONTEND_URL = process.env.FRONTEND_URL;

    // === Configuração da Estratégia do Google ===
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.CALLBACK_URL
    },

    async (accessToken, refreshToken, profile, done) => {
        let connection;
        try {
            connection = await getConnection();
            
            // 1. Verifica se o paciente já existe pelo google_id ou email
            const [rows] = await connection.execute(
                'SELECT * FROM pacientes WHERE google_id = ? OR email = ?',
                [profile.id, profile.emails[0].value]
            );

            if (rows.length > 0) {
                let paciente = rows[0];
                if (!paciente.google_id) {
                    await connection.execute(
                        'UPDATE pacientes SET google_id = ? WHERE id = ?',
                        [profile.id, paciente.id]
                    );
                    paciente.google_id = profile.id;
                }
                return done(null, paciente);
            }

            // 2. Se não existe, cria um novo paciente
            const novoPaciente = {
                nome: profile.displayName,
                email: profile.emails[0].value,
                google_id: profile.id
            };

            const [result] = await connection.execute(
                'INSERT INTO pacientes (nome, email, google_id) VALUES (?, ?, ?)',
                [novoPaciente.nome, novoPaciente.email, novoPaciente.google_id]
            );

            novoPaciente.id = result.insertId;
            return done(null, novoPaciente);

        } catch (error) {
            console.error('Erro no Google Strategy:', error);
            return done(error, null);
        } finally {
            if (connection) connection.release();
        }
    }));

    // === Serialização do Usuário (Sessão) ===
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        let connection;
        try {
            connection = await getConnection();
            const [rows] = await connection.execute('SELECT * FROM pacientes WHERE id = ?', [id]);
            done(null, rows[0]);
        } catch (error) {
            done(error, null);
        } finally {
            if (connection) connection.release();
        }
    });

    // ==========================================
    // ====== ROTAS DE AUTENTICAÇÃO GOOGLE ======
    // ==========================================

    router.get('/google',
        passport.authenticate('google', { scope: ['profile', 'email'] })
    );

    router.get('/google/callback', 
        passport.authenticate('google', { failureRedirect: `${FRONTEND_URL}/paciente/login?erro=true` }),
        (req, res) => {
            // Redireciona para o frontend com os dados do usuário na URL
            const userData = encodeURIComponent(JSON.stringify({
                id: req.user.id,
                nome: req.user.nome,
                email: req.user.email,
                tipo: 'paciente'
            }));
            res.redirect(`${FRONTEND_URL}/auth/callback?user=${userData}`);
        }
    );

    return router;
};
