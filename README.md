# Cronos Insights

Quero transformar o arquivo Excel anexado em uma aplicação web corporativa.

Antes de criar a interface, analise o Excel completamente e interprete sua estrutura, informações, relacionamentos e finalidade de negócio.

O Excel é utilizado para centralizar e analisar cotações de importação marítima (porém o projeto será multi-modal no futuro, então não se apegue a isso), envolvendo informações como ofertas, aprovações, reprovações, clientes, rotas, coloaders/armadores, agentes, vendedores e analistas de pricing.

A aplicação deverá futuramente transformar essa análise em um sistema web de inteligência e acompanhamento de Pricing.

Neste momento, porém, NÃO implemente funcionalidades, regras de negócio, cálculos, CRUDs, dashboards funcionais ou integrações.

Crie somente a base da aplicação, contemplando:

- Estrutura inicial do projeto
- Login (UNICA COISA FUNCIONAL DO SISTEMA QUE DEVE SER IMPLEMENTADA)
- Layout principal autenticado
- Header
- Navegação lateral
- Página inicial/dashboard como estrutura visual
- Componentes visuais básicos necessários para estabelecer o design system
-Estrutura preparada para expansão futura

A página inicial deve ser apenas uma fundamentação visual da futura aplicação, utilizando placeholders/skeletons para os indicadores, gráficos, tabelas e demais áreas que serão implementadas posteriormente.

Não tente reproduzir o Excel visualmente. Use o Excel apenas para compreender o contexto, os conceitos e a estrutura do negócio, criando uma interface web moderna baseada nessa compreensão.

Identidade visual

Utilize exclusivamente esta identidade de cores:

CHERRY
#AC145A
RGB 172, 20, 90

VINHO
#470C1F
RGB 71, 12, 31

CRONOS
#E31C79
RGB 227, 28, 121

BRANCO
#FFFFFF

A interface deve ter aparência:

Corporativa

Premium

Moderna

Minimalista

Clean

Orientada a dados

Inspirada em sistemas modernos de Analytics/BI

Evite aparência de ERP antigo ou de planilha Excel.

Utilize o VINHO como cor estrutural principal, CHERRY como cor secundária e CRONOS para destaques e elementos de ação.

O sistema deve se chamar:

Cronos Pricing Insights

Subtítulo:

Análise de Cotações

Priorize uma excelente estrutura visual e uma arquitetura de interface que possa evoluir posteriormente para um sistema completo de inteligência de Pricing.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ce6a2d23-fba5-4e73-b132-acbb9c1db4cf).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
