-- Migration: 003_fix_meses_ano_encoding
-- Description: Remove acentos do enum meses_ano para compatibilidade
-- Date: 2026-03-10

-- Remover o tipo antigo e criar novo sem acentos
DROP TYPE IF EXISTS meses_ano CASCADE;

CREATE TYPE meses_ano AS ENUM (
    'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
);

-- Recriar colunas que usavam o tipo
ALTER TABLE dias_disponiveis 
    ALTER COLUMN mes TYPE meses_ano USING mes::text::meses_ano;

ALTER TABLE agendamentos 
    ALTER COLUMN mes_ano TYPE meses_ano USING mes_ano::text::meses_ano;
