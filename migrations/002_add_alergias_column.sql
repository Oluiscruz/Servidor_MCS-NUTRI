-- Migration: 002_add_alergias_column
-- Description: Adiciona coluna alergias na tabela fichas_pacientes
-- Date: 2026-03-10

ALTER TABLE fichas_pacientes
ADD COLUMN IF NOT EXISTS alergias TEXT;
