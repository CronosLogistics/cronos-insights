# Corrigir timeout da análise por cliente

## Objetivo
Eliminar a consulta lenta que deixa a tela **Por cliente** em branco, mantendo os mesmos indicadores e o isolamento pelas modalidades permitidas ao usuário.

## Implementação
1. Substituir a leitura pela visão analítica por uma consulta direta e indexável das ofertas do cliente.
2. Aplicar ano, mês e tipo de frete já na consulta do banco, evitando buscar registros para depois descartá-los no servidor.
3. Manter a regra de acesso existente no banco e a média comparativa do produto.
4. Validar o cenário informado, incluindo cliente + FTL, e confirmar que a página não apresenta erro.

## Detalhes técnicos
- Remover paginação com `ORDER BY id` sobre a visão calculada, que impede o banco de aproveitar completamente o índice atual.
- Selecionar apenas as colunas necessárias diretamente de `ofertas`, usando filtros por cliente, período e modalidade antes da transferência.
- Normalizar os campos no servidor para preservar exatamente o formato esperado pela calculadora existente.
