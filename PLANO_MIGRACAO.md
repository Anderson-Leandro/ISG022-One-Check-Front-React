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
- A instalar quando chegar a fase: react-hook-form + zod, react-chartjs-2, react-leaflet, @tanstack/react-table, vitest + testing-library

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

### ⏳ Fase 3 — Módulos CRUD (em andamento — próximo: `imoveis/`)
1. [x] `usuarios/` — index, novo, editar, perfil (`/usuarios/me`), permissoes
   - `pages/usuarios/{ListaDeUsuarios,NovoUsuario,EditarUsuario,MeuPerfil,Permissoes}.tsx`; hooks em `src/api/usuarios.ts`
   - Perfil usa `GET/PATCH /usuarios/me` (`senha_atual`/`senha_nova`) em vez do `PUT /usuarios/{id}` do PHP
   - `permissoes.php` era vazio no PHP → virou matriz somente leitura das regras de `permissoes.ts`
   - Formulários com `useState` (simples); react-hook-form + zod entra no form grande de imóveis
2. [ ] `imoveis/` — index, novo/editar (`_form_campos.php` → componente compartilhado), detalhes, comodos, historico, mapa (Leaflet)
3. [ ] `contratos/` — index, novo, detalhes, anexos, assinatura, encerrar/cancelar, agendamentos
4. [ ] `problemas/` — index, novo (`/contratos/{id}/problemas`), detalhes, historico/atualizacoes
5. [ ] `vistorias/` (= checklists) — index, nova, detalhes, checklist/itens, fotos (`FormData`), comparativo, relatorio/PDF (download em blob)

### ⬜ Fase 4 — Dashboards
- [ ] `dashboard/index, analytics, financeiro, operacional` (`GET /dashboard`) e `logs` (`GET /logs`) com Chart.js

### ⬜ Fase 5 — Área do locatário
- [ ] `locatario/index.php` (aceitar/rejeitar checklist, problemas)

### ⬜ Fase 6 — Corte final
- [ ] Nginx servindo `dist/` com fallback SPA (`try_files $uri /index.html`), substituindo `Dockerfile.web`/`docker-compose.yml`/`render.yaml`
- [ ] Solicitar ao time da API a origem de produção no CORS
- [ ] Aposentar `../front/`

## Pontos de atenção
- Token no browser (antes ficava no servidor). Evoluir para refresh em cookie httpOnly se a API oferecer.
- RBAC no front é só de interface; a API valida.
- Uploads: `FormData`. Imagens em `/api/v1/uploads/{filename}`; PDFs em `/checklists/{id}/download-pdf` com token.
- `/auth/mfa/activate` aceita só `{codigo}` (o PHP enviava também `secret`, ignorado).

## Pendências com a API
_(nenhuma até agora)_

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
| 2026-10-24 | Fase 3.1 — módulo `usuarios/` | `cc86b35` | Build e lint ok. Pendente: teste manual com admin/gestor contra a API |
