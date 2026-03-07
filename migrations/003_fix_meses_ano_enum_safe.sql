-- Migration: 002_fix_meses_ano_enum_safe
-- Description: Corrige o enum meses_ano removendo caracteres especiais (versão segura)
-- Date: 2026-03-05

-- Primeiro, converte as colunas para TEXT temporariamente
ALTER TABLE dias_disponiveis ALTER COLUMN mes TYPE TEXT;
ALTER TABLE agendamentos ALTER COLUMN mes_ano TYPE TEXT;

-- Atualiza os dados existentes
UPDATE dias_disponiveis SET mes = 'Marco' WHERE mes = 'Março';
UPDATE agendamentos SET mes_ano = 'Marco' WHERE mes_ano = 'Março';

-- Remove o tipo antigo
DROP TYPE meses_ano;

-- Cria o novo tipo
CREATE TYPE meses_ano AS ENUM (
    'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
);

-- Converte as colunas de volta para o enum
ALTER TABLE dias_disponiveis 
    ALTER COLUMN mes TYPE meses_ano USING mes::meses_ano;

ALTER TABLE agendamentos 
    ALTER COLUMN mes_ano TYPE meses_ano USING mes_ano::meses_ano;
