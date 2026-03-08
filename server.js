require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);

// Inicializa o Express
const app = express();

// Se o app estiver por trás de um proxy (ex: Render), habilita trust proxy
app.set('trust proxy', 1);

// Configuração do CORS
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:8080'
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
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
        secure: true,
        sameSite: 'none',
        httpOnly: true
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
