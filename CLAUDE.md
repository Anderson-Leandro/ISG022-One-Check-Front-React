# CLAUDE.md — OneCheck Front (React + Vite)

Substitui o front PHP em `../front/`, que segue como referência visual e de comportamento até o corte final.
Plano e histórico de progresso: `PLANO_MIGRACAO.md` — ler antes de continuar e atualizar ao concluir etapas.

## Backend
- API Python (FastAPI) já rodando em Docker: `http://localhost:8000` (`VITE_API_URL`).
- **Nunca alterar** `../back/` (backend PHP antigo, descartado) nem o backend Python. Se faltar endpoint, anotar para o time da API.
- Tipos: `npm run gen:api` regenera `src/api/schema.d.ts` a partir de `/openapi.json`. As respostas não são tipadas no OpenAPI; declarar interfaces locais por módulo.
- Envelope: `{sucesso, dados, paginacao?, erro?}`; erros FastAPI em `detail`. Sempre usar `obterDados`/`desembrulhar` de `src/api/client.ts`.

## Convenções
- Nomes em português do Brasil, semânticos (`buscarImoveis`, `listaDeContratos`), sem abreviações.
- TypeScript strict; componentes em PascalCase; um componente de página por arquivo em `src/pages/<modulo>/`.
- Dados do servidor via TanStack Query (`useQuery`/`useMutation`) — nada de `useEffect` + `fetch`.
- Permissões: `src/auth/permissoes.ts` (espelha `front/includes/rbac.php`); rotas guardadas com `<RotaProtegida pagina="…">`.
- Visual: Bootstrap 5 + `src/styles/style.css` (copiado do PHP). Reaproveitar o HTML da página PHP, só trocando a sintaxe.
- Mensagens pós-ação: `useFlash().definirFlash(...)`.

## Comandos
- `npm run dev` (porta 5173, a única liberada no CORS da API)
- `npm run build` (inclui `tsc -b`)
- `npm run lint`
