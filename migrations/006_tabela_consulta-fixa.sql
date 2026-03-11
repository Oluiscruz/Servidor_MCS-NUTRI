-- Tabela para horários fixos de atendimento do nutricionista
CREATE TABLE IF NOT EXISTS horario_atendimento (
    id SERIAL PRIMARY KEY,
    nutricionista_id INT NOT NULL,
    dia_semana INT NOT NULL CHECK (dia_semana >= 0 AND dia_semana <= 6), -- 0=Domingo, 6=Sábado
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    intervalo_consulta INT DEFAULT 60, -- minutos
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (nutricionista_id) REFERENCES nutricionistas(id) ON DELETE CASCADE,
    UNIQUE (nutricionista_id, dia_semana)
);

-- Tabela para consultas recorrentes (fixas) com pacientes específicos
CREATE TABLE IF NOT EXISTS consulta_fixa (
    id SERIAL PRIMARY KEY,
    nutricionista_id INT NOT NULL,
    paciente_id INT NOT NULL,
    dia_semana INT NOT NULL CHECK (dia_semana >= 0 AND dia_semana <= 6),
    hora_consulta TIME NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    data_inicio DATE NOT NULL,
    data_fim DATE, -- NULL = sem data fim (recorrente indefinidamente)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (nutricionista_id) REFERENCES nutricionistas(id) ON DELETE CASCADE,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
    UNIQUE (nutricionista_id, paciente_id, dia_semana, hora_consulta)
);

-- Índices para melhorar performance
CREATE INDEX idx_horario_atendimento_nutri ON horario_atendimento(nutricionista_id, ativo);
CREATE INDEX idx_consulta_fixa_nutri ON consulta_fixa(nutricionista_id, ativo);
CREATE INDEX idx_consulta_fixa_dia ON consulta_fixa(dia_semana, hora_consulta);