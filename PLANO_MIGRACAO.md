# Plano de Migração — OneCheck Front (PHP → React + Vite)

> Documento vivo. Atualize a seção **Histórico** e os checkboxes ao concluir cada etapa,
> para que o trabalho possa ser retomado de onde parou.

## Contexto
O front antigo (`../front/`) é um cliente fino em PHP: ~45 páginas (≈5.100 linhas) com Bootstrap 5,
Chart.js, Leaflet e DataTables, que chamam a **OneCheck API em Python (FastAPI)** via cURL
(`front/config/api.php` → `ApiClient`), guardando o JWT em `$_SESSION`. Sem regra de negócio nem banco.
Objetivo: substituir por uma SPA **somente web** em React + Vite + TypeScript.

**Restrições:** não alterar `../back/` (backend PHP antigo, descartado) nem o backend Python.
Se faltar endpoint, anotar em "Pendências com a API" abaixo.

### Por que React + Vite
- O front já é "páginas que chamam API REST" — uma SPA faz exatamente isso; HTML/Bootstrap/`style.css` são reaproveitados.
- Next.js: SSR/Server Components sem ganho (sistema atrás de login, sem SEO).
- Flutter: reescrita total da UI em Dart; Flutter Web é fraco para telas de tabelas/formulários.

### O que foi confirmado na API Python
- `http://localhost:8000/openapi.json` (OneCheck API v1.0.0), ~90 endpoints em `/api/v1`.
- CORS libera `http://localhost:5173` com `allow-credentials`.
- Envelope `{sucesso, dados, paginacao?, erro?}`; erros FastAPI em `detail` (string ou `[{msg}]`).
- O OpenAPI tipa só os **request bodies**; respostas vêm como `unknown` → declarar interfaces por módulo.

## Stack
- Vite 6 + React 19 + TypeScript strict
- `openapi-typescript` + `openapi-fetch` (`npm run gen:api` → `src/api/schema.d.ts`)
- React Router 6, TanStack Query 5
- Bootstrap 5.3 + react-bootstrap + bootstrap-icons; `src/styles/style.css` copiado do PHP
- Instalados: leaflet + react-leaflet 5, chart.js 4 + react-chartjs-2 5; dev: vitest 3 + jsdom + Testing Library
- Dispensado até agora: @tanstack/react-table (as tabelas são simples, com paginação/filtros da API)

## Mapeamento PHP → React
| PHP | React |
|---|---|
| `config/api.php` (`ApiClient`) | `src/api/client.ts` (`api`, `obterDados`, `desembrulhar`, `ErroApi`) |
| `$_SESSION[...]`, `includes/auth_api.php` | `src/auth/armazenamentoDeTokens.ts`, `src/auth/AuthContext.tsx` (`useAuth`) |
| `includes/rbac.php` | `src/auth/permissoes.ts` (`podeAcessar`, `podeCriar`, `rotaInicial`, `itensDeMenuPara`) + `RotaProtegida` |
| `includes/header/navbar/sidebar/footer.php` | `src/layouts/LayoutApp.tsx` |
| `locatario/_header.php`/`_footer.php` | `src/layouts/LayoutLocatario.tsx` |
| `flash_set`/`flash_render` | `src/components/Flash.tsx` (`useFlash`) |
| `includes/partials.php`, `functions.php` | `src/components/*` (`CabecalhoDaPagina`, `Paginacao`, `EstadoDaConsulta`, `BadgePerfil`) + `src/utils/formatar.ts` |
| `config/imoveis.php`, `config/permissions.php` | `src/config/*` (a criar) |
| `includes/Geocoder.php`, `Mfa.php`, `ImovelService.php` | endpoints da API quando existirem; senão util TS |
| `config/mock_data.php` | descartar / fixture de teste |

Rotas: `pasta/arquivo.php?id=X` → `/pasta/:id/acao` (todas já declaradas em `src/App.tsx`).
Padrão por página: `src/pages/<modulo>/<Nome>.tsx` + hook `use<Recurso>` (TanStack Query) + `src/api/<modulo>.ts`.
Ao converter uma tela, trocar o `<EmMigracao>` correspondente em `src/App.tsx` pelo componente real.

