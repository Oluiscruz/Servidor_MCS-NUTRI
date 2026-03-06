# NutriMS Backend

Sistema de gerenciamento de consultas nutricionais - Backend API

## 📋 Pré-requisitos

- Node.js (v14 ou superior)
- PostgreSQL (v12 ou superior)
- npm ou yarn

## 🚀 Instalação

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Copie o arquivo `exemple.env` para `.env` e preencha as variáveis:

```bash
cp exemple.env .env
```

Edite o arquivo `.env` com suas credenciais:

```env
# URL de conexão do PostgreSQL (Supabase ou local)
DB_URL=postgresql://usuario:senha@host:porta/database

# Chave secreta do Google OAuth
GOOGLE_CLIENT_SECRET=sua_chave_secreta_aqui

# Configurações do Google OAuth
FRONTEND_URL=http://localhost:8080
CALLBACK_URL=http://localhost:3000/api/auth/google/callback
GOOGLE_CLIENT_ID=seu_client_id_aqui

# Configurações de Email (Gmail)
EMAIL_USER=seu_email@gmail.com
EMAIL_PASSWORD=sua_senha_de_app

# Porta do servidor
PORT=3000
```

### 3. Executar migrations

```bash
npm run migrate
```

### 4. Criar usuário admin (opcional)

```bash
node admin/admin.js
```

Copie o hash gerado e execute o SQL no seu banco de dados.

## ▶️ Executar o servidor

```bash
npm start
```

O servidor estará rodando em `http://localhost:3000`

## 📁 Estrutura de Pastas

```
backend/
├── admin/              # Scripts de administração
├── auth/               # Autenticação (Google OAuth)
├── config/             # Configurações (deprecated)
├── crn_documento/      # Upload de documentos CRN
├── db/                 # Schema SQL inicial
├── migrations/         # Migrations do banco de dados
├── routes/             # Rotas da API
├── server/             # Servidor (deprecated)
├── server.js           # Arquivo principal do servidor
├── migrate.js          # Script de migrations
├── package.json        # Dependências
└── .env                # Variáveis de ambiente
```

## 🔧 Scripts disponíveis

- `npm start` - Inicia o servidor
- `npm run migrate` - Executa as migrations do banco de dados

## 📡 Principais Rotas da API

### Autenticação
- `POST /api/nutricionista/login` - Login de nutricionista
- `POST /api/paciente/login` - Login de paciente
- `GET /api/auth/google` - Login com Google
- `POST /api/admin/login` - Login de administrador

### Cadastro
- `POST /api/nutricionista/cadastro` - Cadastro de nutricionista
- `POST /api/paciente/cadastro` - Cadastro de paciente

### Agendamentos
- `POST /api/paciente/agendamento/novo` - Criar agendamento
- `GET /api/nutricionista/pacientes-agendados` - Listar pacientes
- `PATCH /api/nutricionista/agendamento/alterar-status` - Alterar status

### Fichas
- `POST /api/paciente/criar/ficha-paciente` - Criar ficha
- `GET /api/paciente/ficha-paciente/:id` - Buscar ficha
- `PUT /api/paciente/atualizar/ficha-paciente` - Atualizar ficha

## 🗄️ Banco de Dados

O sistema utiliza PostgreSQL com as seguintes tabelas principais:

- `nutricionistas` - Dados dos nutricionistas
- `pacientes` - Dados dos pacientes
- `agendamentos` - Consultas agendadas
- `fichas_pacientes` - Fichas técnicas dos pacientes
- `dias_disponiveis` - Disponibilidade dos nutricionistas
- `historico_consultas` - Histórico de consultas concluídas
- `admins` - Administradores do sistema

## 🔐 Segurança

- Senhas criptografadas com bcrypt
- Sessões com express-session
- Autenticação OAuth2 com Google
- Validação de CRN por administrador

## 📧 Email

O sistema envia emails automáticos para:
- Validação de CRN (aprovação/rejeição)
- Confirmação de consultas
- Cancelamento de consultas

Configure um App Password do Gmail para usar o serviço de email.

## 🐛 Troubleshooting

### Erro de conexão com o banco
- Verifique se o PostgreSQL está rodando
- Confirme as credenciais no arquivo `.env`
- Teste a conexão com `psql` ou outro cliente

### Erro ao fazer upload de documentos
- Verifique se a pasta `crn_documento` existe
- Confirme as permissões de escrita

### Migrations não executam
- Verifique se o banco de dados existe
- Execute manualmente o SQL em `db/nutrims.sql` se necessário

## 📝 Licença

ISC
