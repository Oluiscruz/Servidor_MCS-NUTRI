-- Migration: 001_initial_schema
-- Description: Criação inicial do schema do banco de dados
-- Date: 2026-03-05

-- Criação de Tipos ENUM
CREATE TYPE genero_paciente AS ENUM ('M', 'F', 'Outro');

CREATE TYPE meses_ano AS ENUM (
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
);

CREATE TYPE status_agendamento AS ENUM (
    'Pendente', 'Confirmado', 'Cancelado', 'Concluído'
);

-- Tabela de Nutricionistas
CREATE TABLE nutricionistas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(200) NOT NULL UNIQUE,
    crn_numero VARCHAR(20) UNIQUE,
    crn_regiao INT,
    crn_validacao BOOLEAN DEFAULT FALSE,
    crn_documento VARCHAR(255) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    senha VARCHAR(255) NOT NULL,
    tempo_atendimento TIME NOT NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Pacientes
CREATE TABLE pacientes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    data_nascimento DATE,
    sexo genero_paciente,
    email VARCHAR(200) NOT NULL UNIQUE,
    google_id VARCHAR(255) UNIQUE,
    senha VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Dias Disponíveis
CREATE TABLE dias_disponiveis (
    id SERIAL PRIMARY KEY,
    nutricionista_id INT NOT NULL,
    mes meses_ano NOT NULL,
    dia INT NOT NULL CHECK (dia >= 1 AND dia <= 31),
    ano INT NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    disponivel BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_nutricionista FOREIGN KEY (nutricionista_id) REFERENCES nutricionistas (id) ON DELETE CASCADE
);

-- Tabela de Agendamentos
CREATE TABLE agendamentos (
    id SERIAL PRIMARY KEY,
    paciente_id INT,
    nutricionista_id INT,
    mes_ano meses_ano NOT NULL,
    dia INT NOT NULL CHECK (dia >= 1 AND dia <= 31),
    ano INT NOT NULL,
    hora_agendamento TIME NOT NULL,
    status status_agendamento DEFAULT 'Pendente',
    CONSTRAINT fk_paciente FOREIGN KEY (paciente_id) REFERENCES pacientes (id) ON DELETE CASCADE,
    CONSTRAINT fk_nutricionista_agendamento FOREIGN KEY (nutricionista_id) REFERENCES nutricionistas (id) ON DELETE CASCADE
);

-- Tabela de Fichas de Pacientes
CREATE TABLE fichas_pacientes (
    id SERIAL PRIMARY KEY,
    paciente_id INT NOT NULL,
    altura DECIMAL(3, 2) NOT NULL,
    peso DECIMAL(5, 2) NOT NULL,
    imc DECIMAL(4, 2) NOT NULL,
    objetivo TEXT,
    restricoes_alimentares TEXT,
    observacoes_adicionais TEXT,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_paciente_ficha FOREIGN KEY (paciente_id) REFERENCES pacientes (id) ON DELETE CASCADE
);

-- Tabela de Administradores
CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    email VARCHAR(200) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Histórico de Consultas
CREATE TABLE historico_consultas (
    nutricionista_id INT NOT NULL,
    paciente_id INT NOT NULL,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    agendamento_id INT NOT NULL,
    ficha_id INT,
    CONSTRAINT fk_hist_nutri FOREIGN KEY (nutricionista_id) REFERENCES nutricionistas(id) ON DELETE CASCADE,
    CONSTRAINT fk_hist_paciente FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
    CONSTRAINT fk_hist_agendamento FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id) ON DELETE CASCADE,
    CONSTRAINT fk_hist_ficha FOREIGN KEY (ficha_id) REFERENCES fichas_pacientes(id) ON DELETE CASCADE
);

-- Índices para melhor performance
CREATE INDEX idx_nutricionistas_email ON nutricionistas(email);
CREATE INDEX idx_pacientes_email ON pacientes(email);
CREATE INDEX idx_agendamentos_nutricionista ON agendamentos(nutricionista_id);
CREATE INDEX idx_agendamentos_paciente ON agendamentos(paciente_id);
CREATE INDEX idx_dias_disponiveis_nutricionista ON dias_disponiveis(nutricionista_id);
