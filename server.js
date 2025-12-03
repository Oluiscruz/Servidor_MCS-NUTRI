const express = require('express');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3002;

const dbConfig = {
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: 'Kira123@',
    database: 'Clinica'
};

app.use(cors()); // faz a comunicação entre front e back
app.use(express.json()); // para o express entender json

async function getConnection() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('✨ Conectado ao MySQL com sucesso!');
        return connection;

    } catch (error) {
        console.error('❌ Erro ao conectar ao MySQL:', error);
        throw error;
    }

}

// Rota de cadastro médico
app.post('/api/medico/cadastro', async (req, res) => {
    const { nome, telefone, sexo, crm, email, senha_medico } = req.body;
    

    if (!senha_medico || !email || !crm || !nome || !telefone || !sexo) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios.' })
    }

    var connection;

    try {
        connection = await getConnection();

        // Criptografar a senha
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(senha_medico, saltRounds);

        // Inserir o médico no banco de dados
        const [result] = await connection.execute(
            'INSERT INTO Medico (nome, telefone, sexo, crm, email, senha_medico) VALUES (?, ?, ?, ?, ?, ?)',
            [nome, telefone, sexo, crm, email, hashedPassword]
        );

        res.status(201).json({
            message: 'Médico cadastrado com sucesso!',
            id: result.insertId,
            nome,
            email
        });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ message: 'CRM ou email já cadastrado.' });
        }
        console.error('❌ Erro ao cadastrar médico:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    } finally {
        if (connection) connection.end();
    }
});

// Rota de cadastro paciente
app.post('/api/paciente/cadastro', async (req, res) => {
    const { nome, telefone, sexo, cpf, email, senha_paciente } = req.body;

    if (!senha_paciente || !email || !cpf || !nome || !telefone || !sexo) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios.' })
    }

    var connection;
    try {
        connection = await getConnection();

        // Criptografar a senha
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(senha_paciente, saltRounds);

        // Inserir o médico no banco de dados
        const [result] = await connection.execute(
            'INSERT INTO Paciente (nome, telefone, sexo, cpf, email, senha_paciente) VALUES (?, ?, ?, ?, ?, ?)',
            [nome, telefone, sexo, cpf, email, hashedPassword]
        );

        res.status(201).json({
            message: 'Paciente cadastrado com sucesso!',
            id: result.insertId,
            nome,
            email
        });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ message: 'CPF ou email já cadastrado.' });
        }
        console.error('❌ Erro ao cadastrar paciente:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    } finally {
        if (connection) connection.end();
    }
});

// Rota de login médico
app.post('/api/login/medico', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email e senha são obrigatórios.' })
    };

    var connection;
    try {
        connection = await getConnection();

        // Buscar o médico pelo email
        const [rows] = await connection.execute(
            'SELECT id_medico, nome, email, senha_medico FROM Medico WHERE email = ?',
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Email ou senha inválidos.' });
        }

        const medico = rows[0];

        // Comparar a senha fornecida com a senha armazenada
        const match = await bcrypt.compare(password, medico.senha_medico);

        if (match) {
            res.json({
                message: 'Login bem-sucedido!',
                user: { id: medico.id_medico, nome: medico.nome, email: medico.email, tipo: 'medico' }
            })
        } else {
            res.status(401).json({ message: 'Email ou senha inválidos.' });
        }
    } catch (error) {
        console.error('❌ Erro ao realizar login:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    } finally {
        if (connection) connection.end();
    }
});

// Rota de login paciente
app.post('/api/login/paciente', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email e Senha são obrigatórios.' });
    }

    let connection;
    try {
        connection = await getConnection();

        // 1. Buscar o paciente pelo email
        const [rows] = await connection.execute(
            'SELECT id_paciente, nome, email, senha_paciente FROM Paciente WHERE email = ?',
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        const paciente = rows[0];

        // 2. Comparar a senha fornecida com a senha criptografada
        const match = await bcrypt.compare(password, paciente.senha_paciente);

        if (match) {
            // Em um ambiente real, aqui você geraria um JWT (JSON Web Token)
            res.json({
                message: 'Login de paciente realizado com sucesso!',
                user: { id: paciente.id_paciente, nome: paciente.nome, email: paciente.email, tipo: 'paciente' }
                // token: 'SEU_TOKEN_JWT_AQUI' 
            });
        } else {
            res.status(401).json({ message: 'Credenciais inválidas.' });
        }

    } catch (error) {
        console.error('Erro ao fazer login de paciente:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    } finally {
        if (connection) connection.end();
    }
});

// Rota Principal (Health Check)
app.get('/', (req, res) => {
    res.send('API da Clínica está rodando! Acesse as rotas /api/register/* e /api/login/*');
});


// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);

    getConnection().catch(err => {
        console.warn('Servidor iniciado, mas a conexão inicial com o banco falhou.');
        console.warn('Verifique as credenciais em server.js e se o MySQL está ativo.');
    });
});