## Fases e progresso

### ✅ Fase 1 — Base
- [x] Projeto Vite React-TS, dependências, `.env` (`VITE_API_URL=http://localhost:8000`)
- [x] Tipos gerados do OpenAPI
- [x] Cliente da API com Bearer, refresh automático no 401 (uma renovação por vez) e normalização de erros
- [x] Armazenamento de tokens (access/temp MFA em sessionStorage; refresh/usuário em localStorage)
- [x] AuthContext, RBAC, `RotaProtegida`/`RotaPublica`, flash
- [x] `LayoutApp`, `LayoutLocatario`, `LayoutLogin`; CSS do PHP importado
- [x] Todas as rotas declaradas com placeholder `EmMigracao`

### ✅ Fase 2 — Autenticação
- [x] `public/login.php` → `pages/auth/Login.tsx`
- [x] `public/mfa-verify.php` → `pages/auth/VerificarMfa.tsx`
- [x] `public/mfa-setup-login.php` → `pages/auth/ConfigurarMfaNoLogin.tsx`
- [x] `public/mfa-setup.php` → `pages/auth/ConfigurarMfa.tsx`
- [x] `public/logout.php` → `useAuth().sair()` (botão na navbar)

### ✅ Fase 3 — Módulos CRUD
1. [x] `usuarios/` — index, novo, editar, perfil (`/usuarios/me`), permissoes
   - `pages/usuarios/{ListaDeUsuarios,NovoUsuario,EditarUsuario,MeuPerfil,Permissoes}.tsx`; hooks em `src/api/usuarios.ts`
   - Perfil usa `GET/PATCH /usuarios/me` (`senha_atual`/`senha_nova`) em vez do `PUT /usuarios/{id}` do PHP
   - `permissoes.php` era vazio no PHP → virou matriz somente leitura das regras de `permissoes.ts`
   - Formulários com `useState` (simples); react-hook-form + zod entra no form grande de imóveis
2. [x] `imoveis/` — index, novo/editar, detalhes, comodos, historico, mapa
   - `pages/imoveis/*`; hooks em `src/api/imoveis.ts`; opções em `src/config/imoveis.ts`
   - `_form_campos.php` → `FormularioDeImovel.tsx` (CEP via ViaCEP, geolocalização, mapa clicável)
   - Endereço gravado depois do imóvel via `POST /imoveis/{id}/endereco`, como no PHP
   - Mapa: Leaflet + react-leaflet (`src/components/mapa/`); geocodificação Nominatim agora no navegador (1 req/s)
   - `historico.php` era vazio no PHP → lista os contratos do imóvel (`GET /contratos?imovel_id=`)
   - Lista ganhou coluna Título e link para detalhes (o PHP só tinha "Editar"); badges seguem `badge_status`
   - Formulários seguem com `useState`; react-hook-form/zod descartado por ora (não fez falta)
3. [x] `contratos/` — index, novo, detalhes (encerrar/cancelar), agendamentos
   - `pages/contratos/*`; hooks em `src/api/contratos.ts`
   - Lista e detalhes mostram título do imóvel e nome do locatário (o PHP mostrava UUID truncado); cai para o ID se `/usuarios` der 403
   - Detalhes ganhou agendamentos (CRUD), vistorias (`/contratos/{id}/checklists`) e problemas do contrato
   - Novo contrato aceita `?imovel_id=` para vir pré-selecionado
   - `anexos.php` e `assinatura.php` eram vazios e a API não tem endpoints → rotas removidas (ver Pendências)
4. [x] `problemas/` — index, novo, detalhes (status), historico/atualizacoes
   - `pages/problemas/*`; hooks em `src/api/problemas.ts`
   - Lista: como no PHP, busca contratos e os problemas de cada um (agora em paralelo); filtro de status local; coluna Imóvel e link para detalhes
   - Novo problema aceita `?contrato_id=`; após salvar abre os detalhes
   - Detalhes ganhou linha do tempo de atualizações (`/problemas/{id}/atualizacoes`); `historico.php` (vazio no PHP) mostra essa linha do tempo
   - Mudar status / registrar andamento: só admin e gestor (a API devolve 403 para vistoriador e locatário)
   - Vistoriador recebe 403 em `GET /contratos/{id}/problemas` → a lista avisa em vez de mostrar vazio
   - Atualizações mostram o nome do autor (`autor_id` → `/usuarios`)
   - Endpoints de problema não têm corpo no OpenAPI → `corpoNaoTipado()` em `src/api/client.ts`
