# Corrigir timeout em Motivos de Perda

## Objetivo
Eliminar o tempo excedido ao pesquisar Motivos de Perda, inclusive com filtros de ano e mês, sem mudar cálculos, layout ou regras de acesso por modalidade.

## Implementação
- Criar resumos pré-calculados por produto, motivo, ano e mês para indicadores, rotas, clientes, coloaders, agentes, combinações rota × cliente e evolução mensal.
- Reescrever somente o cálculo por período de Motivos de Perda para consultar esses resumos, preservando exatamente o formato de dados esperado pela tela.
- Incluir os novos resumos na rotina já existente de atualização das análises.
- Manter as funções internas sem acesso direto e expor apenas a função autenticada existente, que continua restringindo dados às modalidades permitidas ao usuário.

## Validação
- Medir a consulta com filtros de ano/mês e confirmar que não estoura o limite de tempo.
- Abrir `/motivos-perda`, aplicar filtros e confirmar indicadores, rankings e evolução sem tela em branco.
- Verificar a compilação da aplicação.
