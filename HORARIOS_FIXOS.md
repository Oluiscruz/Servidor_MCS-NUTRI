# Sistema de Horários Fixos de Atendimento

## Visão Geral

Este sistema permite que nutricionistas configurem horários fixos de atendimento por dia da semana. Por exemplo:
- Todo sábado das 17h às 20h
- Todo domingo das 09h às 12h

## Estrutura do Banco de Dados

### Tabela: `horario_atendimento`
Armazena os horários fixos configurados pelo nutricionista.

**Campos:**
- `id`: Identificador único
- `nutricionista_id`: ID do nutricionista
- `dia_semana`: Dia da semana (0=Domingo, 6=Sábado)
- `hora_inicio`: Hora de início do atendimento
- `hora_fim`: Hora de término do atendimento
- `intervalo_consulta`: Intervalo entre consultas em minutos (padrão: 60)
- `ativo`: Se o horário está ativo

### Tabela: `consulta_fixa`
Armazena consultas recorrentes com pacientes específicos.

**Campos:**
- `id`: Identificador único
- `nutricionista_id`: ID do nutricionista
- `paciente_id`: ID do paciente
- `dia_semana`: Dia da semana da consulta recorrente
- `hora_consulta`: Horário da consulta
- `data_inicio`: Data de início da recorrência
- `data_fim`: Data de término (NULL = indefinido)
- `ativo`: Se a consulta recorrente está ativa

## API Endpoints

### 1. Salvar Horários Fixos
```
POST /api/nutricionista/horario-fixo/salvar
```

**Body:**
```json
{
  "nutricionista_id": 1,
  "horarios": [
    {
      "dia_semana": 6,
      "hora_inicio": "17:00",
      "hora_fim": "20:00",
      "intervalo_consulta": 60
    },
    {
      "dia_semana": 0,
      "hora_inicio": "09:00",
      "hora_fim": "12:00",
      "intervalo_consulta": 60
    }
  ]
}
```

### 2. Listar Horários Fixos
```
GET /api/nutricionista/horario-fixo/listar?nutricionista_id=1
```

**Resposta:**
```json
{
  "horarios": [
    {
      "id": 1,
      "nutricionista_id": 1,
      "dia_semana": 6,
      "hora_inicio": "17:00",
      "hora_fim": "20:00",
      "intervalo_consulta": 60,
      "ativo": true
    }
  ]
}
```

### 3. Gerar Slots Disponíveis
```
GET /api/nutricionista/horario-fixo/slots-disponiveis?nutricionista_id=1&data_inicio=2024-01-01&data_fim=2024-01-31
```

**Resposta:**
```json
{
  "slots": [
    {
      "data": "2024-01-06",
      "dia": 6,
      "mes": "Janeiro",
      "ano": 2024,
      "hora": "17:00",
      "diaSemana": 6
    },
    {
      "data": "2024-01-06",
      "dia": 6,
      "mes": "Janeiro",
      "ano": 2024,
      "hora": "18:00",
      "diaSemana": 6
    }
  ]
}
```

## Componentes Frontend

### 1. HorarioFixo.jsx
Componente para o nutricionista configurar seus horários fixos.

**Uso:**
```jsx
import HorarioFixo from './pages/perfil-nutri/HorarioFixo';

// Na rota do nutricionista
<Route path="/perfil-nutri/horarios" element={<HorarioFixo />} />
```

### 2. useSlotsDisponiveis Hook
Hook customizado para buscar slots disponíveis.

**Uso:**
```jsx
import { useSlotsDisponiveis } from './hooks/useSlotsDisponiveis';

function AgendarConsulta() {
  const { slots, loading, error } = useSlotsDisponiveis(
    nutricionistaId,
    '2024-01-01',
    '2024-01-31'
  );

  return (
    <div>
      {loading && <p>Carregando...</p>}
      {error && <p>Erro: {error}</p>}
      {slots.map(slot => (
        <button key={`${slot.data}-${slot.hora}`}>
          {slot.dia}/{slot.mes} às {slot.hora}
        </button>
      ))}
    </div>
  );
}
```

## Fluxo de Uso

### Para o Nutricionista:
1. Acessa a página de configuração de horários
2. Adiciona os dias e horários que atende
3. Define o intervalo entre consultas
4. Salva as configurações

### Para o Paciente:
1. Seleciona o nutricionista
2. Escolhe um período (mês)
3. Sistema gera automaticamente os slots disponíveis baseados nos horários fixos
4. Paciente escolhe um horário disponível
5. Agenda a consulta

## Vantagens

✅ Nutricionista configura uma vez e vale para todas as semanas
✅ Sistema gera automaticamente os horários disponíveis
✅ Evita agendamentos fora do horário de atendimento
✅ Fácil ativar/desativar dias específicos
✅ Flexível para diferentes intervalos de consulta
✅ Filtra automaticamente horários já ocupados

## Migração

Execute a migration:
```bash
node migrate.js
```

Isso criará as tabelas `horario_atendimento` e `consulta_fixa`.
