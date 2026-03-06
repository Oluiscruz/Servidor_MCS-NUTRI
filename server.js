require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);

// Inicializa o Express
const app = express();
// Configuração CORRETA do CORS
app.use(cors({
    origin: process.env.FRONTEND_URL, // SEM barra no final
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// === Pool de conexões com o PostgreeSQL ====
const pool = new Pool({
    connectionString: process.env.DB_URL,
    ssl: { rejectUnauthorized: false }
});

// Configurar sessão com PostgreSQL
app.use(session({
    store: new pgSession({
        pool: pool,
        tableName: 'session'
    }),
    secret: process.env.SESSION_SECRET || 'segredo',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        secure: process.env.NODE_ENV === 'production'
    }
}));
app.use(passport.initialize());
app.use(passport.session());

// === Função para obter conexão do pool === //
async function getConnection() {
    try {
        const client = await pool.connect();
        console.log('✨ Conectado ao banco de dados');
        return client;

    } catch (error) {
        console.error('❌ Erro ao obter conexão do pool:', error);
        throw error;
    }
}

// Importa o arquivo auth.js com o passport e conexão do db.
const authRoutes = require('./auth/auth.js')(passport, getConnection);
app.use('/api/auth', authRoutes);

const appRoutes = require('./routes/routes.js')(getConnection);
app.use('/', appRoutes);


// Inicia o servidor
const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
