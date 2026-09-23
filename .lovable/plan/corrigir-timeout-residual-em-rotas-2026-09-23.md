# Corrigir timeout residual em Rotas

## Objetivo
Eliminar o caminho de consulta que ainda ultrapassa o tempo limite e impedir a tela em branco, mantendo os mesmos filtros, cálculos e restrições por modalidade.

## Etapas
1. Reproduzir a falha com os filtros enviados pela tela e medir separadamente a análise padrão e os recortes por ano/mês.
2. Ajustar os resumos e a função de análise no banco para evitar varreduras e agrupamentos de alta cardinalidade durante cada pesquisa.
3. Preservar o filtro obrigatório das modalidades do usuário e o formato atual dos indicadores, rankings e combinações.
4. Validar a tela de Rotas sem período e com combinações de ano, mês, origem, destino e rota; confirmar ausência de timeout e tela em branco.

## Detalhes técnicos
- A correção será aditiva, por nova migração, sem mover ou reescrever migrações já aplicadas.
- As consultas continuarão protegidas no backend e não aceitarão Produto pelo navegador.
- A rotina de atualização das análises incluirá qualquer novo resumo criado.
