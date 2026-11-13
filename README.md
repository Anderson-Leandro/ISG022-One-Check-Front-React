# OneCheck Front (React)

Interface web do **OneCheck**, sistema de gestão de vistorias imobiliárias e locações. Este projeto consome a
[OneCheck API](https://github.com/Anderson-Leandro/ISG022-One-Check-API-Python) (FastAPI) e mostra a cada perfil
só o que ele pode fazer. Substitui o front antigo em PHP.

## Funcionalidades

- **Login seguro:** e-mail e senha, autenticação em dois fatores (MFA por aplicativo autenticador), troca
  obrigatória de senha fraca e sessão que se renova sozinha e é encerrada em todas as abas ao sair.
- **Usuários e perfis:** cadastro, edição, desativação e exigência de MFA, dentro do que cada perfil pode gerenciar.
- **Imóveis:** cadastro com endereço pelo CEP, localização no mapa, cômodos, histórico e mapa geral da carteira.
- **Contratos:** contratos de locação com a agenda das vistorias de entrada e de encerramento.
- **Vistorias:** checklist por cômodo com fotos, comparativo entre entrada e saída, aceite ou rejeição e laudo em PDF.
- **Problemas:** registro pelo locatário ou pela equipe, com linha do tempo de atualizações.
- **Painéis e auditoria:** indicadores por perfil (geral, operacional, financeiro e analítico) e logs de auditoria.
- **Área do locatário:** contrato, vistorias aguardando aceite, próximas vistorias e problemas do próprio imóvel.

### Perfis de acesso

| Perfil | O que faz no sistema |
|---|---|
| **admin** | Tudo, inclusive usuários de qualquer perfil e os logs de auditoria |
| **gestor** | Imóveis, contratos, vistorias, problemas e os usuários vistoriador e locatário |
| **vistoriador** | Preenche e submete as vistorias designadas a ele |
| **locatário** | Vê o próprio contrato, aceita ou rejeita a vistoria e registra problemas |

O controle de acesso do front é só de apresentação (esconde telas e botões). Quem autoriza de verdade é a API.

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Interface | React 19 + TypeScript (modo estrito) |
| Build e servidor de desenvolvimento | Vite 6 |
| Rotas | React Router 6, com rotas protegidas por perfil |
| Dados do servidor | TanStack Query + `openapi-fetch`, com tipos gerados do OpenAPI da API |
| Visual | Bootstrap 5, React Bootstrap e Bootstrap Icons |
| Mapas e gráficos | Leaflet (OpenStreetMap) e Chart.js |
| Testes | Vitest + Testing Library |

## Como rodar localmente

### Pré-requisitos
- **Node.js 22 ou mais novo** e npm.
- A **OneCheck API** rodando em `http://localhost:8000`. Siga o README da API. Para o front local conseguir
  chamá-la, o arquivo de ambiente da API precisa de `APP_ENV=development` (libera qualquer origem e cria as contas
  de demonstração) ou, no mínimo, `CORS_ORIGINS=http://localhost:5173`.

### Passos
```bash
git clone https://github.com/Anderson-Leandro/ISG022-One-Check-Front-React.git
cd ISG022-One-Check-Front-React
npm ci
cp .env.example .env      # VITE_API_URL=http://localhost:8000
npm run dev
```
O front abre em `http://localhost:5173`.

As contas de demonstração são criadas pelo seed da API em modo de desenvolvimento; as credenciais aparecem com
`python scripts/seed.py`, no projeto da API. Admin, gestor e vistoriador entram com MFA.

### Variáveis de ambiente
| Variável | Para que serve |
|---|---|
| `VITE_API_URL` | Endereço da API, sem barra no fim. Vai para o código publicado: não é segredo |

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento na porta 5173 |
| `npm run build` | Confere os tipos (`tsc -b`) e gera o build em `dist/` |
| `npm run lint` | ESLint |
| `npm test` | Testes automatizados (não dependem da API) |
| `npm run preview` | Serve o build de `dist/` localmente |
| `npm run gen:api` | Regenera `src/api/schema.d.ts` a partir do `/openapi.json` da API local |

## Estrutura

```
src/
├── api/          # cliente da API, tipos gerados e consultas por recurso (imóveis, contratos, vistorias…)
├── auth/         # sessão, tokens, permissões por perfil e rotas protegidas
├── components/   # componentes compartilhados (mensagens, paginação, mapa, gráficos)
├── layouts/      # layout administrativo, do locatário e das telas de login
├── pages/        # uma pasta por módulo: auth, usuarios, imoveis, contratos, vistorias, problemas, dashboard, locatario
├── utils/        # CPF, senha, endereço, formatação
└── __testes__/   # testes automatizados
```

## Publicação

O `render.yaml` descreve o front como site estático no Render: build com `npm ci && npm run build`, publicação da
pasta `dist/` e reescrita de qualquer rota para o `index.html`. Ao criar o serviço pelo Blueprint, informe
`VITE_API_URL` com o endereço público da API e acrescente o endereço do front em `CORS_ORIGINS` na API.

## Projeto

Trabalho da disciplina ISG022. Time: Gabriel Henrique Santana (PO), Anderson Mendes Leandro (Tech Lead),
Ismael Alves de Almeida e Luiz Felipe dos Santos (desenvolvimento).
