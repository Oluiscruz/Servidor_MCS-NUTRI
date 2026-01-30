require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

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

app.use(cors()); // faz a comunicação entre front e back
app.use(express.json()); // para o express entender json

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

// Rota Principal (Health Check)
app.get('/', (res) => {
    res.send('API de NutriMS está rodando! Acesse as rotas /api/cadastro/* e /api/login/*');
});

// Rota de cadastro nutricionista
app.post('/api/nutricionista/cadastro', async (req, res) => {
    const { nome, telefone, crn, email, senha } = req.body;

    if (!email || !senha || !crn || !nome || !telefone) {
        return res.status(400).json({ message: 'Por favor, preencha todos os campos.' })
    }

    let connection;
    try {
        connection = await getConnection();

        // Criptografar a senha
        const saltRounds = 10;
        const senhaHashed = await bcrypt.hash(senha, saltRounds);

        // Inserir o nutri no banco de dados
        const [result] = await connection.execute(
            'INSERT INTO nutricionistas (nome, telefone, crn, email, senha) VALUES (?, ?, ?, ?, ?)',
            [nome, telefone, crn, email, senhaHashed]
        );

        res.status(201).json({
            message: '✅ Nutri cadastrado com sucesso!',
            id: result.insertId,
            nome,
            email,
            crn,
            telefone
        });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') { return res.status(409).json({ message: '🔍 CRN ou email já cadastrado.' }); }
        console.error('❌ Erro ao cadastrar médico:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    } finally { if (connection) connection.release(); }
});

// Rota de cadastro paciente
app.post('/api/paciente/cadastro', async (req, res) => {
    const { nome, telefone, sexo, data_nascimento, email, senha } = req.body;

    if (!email || !senha || !nome || !telefone || !sexo || !data_nascimento) {
        return res.status(400).json({ message: 'Por favor, preencha todos os campos.' })
    }

    let connection;
    try {
        connection = await getConnection();

        // Criptografar a senha
        const saltRounds = 10;
        const senhaHashed = await bcrypt.hash(senha, saltRounds);

        // Inserir o paciente no banco de dados
        const [result] = await connection.execute(
            'INSERT INTO pacientes (nome, telefone, sexo, email, senha, data_nascimento) VALUES (?, ?, ?, ?, ?, ?)',
            [nome, telefone, sexo, email, senhaHashed, data_nascimento]
        );

        res.status(201).json({
            message: 'Paciente cadastrado com sucesso!',
            id: result.insertId,
            nome,
            email,
            data_nascimento,
            telefone,
            sexo
        });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: '🔍 Email já cadastrado.' });
        }
        console.error('❌ Erro ao cadastrar paciente:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }

    finally { if (connection) connection.release(); }
});

// Rota de login nutricionista
app.post('/api/nutricionista/login', async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        console.log('/api/nutricionista/login - campos ausentes. Body keys:', Object.keys(req.body || {}));
        return res.status(400).json({ message: 'Informe um email ou senha.' })
    };

    let connection;
    try {
        connection = await getConnection();

        // Buscar o nutri pelo email
        const [rows] = await connection.execute(
            'SELECT id, nome, email, senha, crn, telefone FROM nutricionistas WHERE email = ?',
            [email]
        );

        if (rows.length === 0) return res.status(401).json({ message: '❌ Email ou senha inválidos.' });
        
        const nutri = rows[0];
        const match = await bcrypt.compare(senha, nutri.senha);

        if (match) {
            res.json({
                message: '✅ Login bem-sucedido!',
                usuario: {
                    id: nutri.id,
                    nome: nutri.nome,
                    email: nutri.email,
                    crn: nutri.crn,
                    telefone: nutri.telefone,
                    tipo: 'nutricionista'
                }
            });
        } else {
            res.status(401).json({ message: '❌ Email ou senha inválidos.' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }

    finally { if (connection) connection.release(); }
});

// Rota de login paciente
app.post('/api/paciente/login', async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        console.warn('/api/paciente/login - campos ausentes. Body keys:', Object.keys(req.body || {}));
        return res.status(400).json({ message: 'Por favor, informe um email e senha' });
    }

    let connection;
    try {
        connection = await getConnection();
        // 1. Buscar o paciente pelo email 
        const [rows] = await connection.execute(
            'SELECT id, nome, telefone, email, senha FROM pacientes WHERE email = ?',
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: '❌ Email ou senha inválidos.' });
        }

        const paciente = rows[0];

        // 2. Comparar a senha fornecida com a senha criptografada
        const match = await bcrypt.compare(senha, paciente.senha);

        if (match) {
            // Em um ambiente real, aqui você geraria um JWT (JSON Web Token)
            res.json({
                message: '✅ Login de paciente realizado com sucesso!',
                usuario: {
                    id: paciente.id,
                    nome: paciente.nome,
                    email: paciente.email,
                    telefone: paciente.telefone,
                    tipo: 'paciente'
                }
                // token: 'SEU_TOKEN_JWT_AQUI' 
            });

        } else {
            res.status(401).json({ message: '❌ Email ou senha inválidos.' });
        }

    } catch (error) {
        console.error('Erro ao fazer login de paciente:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }

    finally { if (connection) connection.release(); }
});

