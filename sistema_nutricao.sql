CREATE DATABASE IF NOT EXISTS sistema_nutricao;

USE sistema_nutricao;

-- 1. NUTRICIONISTAS
CREATE TABLE
    nutricionistas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        crn VARCHAR(20) NOT NULL UNIQUE,
        email VARCHAR(200) NOT NULL UNIQUE,
        telefone VARCHAR(20) NOT NULL,
        senha VARCHAR(255) NOT NULL,
        tempo_atendimento TIME NOT NULL,
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

-- 2. PACIENTES 
CREATE TABLE
    pacientes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        data_nascimento DATE NOT NULL,
        sexo ENUM ('M', 'F', 'Outro') NOT NULL,
        email VARCHAR(200) NOT NULL UNIQUE,
        senha VARCHAR(255) NOT NULL,
        telefone VARCHAR(20) NOT NULL,
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

-- 3. DIAS DISPONÍVEIS
CREATE TABLE
    dias_disponiveis (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nutricionista_id INT NOT NULL,
        mes ENUM (
            'Janeiro',
            'Fevereiro',
            'Março',
            'Abril',
            'Maio',
            'Junho',
            'Julho',
            'Agosto',
            'Setembro',
            'Outubro',
            'Novembro',
            'Dezembro'
        ) NOT NULL,
        dia INT NOT NULL CHECK (dia >= 1 AND dia <= 31),
        ano INT NOT NULL,
        hora_inicio TIME NOT NULL,
        hora_fim TIME NOT NULL,
        disponivel BOOLEAN DEFAULT TRUE,
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (nutricionista_id) REFERENCES nutricionistas (id) ON DELETE CASCADE
    );

-- 5. AGENDAMENTOS
CREATE TABLE
    agendamentos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        paciente_id INT,
        nutricionista_id INT,
        mes_ano ENUM (
            'Janeiro',
            'Fevereiro',
            'Março',
            'Abril',
            'Maio',
            'Junho',
            'Julho',
            'Agosto',
            'Setembro',
            'Outubro',
            'Novembro',
            'Dezembro'
        ) NOT NULL,
        dia INT NOT NULL CHECK (dia >= 1 AND dia <= 31),
        ano INT NOT NULL,
        hora_agendamento TIME NOT NULL,
        status ENUM (
            'Pendente',
            'Confirmado',
            'Cancelado',
            'Concluído'
        ) DEFAULT 'Pendente',
        FOREIGN KEY (paciente_id) REFERENCES pacientes (id) ON DELETE CASCADE,
        FOREIGN KEY (nutricionista_id) REFERENCES nutricionistas (id) ON DELETE CASCADE
    );

-- 6. FICHA TÉCNICA DO PACIENTE
CREATE TABLE
    fichas_pacientes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        paciente_id INT NOT NULL,
        altura DECIMAL(3, 2) NOT NULL,
        peso DECIMAL(5, 2) NOT NULL,
        imc DECIMAL(4, 2) NOT NULL,
        objetivo TEXT,
        restricoes_alimentares TEXT,
        observacoes_adicionais TEXT,
        data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (paciente_id) REFERENCES pacientes (id) ON DELETE CASCADE
    );