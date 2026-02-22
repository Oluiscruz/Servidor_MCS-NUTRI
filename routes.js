// Arquivo com todas as rotas da API

const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const routes = express.Router();

const uploadsDir = path.resolve(__dirname, 'crn_documento');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const fileName = crypto.randomBytes(16).toString('hex');
        const extension = path.extname(file.originalname);
        cb(null, `${fileName}${extension}`);
    }
});

const upload = multer({ storage: storage });

module.exports = function (getConnection) {

    // Rota Principal (Health Check)
    routes.get('/', (req, res) => {
        res.send('API de NutriMS está rodando! Acesse as rotas /api/cadastro/* e /api/login/*');
    });

    // Rota de cadastro nutricionista
    routes.post('/api/nutricionista/cadastro', upload.single('crn_documento'), async (req, res) => {
        const { nome, telefone, crn_numero, crn_regiao, email, senha, tempo_atendimento } = req.body;

        if (!email || !senha || !crn_numero || !crn_regiao || !nome || !telefone) {
            return res.status(400).json({ message: 'Por favor, preencha todos os campos.' })
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Por favor, envie o documento CRN.' })
        }

        const crn_documento = req.file.filename;
        const tempoAtendimento = tempo_atendimento || 30;

        let connection;
        try {
            connection = await getConnection();

            // Criptografar a senha
            const saltRounds = 10;
            const senhaHashed = await bcrypt.hash(senha, saltRounds);

            // Inserir o nutri no banco de dados
            const [result] = await connection.execute(
                'INSERT INTO nutricionistas (nome, telefone, crn_numero, crn_regiao, crn_documento, email, senha, tempo_atendimento) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [nome, telefone, crn_numero, crn_regiao, crn_documento, email, senhaHashed, tempoAtendimento]
            );

            res.status(201).json({
                message: '✅ Nutri cadastrado com sucesso!',
                id: result.insertId,
                nome,
                email,
                telefone,
                crn_regiao,
                crn_numero,
            });

        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') { return res.status(409).json({ message: '🔍 CRN ou email já cadastrado.' }); }
            console.error('❌ Erro ao cadastrar médico:', error);
            res.status(500).json({ message: 'Erro interno do servidor.' });
        } finally { if (connection) connection.release(); }
    });

    // Rota de cadastro paciente
    routes.post('/api/paciente/cadastro', async (req, res) => {
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
    routes.post('/api/nutricionista/login', async (req, res) => {
        const { email, senha } = req.body;

        if (!email || !senha) {
            console.log('/api/nutricionista/login');
            return res.status(400).json({ message: 'Informe um email ou senha.' })
        };

        let connection;
        try {
            connection = await getConnection();

            // Buscar o nutri pelo email
            const [rows] = await connection.execute(
                'SELECT id, nome, email, senha, crn_numero, crn_regiao, crn_documento, telefone FROM nutricionistas WHERE email = ?',
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
                        crn_regiao: nutri.crn_regiao,
                        crn_numero: nutri.crn_numero,
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

    // Rota de login/cadastro via Google Auth
    routes.post('/api/paciente/google-auth', async (req, res) => {
        const { email, nome, telefone } = req.body;

        if (!email || !nome) {
            return res.status(400).json({ message: 'Email e nome são obrigatórios.' });
        }

        let connection;
        try {
            connection = await getConnection();

            // Verificar se o paciente já existe
            const [rows] = await connection.execute(
                'SELECT id, nome, telefone, email FROM pacientes WHERE email = ?',
                [email]
            );

            if (rows.length > 0) {
                // Paciente já existe, retorna os dados
                const paciente = rows[0];
                return res.json({
                    message: '✅ Login realizado com sucesso!',
                    usuario: {
                        id: paciente.id,
                        nome: paciente.nome,
                        email: paciente.email,
                        telefone: paciente.telefone,
                        tipo: 'paciente'
                    }
                });
            }

            // Paciente não existe, criar novo
            const [result] = await connection.execute(
                'INSERT INTO pacientes (nome, email, telefone, senha, sexo, data_nascimento) VALUES (?, ?, ?, ?, ?, ?)',
                [nome, email, telefone || null, 'google_auth', 'Não informado', '2000-01-01']
            );

            res.status(201).json({
                message: '✅ Cadastro realizado com sucesso!',
                usuario: {
                    id: result.insertId,
                    nome,
                    email,
                    telefone: telefone || null,
                    tipo: 'paciente'
                }
            });

        } catch (error) {
            console.error('Erro no Google Auth:', error);
            res.status(500).json({ message: 'Erro interno do servidor.' });
        } finally {
            if (connection) connection.release();
        }
    });

    // Rota de login paciente
    routes.post('/api/paciente/login', async (req, res) => {
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

    // Listar todos os nutricionistas
    routes.get('/api/nutricionistas/listar', async (req, res) => {
        let connection;
        try {
            connection = await getConnection();
            const [nutricionistas] = await connection.execute(
                'SELECT id, nome, CONCAT(crn_regiao, "-", crn_numero) as crn, telefone FROM nutricionistas ORDER BY nome'
            );
            res.json({ nutricionistas });
        } catch (error) {
            console.error('Erro ao listar nutricionistas:', error);
            res.status(500).json({ message: 'Erro ao buscar nutricionistas.' });
        } finally {
            if (connection) connection.release();
        }
    });

    // ====== ROTA DE DIAS DISPONÍVEIS ======= //

    routes.post('/api/nutricionista/agenda/salvar-data', async (req, res) => {
        const { nutricionista_id, mes, dia, ano, hora_inicio, hora_fim } = req.body;

        if (!nutricionista_id || !mes || !dia || !ano || !hora_inicio || !hora_fim) {
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
                [nutricionista_id, mes, dia, ano, hora_inicio, hora_fim]
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
    routes.get('/api/nutricionista/agenda/dias-disponiveis', async (req, res) => {
        const { nutricionista_id } = req.query;

        console.log('📅 Buscando dias disponíveis para nutricionista_id:', nutricionista_id);

        if (!nutricionista_id) {
            return res.status(400).json({ message: 'nutricionista_id é obrigatório', dias: [] });
        }

        let connection;
        try {
            connection = await getConnection();

            const query = `
        SELECT d.*,
        COALESCE(n.tempo_atendimento, '00:30:00') as tempo_atendimento
        FROM dias_disponiveis d
        JOIN nutricionistas n ON d.nutricionista_id = n.id
        WHERE d.nutricionista_id = ?
        ORDER BY d.ano, d.mes, d.dia, d.hora_inicio
        `;

            const [dias] = await connection.execute(query, [nutricionista_id]);
            console.log(`✅ Encontrados ${dias.length} dias disponíveis:`, dias);
            res.json({ dias });

        } catch (error) {
            console.error('❌ Erro ao buscar dias:', error);
            res.status(500).json({ message: 'Erro interno do servidor', dias: [] });
        } finally {
            if (connection) connection.release();
        }
    });

    // ROTA DOS HORÁRIOS OCUPADOS
    routes.get('/api/nutricionista/agenda/horarios-ocupados', async (req, res) => {
        const { nutricionista_id } = req.query;

        if (!nutricionista_id) {
            return res.status(400).json({ message: 'nutricionista_id é obrigatório', ocupados: [] });
        }

        let connection;
        try {
            connection = await getConnection();
            // Busca os agendamentos que NÃO estão cancelados para aquele nutricionista
            const [ocupados] = await connection.execute(
                'SELECT dia, mes_ano as mes, ano, hora_agendamento FROM agendamentos WHERE nutricionista_id = ? AND status != ?',
                [nutricionista_id, 'Cancelado']
            );

            res.json({ ocupados });
        } catch (error) {
            console.error('❌ Erro ao buscar horários ocupados:', error);
            res.status(500).json({ message: 'Erro interno do servidor', ocupados: [] });
        } finally {
            if (connection) connection.release();
        }
    });

    // ROTA DE SALVAR AGENDAMENTO feito pelo cliente:
    routes.post('/api/paciente/agendamento/novo', async (req, res) => {
        const { paciente_id, nutricionista_id, data_selecionada, horario, status } = req.body;
        
        console.log('📋 Dados recebidos:', { paciente_id, nutricionista_id, data_selecionada, horario, status });
        
        // Validação mínima dos campos obrigatórios
        if (!paciente_id || !nutricionista_id || !data_selecionada || !horario) {
            console.log('❌ Campos faltando:', { 
                paciente_id: !!paciente_id, 
                nutricionista_id: !!nutricionista_id, 
                data_selecionada: !!data_selecionada, 
                horario: !!horario 
            });
            return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
        }

        // Define status padrão se não vier do frontend
        const statusAgendamento = status || 'Pendente';

        const dataObj = new Date(data_selecionada);
        if (isNaN(dataObj.getTime())) {
            return res.status(400).json({ message: 'data_selecionada inválida.' });
        }

        // Array para converter o date para o formato do banco
        const meses = [
            'Janeiro', 'Fevereiro', 'Março',
            'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro',
            'Outubro', 'Novembro', 'Dezembro'
        ];

        const dia = dataObj.getDate();
        const mes = meses[dataObj.getMonth()];
        const ano = dataObj.getFullYear();

        let connection;
        try {
            connection = await getConnection();

            // verificar se já existe um agendamento ativo para o mesmo dia e horário (ignora cancelados)
            const [existente] = await connection.execute(
                'SELECT id FROM agendamentos WHERE nutricionista_id = ? AND dia = ? AND mes_ano = ? AND ano = ? AND hora_agendamento = ? AND status != ?',
                [nutricionista_id, dia, mes, ano, horario, 'Cancelado']
            );

            if (existente.length > 0) {
                return res.status(409).json({ message: 'Horário indisponível!' });
            }

            await connection.execute(
                'INSERT INTO agendamentos (paciente_id, nutricionista_id, dia, mes_ano, ano, hora_agendamento, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [paciente_id, nutricionista_id, dia, mes, ano, horario, statusAgendamento]
            );

            res.status(201).json({ message: 'Agendamento realizado com sucesso!' });
        } catch (error) {
            console.error('Erro ao realizar agendamento:', error);
            res.status(500).json({ message: 'Erro ao realizar agendamento.' });
        } finally {
            if (connection) connection.release();
        }
    });

    // rota tempo de atendimento
    routes.post('/api/nutricionista/agenda/tempo-atendimento', async (req, res) => {
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


    return routes;
}