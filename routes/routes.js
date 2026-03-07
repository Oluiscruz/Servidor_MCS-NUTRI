// Arquivo com todas as rotas da API
require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const nodemailer = require('nodemailer');
const routes = express.Router();

// Mudando de Mysql para Postgresql.

// Configurar transporter de email
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

const uploadsDir = path.resolve(__dirname, '..', 'crn_documento');
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

    // Rota de Health Check que testa conexão com o banco de dados
    routes.get('/health', async (req, res) => {
        let connection;
        try {
            connection = await getConnection();
            const result = await connection.query('SELECT NOW()');
            res.json({ ok: true, now: result.rows[0] });
        } catch (error) {
            console.error('❌ Health check error:', error);
            res.status(500).json({ ok: false, error: error.message });
        } finally {
            if (connection) connection.release();
        }
    });

    // ===== ROTA DE CADASTRO DE NUTRICIONISTAS ======
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
        const tempoFormatado = `00:${String(tempoAtendimento).padStart(2, '0')}:00`;

        let connection;
        try {
            connection = await getConnection();

            // Criptografar a senha
            const saltRounds = 10;
            const senhaHashed = await bcrypt.hash(senha, saltRounds);

            // Inserir o nutri no banco de dados
            const result = await connection.query(
                `INSERT INTO 
                nutricionistas (
                nome, telefone, crn_numero, crn_regiao, crn_documento, email, senha, tempo_atendimento
                ) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
                [nome, telefone, crn_numero, crn_regiao, crn_documento, email, senhaHashed, tempoFormatado]
            );

            res.status(201).json({
                message: '✅ Nutri cadastrado com sucesso!',
                id: result.rows[0].id,
                nome,
                email,
                telefone,
                crn_regiao,
                crn_numero,
            });

        } catch (error) {
            if (error.code === '23505') { return res.status(409).json({ message: '🔍 CRN ou email já cadastrado.' }); }
            console.error('❌ Erro ao cadastrar nutri:', error);
            res.status(500).json({ message: 'Erro interno do servidor.' });
        } finally { if (connection) connection.release(); }
    });

    // ===== ROTA DE CADASTRO DE PACIENTES =====
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
            const result = await connection.query(
                `INSERT INTO pacientes (
                nome, telefone, sexo, email, senha, data_nascimento
            ) 
                VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                [nome, telefone, sexo, email, senhaHashed, data_nascimento]
            );

            res.status(201).json({
                message: 'Paciente cadastrado com sucesso!',
                id: result.rows[0].id,
                nome,
                email,
                data_nascimento,
                telefone,
                sexo
            });

        } catch (error) {
            if (error.code === '23505') {
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
            const result = await connection.query(
                `SELECT id, nome, email, senha, crn_numero, crn_regiao, crn_documento, crn_validacao, telefone FROM nutricionistas WHERE email = $1`,
                [email]
            );
            const rows = result.rows;

            if (rows.length === 0) return res.status(401).json({ message: '❌ Email ou senha inválidos.' });

            const nutri = rows[0];
            const match = await bcrypt.compare(senha, nutri.senha);

            if (!match) {
                return res.status(401).json({ message: '❌ Email ou senha inválidos.' });
            }

            // Verificar se o CRN foi validado
            if (!nutri.crn_validacao) {
                return res.status(403).json({ message: '⏳ Seu cadastro está pendente de validação do CRN.' });
            }

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
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Erro interno do servidor.' });
        }

        finally { if (connection) connection.release(); }
    });

    // Rota de login/cadastro de paciente via Google Auth
    routes.post('/api/paciente/google-auth', async (req, res) => {
        const { email, nome, telefone } = req.body;

        if (!email || !nome) {
            return res.status(400).json({ message: 'Email e nome são obrigatórios.' });
        }

        let connection;
        try {
            connection = await getConnection();

            // Verificar se o paciente já existe
            const result = await connection.query(
                'SELECT id, nome, telefone, email FROM pacientes WHERE email = $1',
                [email]
            );
            const rows = result.rows;

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
            const insertResult = await connection.query(
                `INSERT INTO pacientes (
                nome, email, telefone, senha, sexo, data_nascimento
                ) 
                VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                [nome, email, telefone || null, 'google_auth', 'Não informado', '2000-01-01']
            );

            res.status(201).json({
                message: '✅ Cadastro realizado com sucesso!',
                usuario: {
                    id: insertResult.rows[0].id,
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
            const result = await connection.query(
                'SELECT id, nome, telefone, email, senha FROM pacientes WHERE email = $1',
                [email]
            );
            const rows = result.rows;

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
            const result = await connection.query(
                'SELECT id, nome, crn_regiao || \'-\' || crn_numero as crn, telefone FROM nutricionistas ORDER BY nome'
            );
            const nutricionistas = result.rows;
            res.json({ nutricionistas });
        } catch (error) {
            console.error('Erro ao listar nutricionistas:', error);
            res.status(500).json({ message: 'Erro ao buscar nutricionistas.' });
        } finally {
            if (connection) connection.release();
        }
    });

    // Rota de salvar datas disponíveis do nutricionista

    routes.post('/api/nutricionista/agenda/salvar-data', async (req, res) => {
        const { nutricionista_id, mes, dia, ano, hora_inicio, hora_fim } = req.body;

        if (!nutricionista_id || !mes || !dia || !ano || !hora_inicio || !hora_fim) {
            return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
        }

        let connection;
        try {
            connection = await getConnection();

            // Verificar se já existe
            const checkResult = await connection.query(
                'SELECT id FROM dias_disponiveis WHERE nutricionista_id = $1 AND mes = $2 AND dia = $3 AND ano = $4 AND hora_inicio = $5 AND hora_fim = $6',
                [nutricionista_id, mes, dia, ano, hora_inicio, hora_fim]
            );
            const existente = checkResult.rows;

            if (existente.length > 0) {
                return res.status(409).json({ message: 'Data já cadastrada' });
            }

            const insertResult = await connection.query(
                `INSERT INTO dias_disponiveis (nutricionista_id, mes, dia, ano, hora_inicio, hora_fim) 
                VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                [nutricionista_id, mes, dia, ano, hora_inicio, hora_fim]
            );

            res.status(201).json({ message: 'Data salva com sucesso!', id: insertResult.rows[0].id });
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
        WHERE d.nutricionista_id = $1
        ORDER BY d.ano, d.mes, d.dia, d.hora_inicio
        `;

            const result = await connection.query(query, [nutricionista_id]);
            const dias = result.rows;
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
            const result = await connection.query(
                'SELECT dia, mes, ano, hora_agendamento FROM agendamentos WHERE nutricionista_id = $1 AND status != $2',
                [nutricionista_id, 'Cancelado']
            );
            const ocupados = result.rows;

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
            'Janeiro', 'Fevereiro', 'Marco',
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
            const checkResult = await connection.query(
                `SELECT 
                id FROM agendamentos 
                WHERE nutricionista_id = $1 AND dia = $2 AND mes = $3 AND ano = $4 AND hora_agendamento = $5 AND status != $6`,
                [nutricionista_id, dia, mes, ano, horario, 'Cancelado']
            );
            const existente = checkResult.rows;

            if (existente.length > 0) {
                return res.status(409).json({ message: 'Horário indisponível!' });
            }

            await connection.query(
                `INSERT INTO agendamentos (paciente_id, nutricionista_id, dia, mes, ano, hora_agendamento, status) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
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
            await connection.query(
                'UPDATE nutricionistas SET tempo_atendimento = $1 WHERE id = $2',
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

    // Login Admin
    routes.post('/api/admin/login', async (req, res) => {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({ message: 'Email e senha são obrigatórios' });
        }

        let connection;
        try {
            connection = await getConnection();
            const result = await connection.query(
                'SELECT id, email, senha FROM admins WHERE email = $1',
                [email]
            );
            const rows = result.rows;

            if (rows.length === 0) {
                return res.status(401).json({ message: '❌ Credenciais inválidas.' });
            }

            const admin = rows[0];
            const match = await bcrypt.compare(senha, admin.senha);

            if (match) {
                res.json({
                    message: '✅ Login admin realizado!',
                    admin: { id: admin.id, email: admin.email, tipo: 'admin' }
                });
            } else {
                res.status(401).json({ message: '❌ Credenciais inválidas.' });
            }
        } catch (error) {
            console.error('Erro no login admin:', error);
            res.status(500).json({ message: 'Erro interno do servidor.' });
        } finally {
            if (connection) connection.release();
        }
    });

    // Aprovar/Rejeitar validação de CRN (admin)
    routes.post('/api/nutricionista/validar-crn', async (req, res) => {
        const { nutricionista_id, aprovado } = req.body;

        if (!nutricionista_id || aprovado === undefined) {
            return res.status(400).json({ message: 'nutricionista_id e aprovado são obrigatórios' });
        }

        let connection;
        try {
            connection = await getConnection();
            await connection.query(
                'UPDATE nutricionistas SET crn_validacao = $1 WHERE id = $2',
                [aprovado, nutricionista_id]
            );
            res.json({ message: aprovado ? 'CRN aprovado com sucesso!' : 'CRN rejeitado.' });
        } catch (error) {
            console.error('Erro ao validar CRN:', error);
            res.status(500).json({ message: 'Erro interno do servidor.' });
        } finally {
            if (connection) connection.release();
        }
    });

    // Verificar status de validação do CRN
    routes.get('/api/nutricionista/status-validacao/:id', async (req, res) => {
        const { id } = req.params;

        let connection;
        try {
            connection = await getConnection();
            // Incluir o email na resposta para que o frontend possa enviar notificações
            const result = await connection.query(
                'SELECT crn_validacao, nome, crn_numero, crn_regiao, email FROM nutricionistas WHERE id = $1',
                [id]
            );
            const rows = result.rows;

            if (rows.length === 0) {
                return res.status(404).json({ message: 'Nutricionista não encontrado' });
            }

            res.json({ validado: rows[0].crn_validacao, nutricionista: rows[0] });
        } catch (error) {
            console.error('Erro ao verificar status:', error);
            res.status(500).json({ message: 'Erro interno do servidor.' });
        } finally {
            if (connection) connection.release();
        }
    });

    // Listar nutricionistas pendentes de validação
    routes.get('/api/nutricionista/pendentes-validacao', async (req, res) => {
        let connection;
        try {
            connection = await getConnection();
            const result = await connection.query(
                'SELECT id, nome, crn_numero, crn_regiao, crn_documento, email, telefone, data_criacao FROM nutricionistas WHERE crn_validacao = FALSE ORDER BY data_criacao DESC'
            );
            const rows = result.rows;
            res.json({ nutricionistas: rows });
        } catch (error) {
            console.error('Erro ao listar pendentes:', error);
            res.status(500).json({ message: 'Erro interno do servidor.' });
        } finally {
            if (connection) connection.release();
        }
    });

    // Enviar email de validação do crn
    routes.post('/api/nutricionista/enviar-email-validacao', async (req, res) => {
        console.log('📧 Iniciando envio de email...');
        console.log('Body recebido:', JSON.stringify(req.body, null, 2));

        const { sucesso, nutricionista, nutricionista_id } = req.body;

        let dadosNutricionista = nutricionista;

        // Se não veio o objeto nutricionista, buscar no banco pelo ID
        if (!dadosNutricionista && nutricionista_id) {
            console.log('🔍 Buscando dados do nutricionista no banco...');
            let connection;
            try {
                connection = await getConnection();
                const result = await connection.query(
                    'SELECT nome, email, crn_numero, crn_regiao FROM nutricionistas WHERE id = $1',
                    [nutricionista_id]
                );
                const rows = result.rows;
                if (rows.length > 0) {
                    dadosNutricionista = rows[0];
                    console.log('✅ Dados encontrados:', dadosNutricionista);
                }
            } catch (error) {
                console.error('❌ Erro ao buscar nutricionista:', error);
            } finally {
                if (connection) connection.release();
            }
        }

        console.log('Sucesso:', sucesso);
        console.log('Nutricionista:', dadosNutricionista);
        console.log('Email do nutricionista:', dadosNutricionista?.email);

        if (!dadosNutricionista || !dadosNutricionista.email) {
            console.log('❌ Validação falhou: dados incompletos');
            return res.status(400).json({ message: 'Dados do nutricionista incompletos' });
        }

        try {
            let mailOptions;

            if (sucesso) {
                console.log('✅ Preparando email de aprovação...');
                mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: dadosNutricionista.email,
                    subject: 'Cadastro Realizado com Sucesso - NutriMS',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <h2 style="color: #4caf50;">✓ Cadastro Aprovado!</h2>
                            <p>Olá, <strong>${dadosNutricionista.nome}</strong>!</p>
                            <p>Seu cadastro foi realizado com sucesso na plataforma NutriMS.</p>
                            <p><strong>Dados do cadastro:</strong></p>
                            <ul>
                                <li>Nome: ${dadosNutricionista.nome}</li>
                                <li>CRN: ${dadosNutricionista.crn_regiao}-${dadosNutricionista.crn_numero}</li>
                                <li>Email: ${dadosNutricionista.email}</li>
                            </ul>
                            <p>Você já pode acessar a plataforma e começar a utilizar nossos serviços.</p>
                            <p style="margin-top: 30px; color: #666; font-size: 14px;">
                                Atenciosamente,<br>
                                Equipe NutriMS
                            </p>
                        </div>
                    `
                };
            } else {
                console.log('❌ Preparando email de rejeição...');
                mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: dadosNutricionista.email,
                    subject: 'Problema na Validação do CRN - NutriMS',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <h2 style="color: #f44336;">✗ CRN Inválido</h2>
                            <p>Olá,</p>
                            <p>Infelizmente não foi possível validar seu número de CRN.</p>
                            <p><strong>Possíveis motivos:</strong></p>
                            <ul>
                                <li>CRN não encontrado no sistema do CFN</li>
                                <li>CRN inativo ou suspenso</li>
                                <li>Número digitado incorretamente</li>
                            </ul>
                            <p>Por favor, verifique seus dados e tente novamente.</p>
                            <p>Se o problema persistir, entre em contato com nosso suporte.</p>
                            <p style="margin-top: 30px; color: #666; font-size: 14px;">
                                Atenciosamente,<br>
                                Equipe NutriMS
                            </p>
                        </div>
                    `
                };
            }

            console.log('📨 Configurações do email:');
            console.log('From:', mailOptions.from);
            console.log('To:', mailOptions.to);
            console.log('Subject:', mailOptions.subject);

            console.log('🚀 Enviando email...');
            await transporter.sendMail(mailOptions);
            console.log('✅ Email enviado com sucesso!');
            res.json({ message: 'Email enviado com sucesso' });
        } catch (error) {
            console.error('❌ Erro ao enviar email:', error);
            console.error('Detalhes do erro:', error.message);
            console.error('Stack:', error.stack);
            res.status(500).json({ message: 'Erro ao enviar email' });
        }
    });

    // Rota para o nutricionista visualizar seus pacientes/agendamentos (excluindo concluídos)
    routes.get('/api/nutricionista/pacientes-agendados', async (req, res) => {
        const { nutricionista_id } = req.query;

        if (!nutricionista_id) {
            return res.status(400).json({ message: 'nutricionista_id é obrigatório' });
        }

        let connection;
        try {
            connection = await getConnection();

            const result = await connection.query(
                `SELECT 
                    a.id AS agendamento_id,
                    a.mes,
                    a.dia,
                    a.ano,
                    a.hora_agendamento,
                    a.status,
                    p.id AS paciente_id,
                    p.nome AS paciente_nome,
                    p.email AS paciente_email,
                    p.telefone AS paciente_telefone
                FROM agendamentos a
                INNER JOIN pacientes p ON a.paciente_id = p.id
                WHERE a.nutricionista_id = $1 AND LOWER(a.status::text) != 'concluido'
                ORDER BY a.ano DESC, a.dia DESC, a.hora_agendamento DESC`,
                [nutricionista_id]
            );

            const rows = result.rows;
            res.json({ agendamentos: rows });

        } catch (error) {
            console.error('Erro ao buscar pacientes agendados:', error);
            res.status(500).json({ message: 'Erro interno do servidor.' });
        } finally {
            if (connection) connection.release();
        }
    });

    // Rota para o nutri alterar status do agendamento (ex: cancelar)
    routes.patch('/api/nutricionista/agendamento/alterar-status', async (req, res) => {
        console.log('🔄 Requisição recebida para alterar status');
        console.log('Body:', req.body);

        const { agendamento_id, status } = req.body;

        if (!agendamento_id || !status) {
            console.log('❌ Campos faltando:', { agendamento_id, status });
            return res.status(400).json({ message: 'agendamento_id e status são obrigatórios' });
        }

        let connection;
        try {
            connection = await getConnection();
            console.log('💾 Executando UPDATE:', { status, agendamento_id });

            const updateResult = await connection.query(
                `UPDATE agendamentos SET status = $1 WHERE id = $2`,
                [status, agendamento_id]
            );

            console.log('✅ UPDATE executado. Linhas afetadas:', updateResult.rowCount);
            console.log('📊 Status recebido:', status);

            // Se o status foi alterado para 'Concluído', salvar no histórico de agendamentos
            if (updateResult.rowCount > 0 && status.toLowerCase() === 'concluido') {
                console.log('✅ ENTRANDO no bloco de histórico');
                try {
                    // Buscar dados do agendamento atualizado
                    const agResult = await connection.query(
                        'SELECT paciente_id, nutricionista_id FROM agendamentos WHERE id = $1',
                        [agendamento_id]
                    );
                    const agRows = agResult.rows;

                    if (agRows.length > 0) {
                        const pacienteId = agRows[0].paciente_id;
                        const nutricionistaId = agRows[0].nutricionista_id;

                        // Buscar a ficha mais recente do paciente (se houver)
                        const fichaResult = await connection.query(
                            'SELECT id FROM fichas_pacientes WHERE paciente_id = $1 ORDER BY data_atualizacao DESC LIMIT 1',
                            [pacienteId]
                        );
                        const fichaRows = fichaResult.rows;
                        const fichaId = fichaRows.length > 0 ? fichaRows[0].id : null;

                        // Evitar inserção duplicada de histórico para o mesmo agendamento
                        const existResult = await connection.query(
                            'SELECT agendamento_id FROM historico_consultas WHERE agendamento_id = $1',
                            [agendamento_id]
                        );
                        const existing = existResult.rows;

                        console.log('🔍 Verificando duplicata. Existing length:', existing.length);
                        if (existing.length === 0) {
                            console.log('💾 Inserindo histórico com dados:', { nutricionistaId, pacienteId, agendamento_id, fichaId });
                            await connection.query(
                                `INSERT INTO historico_consultas (
                                nutricionista_id, paciente_id, agendamento_id, ficha_id
                                ) 
                                VALUES ($1, $2, $3, $4)`,
                                [nutricionistaId, pacienteId, agendamento_id, fichaId]
                            );
                            console.log('✅ Histórico de agendamento inserido:', { agendamento_id, pacienteId, nutricionistaId, fichaId });
                        } else {
                            console.log('ℹ  Histórico já existente para agendamento:', agendamento_id);
                        }
                    }
                } catch (histError) {
                    console.error('❌ Erro ao inserir histórico de agendamento automaticamente:', histError);
                }
            }

            res.json({ message: 'Status do agendamento atualizado com sucesso', rowCount: updateResult.rowCount });
        } catch (error) {
            console.error('❌ Erro ao alterar status do agendamento:', error);
            res.status(500).json({ message: 'Erro interno do servidor.' });
        } finally { if (connection) connection.release(); }
    });

    // Rota para apagar um agendamento (para casos onde o nutri queira remover completamente, não apenas cancelar)
    routes.delete('/api/nutricionista/agendamento/:agendamento_id', async (req, res) => {
        const { agendamento_id } = req.params;

        let connection;
        try {
            connection = await getConnection();
            const deleteResult = await connection.query(
                `DELETE FROM agendamentos WHERE id = $1`,
                [agendamento_id]
            );

            console.log('✅ Agendamento apagado com sucesso. Linhas afetadas:', deleteResult.rowCount);
            res.json({ message: 'Agendamento apagado com sucesso!', rowCount: deleteResult.rowCount });

        } catch (error) {
            console.error('❌ Erro ao apagar agendamento:', error);
            res.status(500).json({ message: 'Erro interno do servidor.' });
        } finally {
            if (connection) connection.release();
        }
    });


    // Rota para criar a ficha do paciente
    routes.post('/api/paciente/criar/ficha-paciente', async (req, res) => {
        console.log('📋 Dados recebidos:', req.body);
        const { paciente_id, altura, peso, alergias, restricoes_alimentares, objetivos } = req.body;

        if (!paciente_id || !altura || !peso || !objetivos) {
            return res.status(400).json({ message: 'paciente_id, altura, peso e objetivos são obrigatórios' });
        }

        const alturaNumerico = parseFloat(altura);
        const pesoNumerico = parseFloat(peso);
        const imc = parseFloat((pesoNumerico / (alturaNumerico * alturaNumerico)).toFixed(2));
        console.log(`📊 Altura: ${alturaNumerico}m, Peso: ${pesoNumerico}kg, IMC: ${imc}`);

        let connection;
        try {
            connection = await getConnection();

            const insertResult = await connection.query(
                `INSERT INTO fichas_pacientes (paciente_id, altura, peso, imc, alergias, restricoes_alimentares, objetivo) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
                [paciente_id, alturaNumerico, pesoNumerico, imc, alergias || null, restricoes_alimentares || null, objetivos]
            );
            res.json({ message: 'Ficha do paciente criada com sucesso!', ficha_id: insertResult.rows[0].id });
        } catch (error) {
            console.error('❌ Erro ao criar ficha do paciente:', error);
            console.error('Detalhes:', error.message);
            res.status(500).json({ message: 'Erro interno do servidor.' });
        } finally {
            if (connection) connection.release();
        }
    });

    // Rota para buscar a ficha do paciente
    routes.get('/api/paciente/ficha-paciente/:paciente_id', async (req, res) => {
        const { paciente_id } = req.params;

        let connection;
        try {
            connection = await getConnection();
            const result = await connection.query(
                `SELECT * FROM fichas_pacientes WHERE paciente_id = $1`,
                [paciente_id]
            );
            const rows = result.rows;

            if (rows.length === 0) {
                return res.status(404).json({ message: 'Ficha não encontrada' });
            }

            res.json(rows[0]);
        } catch (error) {
            console.error('❌ Erro ao buscar ficha do paciente:', error);
            res.status(500).json({ message: 'Erro interno do servidor.' });
        } finally {
            if (connection) connection.release();
        }
    });

    // Rota para atualizar a ficha do paciente
    routes.put('/api/paciente/atualizar/ficha-paciente', async (req, res) => {
        console.log('📋 Dados recebidos para atualizar ficha:', req.body);
        const { paciente_id, altura, peso, alergias, restricoes_alimentares, objetivos } = req.body;

        if (!paciente_id || !altura || !peso || !objetivos) {
            return res.status(400).json({ message: 'paciente_id, altura, peso e objetivos são obrigatórios' });
        }

        const alturaNumerico = parseFloat(altura);
        const pesoNumerico = parseFloat(peso);
        const imc = parseFloat((pesoNumerico / (alturaNumerico * alturaNumerico)).toFixed(2));
        console.log(`📊 Altura: ${alturaNumerico}m, Peso: ${pesoNumerico}kg, IMC: ${imc}`);

        let connection;
        try {
            connection = await getConnection();

            const updateResult = await connection.query(
                `UPDATE fichas_pacientes SET altura = $1, peso = $2, imc = $3, alergias = $4, restricoes_alimentares = $5, objetivo = $6 WHERE paciente_id = $7`,
                [alturaNumerico, pesoNumerico, imc, alergias || null, restricoes_alimentares || null, objetivos, paciente_id]
            );
            res.json({ message: 'Ficha do paciente atualizada com sucesso!', rowCount: updateResult.rowCount });

        } catch (error) {
            console.error('❌ Erro ao atualizar ficha do paciente:', error);
            console.error('Detalhes:', error.message);
            res.status(500).json({ message: 'Erro interno do servidor.' });

        } finally {
            if (connection) connection.release();
        }
    });

    // Rota para o nutricionista buscar a ficha do paciente
    routes.get('/api/nutricionista/ficha/:paciente_id', async (req, res) => {
        const { paciente_id } = req.params;

        let connection;
        try {
            connection = await getConnection();
            const result = await connection.query(
                `SELECT 
                    f.*,
                    p.nome AS paciente_nome,
                    p.email AS paciente_email,
                    p.telefone AS paciente_telefone,
                    p.data_nascimento AS paciente_data_nascimento
                FROM fichas_pacientes f
                INNER JOIN pacientes p ON f.paciente_id = p.id
                WHERE f.paciente_id = $1`,
                [paciente_id]
            );
            const rows = result.rows;

            if (rows.length === 0) {
                return res.status(404).json({ message: 'Ficha não encontrada' });
            }

            res.json(rows[0]);
        } catch (error) {
            console.error('❌ Erro ao buscar ficha do paciente:', error);
            res.status(500).json({ message: 'Erro interno do servidor.' });
        } finally {
            if (connection) connection.release();
        }
    });

    // Rota para notificar o paciente (agendamento confirmado ou cancelado)
    routes.post('/api/nutricionista/notificar-paciente', async (req, res) => {
        const { agendamento_id, status } = req.body;

        if (!agendamento_id || !status) {
            return res.status(400).json({ message: 'agendamento_id e status são obrigatórios' });
        }

        let connection;
        try {
            connection = await getConnection();
            const result = await connection.query(
                `SELECT 
                    a.dia, a.mes, a.ano, a.hora_agendamento,
                    p.nome AS paciente_nome, p.email AS paciente_email,
                    n.nome AS nutricionista_nome
                FROM agendamentos a
                INNER JOIN pacientes p ON a.paciente_id = p.id
                INNER JOIN nutricionistas n ON a.nutricionista_id = n.id
                WHERE a.id = $1`,
                [agendamento_id]
            );
            const rows = result.rows;

            if (rows.length === 0) {
                return res.status(404).json({ message: 'Agendamento não encontrado' });
            }

            const { paciente_nome, paciente_email, nutricionista_nome, dia, mes, ano, hora_agendamento } = rows[0];
            const dataConsulta = `${dia} de ${mes} de ${ano} às ${hora_agendamento}`;

            let mailOptions;
            if (status === 'Confirmado') {
                mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: paciente_email,
                    subject: 'Consulta Confirmada - NutriMS',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <h2 style="color: #4caf50;">✓ Consulta Confirmada!</h2>
                            <p>Olá, <strong>${paciente_nome}</strong>!</p>
                            <p>Sua consulta com <strong>${nutricionista_nome}</strong> foi confirmada.</p>
                            <p><strong>Data e horário:</strong> ${dataConsulta}</p>
                            <p>Nos vemos em breve!</p>
                            <p style="margin-top: 30px; color: #666; font-size: 14px;">
                                Atenciosamente,<br>
                                Equipe NutriMS
                            </p>
                        </div>
                    `
                };
            } else if (status === 'Cancelado') {
                mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: paciente_email,
                    subject: 'Consulta Cancelada - NutriMS',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <h2 style="color: #f44336;">✗ Consulta Cancelada</h2>
                            <p>Olá, <strong>${paciente_nome}</strong>!</p>
                            <p>Por motivos de agenda, sua consulta com <strong>${nutricionista_nome}</strong> foi cancelada.</p>
                            <p><strong>Data e horário:</strong> ${dataConsulta}</p>
                            <p>Por favor, agende um novo horário quando possível.</p>
                            <p style="margin-top: 30px; color: #666; font-size: 14px;">
                                Atenciosamente,<br>
                                Equipe NutriMS
                            </p>
                        </div>
                    `
                };
            } else {
                return res.status(400).json({ message: 'Status inválido' });
            }

            await transporter.sendMail(mailOptions);
            res.json({ message: 'Email enviado com sucesso' });
        } catch (error) {
            console.error('❌ Erro ao enviar email:', error);
            res.status(500).json({ message: 'Erro ao enviar email' });
        } finally {
            if (connection) connection.release();
        }
    });

    // rota para visualizar historico de consultas do nutri (apenas concluídos)
    routes.get('/api/nutricionista/historico-consultas', async (req, res) => {
        const { nutricionista_id } = req.query;

        console.log('📋 Buscando histórico para nutricionista_id:', nutricionista_id);

        if (!nutricionista_id) {
            return res.status(400).json(
                { message: 'nutricionista_id é obrigatório', agendamentos: [] }
            );
        }

        let connection;
        try {
            connection = await getConnection();
            
            // Primeiro, verificar todos os agendamentos desse nutricionista
            const allResult = await connection.query(
                `SELECT id, status, status::text as status_text FROM agendamentos WHERE nutricionista_id = $1`,
                [nutricionista_id]
            );
            console.log('📊 Todos os agendamentos:', allResult.rows);
            
            const result = await connection.query(
                `SELECT 
                    a.id AS agendamento_id,
                    a.mes,
                    a.dia,
                    a.ano,
                    a.hora_agendamento,
                    a.status,
                    p.id AS paciente_id,
                    p.nome AS paciente_nome,
                    p.email AS paciente_email,
                    p.telefone AS paciente_telefone
                FROM agendamentos a
                LEFT JOIN pacientes p ON a.paciente_id = p.id
                WHERE a.nutricionista_id = $1 AND a.status::text ILIKE 'conclu%'
                ORDER BY a.ano DESC, a.dia DESC, a.hora_agendamento DESC`,
                [nutricionista_id]
            );
            const rows = result.rows;
            console.log('✅ Histórico de consultas (concluídos):', rows);
            res.json({ agendamentos: rows });

        } catch (error) {
            console.error('❌ Erro ao buscar histórico de consultas:', error);
            res.status(500).json({ message: 'Erro ao buscar histórico de consultas' });
        } finally {
            if (connection) connection.release();
        }
    });


    return routes;
}