// ====== ROTA DE DIAS DISPONÍVEIS ======= //

app.post('/api/nutricionista/agenda/salvar-data', async (req, res) => {
    const { nutricionista_id, mes, dia, ano, hora_inicio, hora_fim } = req.body;

    if (!nutricionista_id || !mes || !dia || !ano || !hora_inicio || !hora_fim ) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
    }

    let connection;
    try {
        connection = await getConnection();

        // Verificar se já existe
        const [existente] = await connection.execute(
            'SELECT id FROM dias_disponiveis WHERE nutricionista_id = ? AND mes = ? AND dia = ? AND ano = ? AND hora_inicio = ? AND hora_fim = ?',
            [nutricionista_id, mes, dia, ano, hora_inicio, hora_fim]
        );

        if (existente.length > 0) {
            return res.status(409).json({ message: 'Data já cadastrada' });
        }

        const [result] = await connection.execute(
            'INSERT INTO dias_disponiveis (nutricionista_id, mes, dia, ano, hora_inicio, hora_fim) VALUES ( ?, ?, ?, ?, ?, ?)',
            [nutricionista_id, mes, dia, ano, hora_inicio, hora_fim ]
        );

        res.status(201).json({ message: 'Data salva com sucesso!', id: result.insertId });
    } catch (error) {
        console.error('Erro ao salvar data:', error);
        res.status(500).json({ message: 'Erro ao salvar data.' });
    } finally {
        if (connection) connection.release();
    }
});

// Listar dias disponíveis
app.get('/api/nutricionista/agenda/dias-disponiveis', async (req, res) => {
    const { nutricionista_id } = req.query;

    let connection;
    try {
        connection = await getConnection();

        const [dias] = await connection.execute(
            'SELECT * FROM dias_disponiveis WHERE nutricionista_id = ? AND disponivel = true ORDER BY ano, mes, dia, hora_inicio, hora_fim',
            [nutricionista_id]
        );

        res.json({ dias });
    } catch (error) {
        console.error('Erro ao buscar dias:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});

// rota tempo de atendimento
app.post('/api/nutricionista/agenda/tempo-atendimento', async (req, res) => {
    const { nutricionista_id, tempo_atendimento } = req.body;

    if (!nutricionista_id || !tempo_atendimento) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
    }
    let connection;
    try {
        connection = await getConnection();
        const [result] = await connection.execute(
            'UPDATE nutricionistas SET tempo_atendimento = ? WHERE id = ?',
            [tempo_atendimento, nutricionista_id]
        );
        res.status(200).json({ message: 'Tempo de atendimento atualizado com sucesso!' });
    }
    catch (error) {
        console.error('Erro ao atualizar tempo de atendimento:', error);
        res.status(500).json({ message: 'Erro ao atualizar tempo de atendimento.' });
    }
    finally {
        if (connection) connection.release();
    }
});


// Iniciar o servidor
app.listen(process.env.PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
