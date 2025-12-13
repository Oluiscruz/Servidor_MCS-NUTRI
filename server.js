const express = require('express');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

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
    const { nome, telefone, sexo, crm, email, senha_medico, especialidade } = req.body;


    if (!senha_medico || !email || !crm || !nome || !telefone || !sexo || !especialidade) {
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
            'INSERT INTO Medico (nome, telefone, sexo, crm, email, senha_medico, especialidade) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [nome, telefone, sexo, crm, email, hashedPassword, especialidade]
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

    // Log de depuração: mostra se o corpo chegou corretamente (não exibe a senha em claro)
    try {
        const receivedKeys = req.body && typeof req.body === 'object' ? Object.keys(req.body) : [];
        console.log('🔔 /api/login/medico recebido keys:', receivedKeys);
        console.log('🔔 /api/login/medico email presente:', !!email);
    } catch (logErr) {
        console.warn('Falha ao logar corpo do request:', logErr);
    }

    if (!email || !password) {
        console.warn('/api/login/medico - campos ausentes. Body keys:', Object.keys(req.body || {}));
        return res.status(400).json({ message: 'Informe um email ou senha.' })
    };

    var connection;
    try {
        connection = await getConnection();

        // Buscar o médico pelo email
        const [rows] = await connection.execute(
            'SELECT id_medico, nome, email, senha_medico, crm FROM Medico WHERE email = ?',
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
                message: '✅ Login bem-sucedido!',
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

    // Log de depuração: mostra se o corpo chegou corretamente (não exibe a senha em claro)
    try {
        const receivedKeys = req.body && typeof req.body === 'object' ? Object.keys(req.body) : [];
        console.log('🔔 /api/login/paciente recebido keys:', receivedKeys);
        console.log('🔔 /api/login/paciente email presente:', !!email);
    } catch (logErr) {
        console.warn('Falha ao logar corpo do request:', logErr);
    }

    if (!email || !password) {
        console.warn('/api/login/paciente - campos ausentes. Body keys:', Object.keys(req.body || {}));
        return res.status(400).json({ message: 'Por favor, informe um email e senha' });
    }

    let connection;
    try {
        connection = await getConnection();

        // 1. Buscar o paciente pelo email ou CPF
        const [rows] = await connection.execute(
            'SELECT id_paciente, nome, email, senha_paciente, cpf FROM Paciente WHERE email = ?',
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
                message: '✅ Login de paciente realizado com sucesso!',
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
    res.send('API da Clínica está rodando! Acesse as rotas /api/cadastro/* e /api/login/*');
});

// Rota para listar médicos no Select do dashboard de pacientes.
// O frontend solicita `/api/medicos` (plural), então expomos essa rota.
app.get('/api/medicos', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        // O código abaixo faz uma busca por ID, nome e especialidade para preencher o formulário;
        const [rows] = await connection.execute(
            'SELECT id_medico, nome, especialidade FROM Medico'
        );
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar médicos', error);
        res.status(500).json({ message: 'Erro ao buscar médicos' })
    } finally {
        if (connection) connection.end();
    }
});

// Mantemos também a rota singular como alias caso algum cliente ainda use `/api/medico`.
app.get('/api/medico', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.execute(
            'SELECT id_medico, nome, especialidade FROM Medico'
        );
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar médicos (alias)', error);
        res.status(500).json({ message: 'Erro ao buscar médicos' })
    } finally {
        if (connection) connection.end();
    }
});

// Rota para agendar consulta:
app.post('/api/agendar', async (req, res) => {
    const { id_medico, id_paciente, data_horario } = req.body;

    if (!id_medico || !id_paciente || !data_horario) {
        return res.status(400).json({ message: 'Dados incompletos para agendamento.' })
    }

    let connection;
    try {
        connection = await getConnection();

        // O código abaixo verifica se o médico já possui horário agendado.
        const [existente] = await connection.execute(
            'SELECT * FROM Consulta WHERE id_medico = ? AND data_consulta = ?',
            [id_medico, data_horario]
        );

        if (existente.length > 0) {
            return res.status(409).json({ message: 'Horário indisponível para este médico.' })
        }

        // Insere na tabela consulta:
        await connection.execute(
            'INSERT INTO Consulta (id_medico, id_paciente, data_consulta) VALUES (?, ?, ?)',
            [id_medico, id_paciente, data_horario]
        );

        res.status(201).json({ message: 'Consulta agendada com sucesso!' })
    } catch (error) {
        console.error('Erro ao agendar consulta', error);
        res.status(500).json({ message: 'Erro interno ao agendar consulta' })

    } finally {
        if (connection) connection.end();
    }
});

// Rota para listar consultas de um paciente (por id)
app.get('/api/consultas/paciente/:id', async (req, res) => {
    const idPaciente = req.params.id;
    if (!idPaciente) return res.status(400).json({ message: 'ID do paciente é obrigatório.' });

    let connection;
    try {
        connection = await getConnection();

        // Busca consultas com nome do médico e especialidade
        const [rows] = await connection.execute(
            `SELECT c.id_consulta, c.data_consulta, c.diagnostico, m.id_medico, m.nome AS medico_nome, m.especialidade
             FROM Consulta c
             JOIN Medico m ON c.id_medico = m.id_medico
             WHERE c.id_paciente = ?
             ORDER BY c.data_consulta ASC`,
            [idPaciente]
        );

        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar consultas do paciente', error);
        res.status(500).json({ message: 'Erro ao buscar consultas' });
    } finally {
        if (connection) connection.end();
    }
});

// Rota para deletar uma consulta por id
app.delete('/api/consultas/paciente/:id', async (req, res) => {
    const idConsulta = req.params.id;
    if (!idConsulta) return res.status(400).json({ message: 'ID da consulta é obrigatório.' });

    let connection;
    try {
        connection = await getConnection();

        const [result] = await connection.execute(
            'DELETE FROM Consulta WHERE id_consulta = ?',
            [idConsulta]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Consulta não encontrada.' });
        }

        res.json({ message: 'Consulta deletada com sucesso.' });
    } catch (error) {
        console.error('Erro ao deletar consulta', error);
        res.status(500).json({ message: 'Erro ao deletar consulta' });
    } finally {
        if (connection) connection.end();
    }
});


// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);

    getConnection().catch(err => {
        console.warn('Servidor iniciado, mas a conexão inicial com o banco falhou.');
    });
});
