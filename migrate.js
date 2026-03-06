require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DB_URL,
    ssl: { rejectUnauthorized: false }
});

async function runMigrations() {
    const client = await pool.connect();
    
    try {
        // Criar tabela de controle de migrations se não existir
        await client.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Ler arquivos de migration
        const migrationsDir = path.join(__dirname, 'migrations');
        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();

        console.log('🔍 Verificando migrations...\n');

        for (const file of files) {
            // Verificar se já foi executada
            const result = await client.query(
                'SELECT * FROM migrations WHERE name = $1',
                [file]
            );

            if (result.rows.length === 0) {
                console.log(`⚙️  Executando: ${file}`);
                
                // Ler e executar migration
                const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
                await client.query(sql);
                
                // Registrar como executada
                await client.query(
                    'INSERT INTO migrations (name) VALUES ($1)',
                    [file]
                );
                
                console.log(`✅ Concluída: ${file}\n`);
            } else {
                console.log(`⏭️  Já executada: ${file}`);
            }
        }

        console.log('\n✨ Todas as migrations foram processadas!');
        
    } catch (error) {
        console.error('❌ Erro ao executar migrations:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

runMigrations();
