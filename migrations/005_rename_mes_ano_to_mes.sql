-- Migration: 005_rename_mes_ano_to_mes
-- Description: Renomeia coluna mes_ano para mes na tabela agendamentos
-- Date: 2026-03-07

ALTER TABLE agendamentos 
    RENAME COLUMN mes_ano TO mes;
