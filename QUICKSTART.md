# 🚀 Guia Rápido - NutriMS Backend

## Passos para rodar o servidor

### 1️⃣ Instalar dependências
```bash
npm install
```

### 2️⃣ Configurar banco de dados

Crie um banco PostgreSQL (local ou use Supabase/Render/Railway)

### 3️⃣ Configurar variáveis de ambiente

Copie o arquivo de exemplo:
```bash
copy exemple.env 
```

Edite o `.env` e preencha:
```env
DB_URL=postgresql://usuario:senha@host:5432/nutrims
GOOGLE_CLIENT_ID=seu_google_client_id
GOOGLE_CLIENT_SECRET=seu_google_client_secret
EMAIL_USER=seu_email@gmail.com
EMAIL_PASSWORD=sua_senha_de_app_gmail
PORT=3000
```

### 4️⃣ Executar migrations

```bash
npm run migrate
```

### 5️⃣ Iniciar o servidor

```bash
npm start
```

✅ Servidor rodando em `http://localhost:3000`

---

## 🔧 Comandos úteis

- `npm start` - Inicia o servidor
- `npm run dev` - Inicia com nodemon (reinicia automaticamente)
- `npm run migrate` - Executa migrations do banco

---

## 📝 Criar usuário Admin

```bash
node admin/admin.js
```

Copie o hash gerado e execute no banco:
```sql
INSERT INTO admins (email, senha) 
VALUES ('admin@nutrims.com', 'HASH_GERADO_AQUI');
```

---

## ⚠️ Problemas comuns

### Erro: "Cannot find module"
```bash
npm install
```

### Erro: "Connection refused"
- Verifique se o PostgreSQL está rodando
- Confirme a URL no `.env`

### Erro: "Port already in use"
- Mude a porta no `.env`
- Ou mate o processo: `npx kill-port 3000`

---

## 📞 Suporte

Verifique o arquivo `README.md` para documentação completa.
