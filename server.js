require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');
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

// === Pool de conexões com o PostgreeSQL ====
const pool = new Pool({
    connectionString: process.env.DB_URL,
    ssl: { rejectUnauthorized: false }
});

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
const authRoutes = require('./auth.js')(passport, getConnection);
app.use('/api/auth', authRoutes);

const appRoutes = require('./routes.js')(getConnection);
app.use('/', appRoutes);


// Inicia o servidor
const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
