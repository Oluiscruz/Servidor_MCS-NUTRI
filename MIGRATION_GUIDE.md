# Guia de Migração MySQL → PostgreSQL

## Mudanças necessárias no código

### 1. Substituir placeholders nas queries
- MySQL: `?` 
- PostgreSQL: `$1, $2, $3...`

### 2. Obter ID inserido
```javascript
// MySQL
const [result] = await connection.execute('INSERT INTO...', [params]);
const id = result.insertId;

// PostgreSQL
const [result] = await connection.execute('INSERT INTO... RETURNING id', [params]);
const id = result[0].id;
```

### 3. Verificar linhas afetadas
```javascript
// MySQL
result.affectedRows

// PostgreSQL  
result.rowCount
```

### 4. Códigos de erro
```javascript
// MySQL
if (error.code === 'ER_DUP_ENTRY')

// PostgreSQL
if (error.code === '23505') // unique_violation
```

## Próximos passos

1. ✅ Instalar `pg`: `npm install pg`
2. ✅ Atualizar `server.js` com Pool do PostgreSQL
3. ⏳ Executar `nutrims.sql` no Supabase (SQL Editor)
4. ⏳ Atualizar todas as queries em `routes.js` e `auth.js`
5. ⏳ Testar cada endpoint