5. [x] `vistorias/` (= checklists) — index, nova, detalhes, checklist/itens, fotos, comparativo, relatorio
   - `pages/vistorias/*`; hooks e regras em `src/api/vistorias.ts` (`permissoesDaVistoria`, `useNomesDaVistoria`)
   - `detalhes.php` + `checklist.php` (visualização) unificados em `DetalhesDaVistoria`; ações de status + aceite/rejeição (com motivo) + PDF
   - `/vistorias/:id/checklist` virou o **preenchimento pela web** (adicionar/editar itens, enviar/remover fotos); no PHP era só pelo app
   - Fluxo confirmado na API: `em_preenchimento` →submeter (≥1 item)→ `pendente_aceite` →aceitar/rejeitar→ `aceito`/`rejeitado` (finais, sem edição)
   - Permissões confirmadas: itens/submeter = admin/gestor/vistoriador designado; enviar-para-aceite = admin/gestor; aceitar/rejeitar = admin/gestor/locatário
   - Aceitar/rejeitar usam PATCH (o PHP usava POST, que a API não expõe)
   - `comparativo.php` e `relatorio.php` eram vazios no PHP → comparativo item a item entrada × saída (destaca o que piorou) e PDF embutido
   - Upload multipart e PDF (`parseAs: 'blob'`) testados com o próprio openapi-fetch no Node contra a API

### ✅ Fase 4 — Dashboards
- [x] `dashboard/index` → `PainelGeral`; `operacional`, `financeiro` e `analytics` (vazios no PHP) → `PainelOperacional`, `PainelFinanceiro`, `PainelAnalytics`, com abas entre eles
- [x] `dashboard/logs` → `Logs`, com os filtros da API (`acao`, `entidade`, `de`, `ate`) e o nome do usuário
- Dados: `src/api/painel.ts` (`useDadosDoPainel` junta imóveis, contratos, checklists, problemas e agendamentos em paralelo; conta os 403)
- Gráficos: Chart.js 4 + react-chartjs-2 (`src/components/graficos/`). Paleta categórica em ordem fixa, **validada** contra a superfície `#151D2E` (luminosidade, croma, daltonismo ΔE ≥ 8, contraste ≥ 3:1). Legenda HTML com contagens e "Ver tabela" em todo gráfico
- `GET /dashboard` é global (mesmos números para todos os perfis), enquanto as listas vêm filtradas → os cartões são calculados das listas; só "vistorias agendadas" vem do `/dashboard`
- Financeiro = receita **contratada** (`valor_mensal` dos contratos ativos); a API não tem pagamentos
- Testes: unitários em `src/__testes__/regras.test.ts` (`npm test`, sem API); telas renderizadas em jsdom com dados reais por um teste fora do repositório

### ✅ Fase 5 — Área do locatário
- [x] `locatario/index.php` → `pages/locatario/AreaDoLocatario.tsx` (dados em `src/api/locatario.ts`)
  - Por contrato ativo: imóvel e endereço, vigência e aluguel, vistorias aguardando aceite (aceitar / rejeitar com motivo), histórico de vistorias, problemas + "Registrar"
  - Agendamentos ficam de fora: a API devolve 403 para o locatário
- [x] `LayoutConformePerfil`: o locatário abre vistorias, problemas e perfil **dentro do layout dele**, com abas Início/Vistorias/Problemas/Meu perfil. No PHP esses links levavam ao layout administrativo
- [x] Placeholder `EmMigracao` removido: **todas as telas do PHP estão migradas**
- Testado em jsdom com dados reais: aceite e rejeição feitos pela tela e confirmados na API (com `motivo_rejeicao`); layout correto nas rotas; admin segue com o layout administrativo

