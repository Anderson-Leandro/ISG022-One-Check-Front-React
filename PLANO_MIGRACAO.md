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
- Instalados: leaflet + react-leaflet 5
- A instalar quando chegar a fase: react-chartjs-2, @tanstack/react-table, vitest + testing-library

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

### ⏳ Fase 3 — Módulos CRUD (em andamento — próximo: `vistorias/`)
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
5. [ ] `vistorias/` (= checklists) — index, nova, detalhes, checklist/itens, fotos (`FormData`), comparativo, relatorio/PDF (download em blob)

### ⬜ Fase 4 — Dashboards
- [ ] `dashboard/index, analytics, financeiro, operacional` (`GET /dashboard`) e `logs` (`GET /logs`) com Chart.js

### ⬜ Fase 5 — Área do locatário
- [ ] `locatario/index.php` (aceitar/rejeitar checklist, problemas)

### ⬜ Fase 6 — Corte final
- [ ] Nginx servindo `dist/` com fallback SPA (`try_files $uri /index.html`), substituindo `Dockerfile.web`/`docker-compose.yml`/`render.yaml`
- [ ] Code splitting por rota (`React.lazy`) — bundle passou de 500 kB com o Leaflet
- [ ] Solicitar ao time da API a origem de produção no CORS
- [ ] Aposentar `../front/`

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
- **Segurança:** `GET /usuarios` responde 200 para o perfil locatário, listando todos os usuários (e-mails). Reportar ao time da API
- Vistoriador sem acesso a `GET /contratos/{id}/problemas` (403), embora possa abrir um problema pelo ID — confirmar se é intencional

## Testes automatizados de API (sessão de 2026-10-24)
Script local fora do repositório (não versionado). Credenciais dos usuários de seed passadas só por variável de ambiente, nunca gravadas.
- Login + MFA (TOTP calculado a partir do secret do seed) para admin, vistoriador e locatário: ok
- Escritas como admin, com os mesmos payloads do front: 27/29 ok. As 2 falhas eram os tipos `final`/`periodica` de agendamento, já corrigidos
- Permissões testadas para vistoriador e locatário (ver Pendências com a API)
- Dados de teste que ficaram (a API não tem DELETE): contrato `fce07282…` (cancelado) e problema "TESTE-AUTO Problema", com uma atualização. Usuário, imóvel, cômodo e agendamentos de teste foram removidos

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
| 2026-10-24 | Testes de API com usuários de seed + correções | _(este commit)_ | Tipos de agendamento corrigidos, permissões de problema ajustadas à API, aviso de 403 na lista, autor nas atualizações |
