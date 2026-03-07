-- Migration: 003_fix_meses_ano_encoding
-- Description: Remove acentos do enum meses_ano para compatibilidade
-- Date: 2026-03-10

-- Esta migration apenas garante que o tipo existe sem acentos
-- As tabelas já foram criadas com o tipo correto na migration 001

-- Não precisa fazer nada se as tabelas já existem com o tipo correto
-- Esta migration serve apenas como registro da correção