### 🔶 Fase 6 — Corte final (parcial: deploy adiado pelo usuário)
- [x] Code splitting por rota: `carregarSobDemanda` (React.lazy) em `src/App.tsx`, `SuspenseDaPagina` em volta do `Outlet` dos layouts (navbar/menu ficam visíveis) e `manualChunks` no `vite.config.ts` (react, consultas, bootstrap, mapa, graficos). JS inicial: 810 kB → ~350 kB (248 → ~111 kB gzip); Leaflet e Chart.js só baixam no mapa/painéis. Login e MFA ficam no bundle inicial
- [x] Proteção na reconfiguração de MFA (ver Pendências com a API): com MFA ativo, `/mfa/configurar` pede confirmação antes de chamar `GET /auth/mfa/setup`. Teste unitário com fetch simulado em `src/__testes__/ConfigurarMfa.test.tsx`
- [ ] **Adiado (decisão de deploy pendente):** Nginx servindo `dist/` com fallback SPA (`try_files $uri /index.html`), substituindo `Dockerfile.web`/`docker-compose.yml`/`render.yaml`
- [ ] **Adiado (depende do domínio de produção):** solicitar ao time da API a origem de produção no CORS
- [ ] **Adiado (depois do deploy):** aposentar `../front/`. Não apagar antes: é o front publicado hoje e tem alterações não commitadas no git dele

## Pontos de atenção
- Token no browser (antes ficava no servidor). Evoluir para refresh em cookie httpOnly se a API oferecer.
- RBAC no front é só de interface; a API valida.
- Uploads: `FormData`. Imagens em `/api/v1/uploads/{filename}`; PDFs em `/checklists/{id}/download-pdf` com token.
- `/auth/mfa/activate` aceita só `{codigo}` (o PHP enviava também `secret`, ignorado).

## Pendências com a API
- Anexos e assinatura de contrato: telas previstas no PHP (`contratos/anexos.php`, `assinatura.php`, ambas vazias), sem endpoint na API
- Histórico do imóvel: sem endpoint; a tela usa a lista de contratos do imóvel
- Corpo de `POST /problemas/{id}/atualizacoes` não documentado no OpenAPI; `{descricao}` **confirmado** em teste
- Corpos de `POST /contratos/{id}/problemas` e `PATCH /problemas/{id}/status` também não documentados (seguem o que o PHP enviava)
- Tipos de agendamento: a API só aceita `inicial` e `encerramento` (confirmado; `mock_data.php` estava errado)
- `POST /contratos/{id}/checklists` com `vistoriador_id` inexistente devolve **500** em vez de 422
- `enviar-para-aceite` em `em_preenchimento` faz o mesmo que `submeter` (sem exigir item); o status `pendente_revisao` não apareceu em nenhum fluxo — confirmar quando ele é usado
- Checklists não têm DELETE (dados de teste ficam)
- `GET /dashboard` não considera o perfil: o vistoriador vê "2 imóveis locados", mas só 1 imóvel na lista
- **Segurança:** `GET /usuarios` responde 200 para o perfil locatário, listando todos os usuários (e-mails). Reportar ao time da API
- **Segurança/MFA:** `GET /auth/mfa/setup` troca o segredo TOTP de quem **já tem MFA ativo** na hora, antes do `activate`. Só abrir a tela de reconfiguração e desistir deixa o autenticador atual inválido. Confirmado em 2026-10-24: o admin de seed perdeu o MFA quando um teste abriu `/mfa/configurar`. O front agora pede confirmação, mas a API deveria guardar o segredo novo como pendente e só trocar no `activate`. MFA do admin recuperado pelo usuário em 2026-10-25, com o mesmo secret do seed
- Locatário recebe 403 em `GET /contratos/{id}/agendamentos` do próprio contrato (a área do locatário não mostra agendamentos)
- Vistoriador sem acesso a `GET /contratos/{id}/problemas` (403), embora possa abrir um problema pelo ID — confirmar se é intencional

