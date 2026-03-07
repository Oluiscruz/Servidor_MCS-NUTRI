-- Migration: 004_fix_meses_ano_enum
-- Description: Corrige o enum meses_ano removendo caracteres especiais
-- Date: 2026-03-05

-- Remove o valor antigo e adiciona o novo
ALTER TYPE meses_ano RENAME TO meses_ano_old;

CREATE TYPE meses_ano AS ENUM (
    'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
);

-- Atualiza as tabelas que usam o tipo
ALTER TABLE dias_disponiveis 
    ALTER COLUMN mes TYPE meses_ano USING mes::text::meses_ano;

ALTER TABLE agendamentos 
    RENAME COLUMN mes_ano TO mes;

ALTER TABLE agendamentos 
    ALTER COLUMN mes TYPE meses_ano USING mes::text::meses_ano;

-- Remove o tipo antigo
DROP TYPE meses_ano_old;
