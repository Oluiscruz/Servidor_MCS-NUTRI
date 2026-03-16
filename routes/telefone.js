const express = require('express');

// Rota para atualizar o telefone do paciente
module.exports = function (getConnection) {
    const router = express.Router();

    router.patch('/api/paciente/telefone', async (req, res) => {
        const { telefone, paciente_id } = req.body || {};

        if (!paciente_id) return res.status(400).json({ message: 'Informe o paciente_id' });
        if (!telefone) return res.status(400).json({ message: 'Adicione um telefone' });

        let connection;
        try {
            connection = await getConnection();
            const result = await connection.query(
                'UPDATE pacientes SET telefone = $1 WHERE id = $2 RETURNING id, telefone',
                [telefone, paciente_id]
            );

            if (!result.rowCount) {
                return res.status(404).json({ message: 'Paciente não encontrado' });
            }

            return res.json({
                message: '✅ Telefone atualizado com sucesso!',
                usuario: {
                    id: result.rows[0].id,
                    telefone: result.rows[0].telefone
                }
            });

        } catch (error) {
            console.error('Erro ao atualizar telefone:', error);
            return res.status(500).json({ message: 'Erro ao atualizar telefone' });
        
        } finally {
            if (connection) connection.release();
        }
    });

    return router;
};