## Testes automatizados de API (sessão de 2026-10-24)
Script local fora do repositório (não versionado). Credenciais dos usuários de seed passadas só por variável de ambiente, nunca gravadas.
- Login + MFA (TOTP calculado a partir do secret do seed) para admin, vistoriador e locatário: ok
- Escritas como admin, com os mesmos payloads do front: 27/29 ok. As 2 falhas eram os tipos `final`/`periodica` de agendamento, já corrigidos
- Permissões testadas para vistoriador e locatário (ver Pendências com a API)
- Dados de teste que ficaram (a API não tem DELETE): contratos `fce07282…`, `105c33bb…` e `cd90cb98…` (cancelados), problema "TESTE-AUTO Problema", 4 checklists do contrato `105c33bb…` e 2 do `cd90cb98…` (aceito/rejeitado). Usuários, imóveis, cômodos, agendamentos e fotos de teste foram removidos
- Vistorias: fluxo completo testado com admin, vistoriador e locatário (criar, itens, foto, submeter, aceitar, rejeitar, PDF)

Testes de tela contra a API real: `testes-de-api/` na raiz do projeto, **fora do git** (`.gitignore`) por decisão do usuário. Rodar com `npx vitest run --config testes-de-api/vitest.config.mjs`, passando as credenciais do seed só por variáveis de ambiente (`OC_<PERFIL>_EMAIL/SENHA`, `OC_MFA_SECRET`; instruções no topo do `vitest.config.mjs`). O `npm test` roda só `src/` (unitários) e o lint ignora a pasta.

## Verificação (a cada fase)
- API: `curl http://localhost:8000/api/v1/health`; front: `npm run dev` (porta 5173)
- Navegar com cada perfil (admin, gestor, vistoriador, visualizador, locatario): menus e bloqueios de rota
- Comparar lado a lado com a tela PHP equivalente (`../front`, porta 8080)
- `npm run gen:api && npm run build && npm run lint`

## Histórico
| Data | Etapa | Commit | Observações |
|---|---|---|---|
| 2026-10-24 | Plano definido (React + Vite, só web) | — | Backend PHP descartado; API Python em Docker |
| 2026-10-24 | Fases 1 e 2 concluídas | `bf07170` | Build e lint ok (3 warnings de fast-refresh). Login testado manualmente pelo usuário: ok |
| 2026-10-24 | Fase 3.1 — módulo `usuarios/` | `cc86b35` | Build e lint ok. Testado manualmente pelo usuário: ok |
| 2026-10-24 | Fase 3.2 — módulo `imoveis/` | `a019646` | Build e lint ok. Testado manualmente pelo usuário: ok |
| 2026-10-24 | Fase 3.3 — módulo `contratos/` | `b7af71f` | Build e lint ok. Testado manualmente pelo usuário: ok |
| 2026-10-24 | Fase 3.4 — módulo `problemas/` | `d5ae3cc` | Build e lint ok |
| 2026-10-24 | Testes de API com usuários de seed + correções | `740b7ea` | Tipos de agendamento corrigidos, permissões de problema ajustadas à API, aviso de 403 na lista, autor nas atualizações |
| 2026-10-24 | Fase 3.5 — módulo `vistorias/` (Fase 3 concluída) | `b0714b5` | Build e lint ok; fluxo e permissões testados contra a API com os usuários de seed |
| 2026-10-24 | Fase 4 — dashboards e logs | `7907789` | Build, lint e 12 testes unitários ok; 9 telas renderizadas com dados reais (admin, vistoriador, locatário) |
| 2026-10-24 | Fase 5 — área do locatário (todas as telas migradas) | `8f42256` | Build, lint e testes ok; aceite/rejeição testados pela tela contra a API |
| 2026-10-24 | Fase 6 (parcial) — code splitting + proteção de MFA | `860acf8` | Build, lint e 14 testes unitários ok; 18 rotas sob demanda renderizadas com dados reais. Deploy, CORS e aposentar `front/` adiados |
| 2026-10-25 | Testes da Fase 6 com o admin recuperado | — | 32 testes de tela contra a API, todos ok: 18 rotas sob demanda (admin, vistoriador, locatário, com o layout certo), detalhes de vistoria/imóvel/contrato/problema abertos a partir das listas, 4 painéis + logs, bloqueios de rota. Só leitura |
