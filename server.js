require('dotenv').config();

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');

// Inicializa o Express
const app = express();
app.use(cors()); // faz a comunicação entre front e back
app.use(express.json());
app.use(session({
    secret: 'segredo',
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize());
app.use(passport.session());

// === Pool de conexões com o banco de dados ====
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DATABASE_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// === Função para obter conexão do pool === //
async function getConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✨ Conexão obtida do pool!');
        return connection;
    } catch (error) {
        console.error('❌ Erro ao obter conexão do pool:', error);
        throw error;
    }
}

// Importa o arquivo auth.js com o passport e conexão do db.
const authRoutes = require('./auth.js')(passport, getConnection);
app.use('/api/auth', authRoutes);

const appRoutes = require('./routes.js')(getConnection);
app.use('/', appRoutes);


// Inicia o servidor
const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
