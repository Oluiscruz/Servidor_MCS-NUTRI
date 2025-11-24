CREATE DATABASE IF NOT EXISTS Clinica;
USE Clinica;

CREATE TABLE
    Medico (
        id_medico int AUTO_INCREMENT PRIMARY KEY,
        crm varchar(20) NOT NULL UNIQUE,
        nome varchar(50) NOT NULL,
        email varchar(255) NOT NULL,
        telefone varchar(20) NOT NULL,
        senha_medico varchar(255) NOT NULL UNIQUE,
        data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE
    Paciente (
        id_paciente int AUTO_INCREMENT PRIMARY KEY,
        cpf varchar(14) NOT NULL UNIQUE,
        nome varchar(120) NOT NULL,
        email varchar(255) NOT NULL,
        telefone varchar(20) NOT NULL,
        sexo ENUM ('M', 'F', 'Outro'),
        senha_paciente varchar(255) NOT NULL UNIQUE,
        data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE
    Consulta (
        id_consulta int AUTO_INCREMENT PRIMARY KEY,
        id_medico int NOT NULL,
        id_paciente int NOT NULL,
        data_consulta DATETIME NOT NULL,
        diagnostico TEXT,
        FOREIGN KEY (id_paciente) REFERENCES Paciente (id_paciente),
        FOREIGN KEY (id_medico) REFERENCES Medico (id_medico)
    );

CREATE TABLE
    Prescricao (
        id_prescricao int AUTO_INCREMENT PRIMARY KEY,
        id_consulta int NOT NULL,
        data_prescricao DATETIME NOT NULL,
        FOREIGN KEY (id_consulta) REFERENCES Consulta (id_consulta)
    );

CREATE TABLE
    Exame (
        id_exame int AUTO_INCREMENT PRIMARY KEY,
        id_medico int NOT NULL,
        id_paciente int NOT NULL,
        especialidade varchar(255) NOT NULL,
        resultado TEXT NOT NULL,
        FOREIGN KEY (id_medico) REFERENCES Medico (id_medico) FOREIGN KEY (id_paciente) REFERENCES Paciente (id_paciente),
    );

CREATE TABLE
    Medicamento (
        id_medicamento INT AUTO_INCREMENT PRIMARY KEY,
        nome varchar(255) NOT NULL,
        descricao varchar(255),
        FOREIGN KEY (id_medico) REFERENCES Medico (id_medico),
        FOREIGN KEY (id_paciente) REFERENCES Paciente (id_paciente)
    );

CREATE TABLE
    item_prescrito_medicamento (
        id_item int AUTO_INCREMENT PRIMARY KEY,
        id_exame int,
        id_medicamento int NOT NULL,
        id_prescricao int NOT NULL,
        FOREIGN KEY (id_exame) REFERENCES Exame (id_exame),
        FOREIGN KEY (id_medicamento) REFERENCES Medicamento (id_medicamento),
        FOREIGN KEY (id_prescricao) REFERENCES Prescricao (id_prescricao)
    );

CREATE TABLE
    item_prescrito_exame (
        id_item int AUTO_INCREMENT PRIMARY KEY,
        id_exame int NOT NULL,
        id_prescricao int NOT NULL,
        observacao TEXT,
        urgencia BOOLEAN,
        FOREIGN KEY (id_exame) REFERENCES Exame (id_exame),
        FOREIGN KEY (id_prescricao) REFERENCES Prescricao (id_prescricao)
    );

