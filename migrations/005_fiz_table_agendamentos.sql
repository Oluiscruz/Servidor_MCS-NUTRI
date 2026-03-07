ALTER TABLE agendamentos 
    RENAME COLUMN mes_ano TO mes;

ALTER TABLE agendamentos 
    ALTER COLUMN mes TYPE meses_ano USING mes::text::meses_ano;

-- Remove o tipo antigo
DROP TYPE meses_ano_old;