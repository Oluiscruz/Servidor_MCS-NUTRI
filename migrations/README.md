# Migrations - NutriMS

## Estrutura

As migrations são arquivos SQL numerados sequencialmente que gerenciam as alterações no banco de dados de forma controlada e versionada.

## Nomenclatura

```
XXX_nome_descritivo.sql
```

- **XXX**: Número sequencial (001, 002, 003...)
- **nome_descritivo**: Descrição clara da alteração

## Migrations Existentes

### 001_initial_schema.sql
- Criação inicial do schema completo
- Tipos ENUM (genero_paciente, meses_ano, status_agendamento)
- Todas as tabelas principais
- Índices para performance

## Como Usar

### 1. Criar Nova Migration

```bash
# Crie um novo arquivo seguindo a numeração sequencial
# Exemplo: 002_add_campo_observacoes.sql
```

### 2. Estrutura do Arquivo

```sql
-- Migration: 002_add_campo_observacoes
-- Description: Adiciona campo de observações na tabela pacientes
-- Date: 2026-03-10

ALTER TABLE pacientes ADD COLUMN observacoes TEXT;
```

### 3. Executar Migration

```bash
# Via psql
psql -U seu_usuario -d nutrims -f migrations/002_add_campo_observacoes.sql

# Via node (se implementar script de migração)
node migrate.js
```

## Boas Práticas

1. **Uma alteração por migration**: Facilita rollback e debugging
2. **Sempre documente**: Adicione comentários explicando o propósito
3. **Teste antes**: Execute em ambiente de desenvolvimento primeiro
4. **Nunca modifique migrations já aplicadas**: Crie uma nova migration para correções
5. **Mantenha backup**: Sempre faça backup antes de aplicar migrations em produção

## Exemplos de Migrations Comuns

### Adicionar Coluna
```sql
ALTER TABLE tabela ADD COLUMN nova_coluna VARCHAR(100);
```

### Remover Coluna
```sql
ALTER TABLE tabela DROP COLUMN coluna_antiga;
```

### Modificar Coluna
```sql
ALTER TABLE tabela ALTER COLUMN coluna TYPE VARCHAR(200);
```

### Adicionar Índice
```sql
CREATE INDEX idx_nome ON tabela(coluna);
```

### Adicionar Constraint
```sql
ALTER TABLE tabela ADD CONSTRAINT fk_nome FOREIGN KEY (coluna) REFERENCES outra_tabela(id);
```

## Rollback

Para reverter uma migration, crie uma nova migration que desfaça as alterações:

```sql
-- Migration: 003_rollback_observacoes
-- Description: Remove campo observacoes adicionado na migration 002
-- Date: 2026-04-16

ALTER TABLE pacientes DROP COLUMN observacoes;
```
