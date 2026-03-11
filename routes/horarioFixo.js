// Rotas para gerenciar horários fixos de atendimento
const express = require('express');

module.exports = function (getConnection) {
    const router = express.Router();

    // Criar/Atualizar horários fixos do nutricionista
    router.post('/salvar', async (req, res) => {
        const { nutricionista_id, horarios } = req.body;

        if (!nutricionista_id || !horarios || !Array.isArray(horarios)) {
            return res.status(400).json({ message: 'nutricionista_id e horarios são obrigatórios' });
        }

        let connection;
        try {
            connection = await getConnection();
            await connection.query('BEGIN');

            // Desativar todos os horários existentes
            await connection.query(
                'UPDATE horario_atendimento SET ativo = FALSE WHERE nutricionista_id = $1',
                [nutricionista_id]
            );

            // Inserir ou reativar horários
            for (const horario of horarios) {
                const { dia_semana, hora_inicio, hora_fim, intervalo_consulta } = horario;

                const checkResult = await connection.query(
                    'SELECT id FROM horario_atendimento WHERE nutricionista_id = $1 AND dia_semana = $2',
                    [nutricionista_id, dia_semana]
                );

                if (checkResult.rows.length > 0) {
                    await connection.query(
                        `UPDATE horario_atendimento 
                        SET hora_inicio = $1, hora_fim = $2, intervalo_consulta = $3, ativo = TRUE, updated_at = CURRENT_TIMESTAMP 
                        WHERE nutricionista_id = $4 AND dia_semana = $5`,
                        [hora_inicio, hora_fim, intervalo_consulta || 60, nutricionista_id, dia_semana]
                    );
                } else {
                    await connection.query(
                        `INSERT INTO horario_atendimento (nutricionista_id, dia_semana, hora_inicio, hora_fim, intervalo_consulta, ativo) 
                        VALUES ($1, $2, $3, $4, $5, TRUE)`,
                        [nutricionista_id, dia_semana, hora_inicio, hora_fim, intervalo_consulta || 60]
                    );
                }
            }

            await connection.query('COMMIT');
            res.json({ message: 'Horários salvos com sucesso!' });
        } catch (error) {
            if (connection) await connection.query('ROLLBACK');
            console.error('Erro ao salvar horários:', error);
            res.status(500).json({ message: 'Erro ao salvar horários' });
        } finally {
            if (connection) connection.release();
        }
    });

    // Buscar horários fixos do nutricionista
    router.get('/listar', async (req, res) => {
        const { nutricionista_id } = req.query;

        if (!nutricionista_id) {
            return res.status(400).json({ message: 'nutricionista_id é obrigatório' });
        }

        let connection;
        try {
            connection = await getConnection();
            const result = await connection.query(
                `SELECT * FROM horario_atendimento 
                WHERE nutricionista_id = $1 AND ativo = TRUE 
                ORDER BY dia_semana, hora_inicio`,
                [nutricionista_id]
            );
            res.json({ horarios: result.rows });
        } catch (error) {
            console.error('Erro ao buscar horários:', error);
            res.status(500).json({ message: 'Erro ao buscar horários' });
        } finally {
            if (connection) connection.release();
        }
    });

    // Gerar slots disponíveis baseados nos horários fixos
    router.get('/slots-disponiveis', async (req, res) => {
        const { nutricionista_id, data_inicio, data_fim } = req.query;

        if (!nutricionista_id || !data_inicio || !data_fim) {
            return res.status(400).json({ message: 'Parâmetros obrigatórios: nutricionista_id, data_inicio, data_fim' });
        }

        let connection;
        try {
            connection = await getConnection();

            // Buscar horários fixos
            const horariosResult = await connection.query(
                `SELECT * FROM horario_atendimento 
                WHERE nutricionista_id = $1 AND ativo = TRUE`,
                [nutricionista_id]
            );
            const horarios = horariosResult.rows;

            if (horarios.length === 0) {
                return res.json({ slots: [] });
            }

            // Buscar agendamentos já ocupados
            const agendamentosResult = await connection.query(
                `SELECT dia, mes, ano, hora_agendamento 
                FROM agendamentos 
                WHERE nutricionista_id = $1 AND status != 'Cancelado'`,
                [nutricionista_id]
            );
            const ocupados = agendamentosResult.rows;

            // Gerar slots
            const slots = gerarSlots(horarios, ocupados, data_inicio, data_fim);
            res.json({ slots });
        } catch (error) {
            console.error('Erro ao gerar slots:', error);
            res.status(500).json({ message: 'Erro ao gerar slots' });
        } finally {
            if (connection) connection.release();
        }
    });

    return router;
};

// Função auxiliar para gerar slots
function gerarSlots(horarios, ocupados, dataInicio, dataFim) {
    const slots = [];
    const meses = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    let dataAtual = new Date(dataInicio);
    const dataFinal = new Date(dataFim);

    while (dataAtual <= dataFinal) {
        const diaSemana = dataAtual.getDay();
        const horarioDia = horarios.find(h => h.dia_semana === diaSemana);

        if (horarioDia) {
            const [horaIni, minIni] = horarioDia.hora_inicio.split(':');
            const [horaFim, minFim] = horarioDia.hora_fim.split(':');
            
            let horaAtual = parseInt(horaIni);
            const minutoAtual = parseInt(minIni);
            const horaFinal = parseInt(horaFim);
            const intervalo = horarioDia.intervalo_consulta;

            while (horaAtual < horaFinal) {
                const horarioFormatado = `${String(horaAtual).padStart(2, '0')}:${String(minutoAtual).padStart(2, '0')}`;
                
                // Verificar se está ocupado
                const dia = dataAtual.getDate();
                const mes = meses[dataAtual.getMonth()];
                const ano = dataAtual.getFullYear();
                
                const ocupado = ocupados.some(o => 
                    o.dia === dia && o.mes === mes && o.ano === ano && o.hora_agendamento === horarioFormatado
                );

                if (!ocupado) {
                    slots.push({
                        data: dataAtual.toISOString().split('T')[0],
                        dia,
                        mes,
                        ano,
                        hora: horarioFormatado,
                        diaSemana
                    });
                }

                horaAtual += Math.floor(intervalo / 60);
            }
        }

        dataAtual.setDate(dataAtual.getDate() + 1);
    }

    return slots;
}
