require('dotenv').config();
const express = require('express');
const dns = require('dns');
const { Pool } = require('pg');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);

// Inicializa o Express
const app = express();

// Se o app estiver por trás de um proxy (ex: Render), habilita trust proxy
app.set('trust proxy', 1);

// Preferir IPv4 na resolução DNS para evitar erros ENETUNREACH em ambientes sem IPv6
try {
    if (typeof dns.setDefaultResultOrder === 'function') {
        dns.setDefaultResultOrder('ipv4first');
        console.log('⚙️ DNS result order set to ipv4first (prefer IPv4)');
    } else {
        console.log('⚙️ dns.setDefaultResultOrder not available on this Node version');
    }
} catch (err) {
    console.warn('⚠️ Could not change DNS result order:', err && err.message ? err.message : err);
}

// Configuração do CORS
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Variável do pool que será inicializada assincronamente
let pool;

// === Função para obter conexão do pool ===
async function getConnection() {
    if (!pool) throw new Error('Pool de conexões ainda não inicializado');
    try {
        const client = await pool.connect();
        console.log('✨ Conectado ao banco de dados');
        return client;
    } catch (error) {
        console.error('❌ Erro ao obter conexão do pool:', error);
        throw error;
    }
}

// Função de inicialização: resolve host do DB para IPv4 e cria o pool
async function init() {
    const PORT = process.env.PORT || 3000;

    if (!process.env.DB_URL) {
        console.error('❌ Variável DB_URL não configurada. Abortando.');
        process.exit(1);
    }

    try {
        const dbUrl = process.env.DB_URL;
        let parsed;
        try { parsed = new URL(dbUrl); } catch (err) { parsed = null; }

        let host = parsed ? parsed.hostname : null;
        let port = parsed && parsed.port ? parsed.port : '5432';

        // Tenta resolver o host para IPv4
        if (host) {
            try {
                const lookup = await dns.promises.lookup(host, { family: 4 });
                host = lookup.address;
                console.log('⚙️ DB host resolvido para IPv4:', host);
            } catch (err) {
                console.warn('⚠️ Não foi possível resolver IPv4 para o host do DB, prosseguindo com o hostname original:', err && err.message ? err.message : err);
            }
        }

        // Construir configuração do pool a partir da URL, usando host possivelmente convertido
        if (parsed && host) {
            const user = parsed.username || undefined;
            const password = parsed.password || undefined;
            const database = (parsed.pathname || '').replace(/^\//, '') || undefined;

            pool = new Pool({
                user,
                password,
                host,
                port: Number(port),
                database,
                ssl: { rejectUnauthorized: false }
            });
        } else {
            // fallback: usar connectionString inteira
            pool = new Pool({ connectionString: process.env.DB_URL, ssl: { rejectUnauthorized: false } });
        }

        // Testa conexão e cria tabela de sessões
        const client = await pool.connect();
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS "session" (
                    "sid" varchar NOT NULL COLLATE "default",
                    "sess" json NOT NULL,
                    "expire" timestamp(6) NOT NULL,
                    CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
                );
            `);
            await client.query(`CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");`);
            console.log('✅ Tabela de sessões verificada/criada');
        } finally {
            client.release();
        }
        console.log('✅ Pool de conexões inicializado com sucesso');

        // Configurar sessão com PostgreSQL (agora que pool existe)
        app.use(session({
            store: new pgSession({ pool: pool, tableName: 'session' }),
            secret: process.env.SESSION_SECRET || 'segredo',
            resave: false,
            saveUninitialized: false,
            cookie: {
                maxAge: 30 * 24 * 60 * 60 * 1000,
                secure: true,
                sameSite: 'none',
                httpOnly: true
            }
        }));

        app.use(passport.initialize());
        app.use(passport.session());

        // Importa o arquivo auth.js com o passport e conexão do db.
        const authRoutes = require('./auth/auth.js')(passport, getConnection);
        app.use('/api/auth', authRoutes);

        const appRoutes = require('./routes/routes.js')(getConnection);
        app.use('/', appRoutes);

        // Handlers para capturar erros não tratados e registrar detalhes
        process.on('unhandledRejection', (reason, p) => {
            console.error('Unhandled Rejection at:', p, 'reason:', reason);
        });
        process.on('uncaughtException', (err) => {
            console.error('Uncaught Exception:', err);
        });

        app.listen(PORT, () => {
            console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
        });

    } catch (err) {
        console.error('❌ Falha na inicialização do servidor:', err);
        process.exit(1);
    }
}

// Inicia a aplicação
init();