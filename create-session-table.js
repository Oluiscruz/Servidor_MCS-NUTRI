require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DB_URL,
    ssl: { rejectUnauthorized: false }
});

async function createSessionTable() {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS "session" (
                "sid" varchar NOT NULL COLLATE "default",
                "sess" json NOT NULL,
                "expire" timestamp(6) NOT NULL,
                CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
            ) WITH (OIDS=FALSE);
        `);
        
        await client.query(`
            CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
        `);
        
        console.log('✅ Tabela de sessões criada com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao criar tabela de sessões:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

createSessionTable();
