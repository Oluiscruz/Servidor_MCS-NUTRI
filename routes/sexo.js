const express = require('express');

// Rota para atualizar o telefone do paciente
module.exports = function (getConnection) {
    const router = express.Router();

    router.patch('/api/paciente/sexo', async (req, res) => {
        const { sexo, paciente_id } = req.body || {};

        if (!paciente_id) return res.status(400).json({ message: 'Informe o paciente_id' });
        if (!sexo) return res.status(400).json({ message: 'Adicione um sexo' });

        let connection;
        try {
            connection = await getConnection();
            const result = await connection.query(
                'UPDATE pacientes SET sexo = $1 WHERE id = $2 RETURNING id, sexo',
                [sexo, paciente_id]
            );

            if (!result.rowCount) {
                return res.status(404).json({ message: 'Paciente não encontrado' });
            }

            return res.json({
                message: '✅ Sexo atualizado com sucesso!',
                usuario: {
                    id: result.rows[0].id,
                    sexo: result.rows[0].sexo
                }
            });

        } catch (error) {
            console.error('Erro ao atualizar sexo:', error);
            return res.status(500).json({ message: 'Erro ao atualizar sexo' });
        
        } finally {
            if (connection) connection.release();
        }
    });
return router;
}