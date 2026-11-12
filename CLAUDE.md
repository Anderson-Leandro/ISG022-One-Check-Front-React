# CLAUDE.md — OneCheck Front (React + Vite)

Substitui o front PHP em `../front/`, que segue como referência visual e de comportamento até o corte final.
Planos e histórico de progresso ficam em arquivos locais, fora do git: `PLANO_MIGRACAO.md` (migração do PHP), `PLANO_ADEQUACAO_API.md` (adequação às mudanças da API de 2026-11) e `ACHADOS_PENDENTES_DA_REVISAO.md` (achados de revisão não corrigidos) e `PENDENCIAS_API.md` (o que falta ou está errado na API, para o time dela). Se existirem, ler antes de continuar e atualizar ao concluir etapas.

## Backend
- API Python (FastAPI) em Docker: `http://localhost:8000` (`VITE_API_URL`). O compose sobe a API em modo de produção: para o front local funcionar, o `.env` da API precisa de `APP_ENV=development` (libera qualquer origem, o `/openapi.json` e as credenciais do seed) ou, no mínimo, `CORS_ORIGINS=http://localhost:5173`.
- **Nunca alterar** `../back/` (backend PHP antigo, descartado) nem o backend Python. Se faltar endpoint, anotar em `PENDENCIAS_API.md` para o time da API.
- Tipos: `src/api/schema.d.ts` é gerado. A fonte é a API local atualizada: `npm run gen:api` (lê `/openapi.json`, que só existe com `APP_ENV=development` ou `DOCS_ENABLED=true`). `npm run gen:api:referencia` é a alternativa quando a API não está no ar: lê `referencia_api/openapi.json`, uma cópia local fora do git que pode estar defasada; conferir a data antes de commitar o resultado.
- O OpenAPI já descreve os corpos, os enums e as respostas (`components['schemas']['…Resposta']`). Os módulos de `src/api/` mantêm interfaces locais para as respostas, porque normalizam campos que a API varia (`role`/`perfil`, `mfa_ativo`/`mfa_enabled`); usar os tipos gerados para corpos e enums, e nas respostas só quando não houver interface local do mesmo recurso.
- Mudanças da API que o front precisa seguir: `referencia_api/MUDANCAS_API_PARA_FRONT.md`, quando a pasta existir (fora do git). Sem ela, valer-se do OpenAPI e perguntar antes de supor uma regra da API.
- Envelope: `{sucesso, dados, paginacao?, erro?}`; todo erro vem como `{sucesso: false, erro, erros?}` com status HTTP de erro (`erros` traz as mensagens por campo no `422`). Sempre usar `obterDados`/`desembrulhar` de `src/api/client.ts`; `ErroApi` expõe `status`, `erros` e `esperarSegundos` (`429`).

## Convenções
- Nomes em português do Brasil, semânticos (`buscarImoveis`, `listaDeContratos`), sem abreviações.
- TypeScript strict; componentes em PascalCase; um componente de página por arquivo em `src/pages/<modulo>/`.
- Dados do servidor via TanStack Query (`useQuery`/`useMutation`) — nada de `useEffect` + `fetch`.
- Permissões: `src/auth/permissoes.ts` (nasceu de `front/includes/rbac.php`, hoje segue as regras da API); rotas guardadas com `<RotaProtegida pagina="…">`. Perfis: `admin`, `gestor`, `vistoriador` e `locatario` (`PERFIS` em `src/auth/tipos.ts`).
- Troca de credencial da própria conta (senha, autenticador, MFA): a resposta traz `dados.sessao`; gravar com `armazenamentoDeTokens.aplicarSessao`, como fazem os hooks de `/usuarios/me` e `/auth/mfa/*` em `src/api/usuarios.ts`. A gestão de outro usuário (`/usuarios/{id}`) não devolve sessão, e a API recusa o próprio ID nessas rotas.
- Senha nova: `CampoDeSenhaNova` + `validarSenhaNova` (`src/utils/senha.ts`); CPF: `src/utils/cpf.ts`.
- Visual: Bootstrap 5 + `src/styles/style.css` (copiado do PHP). Reaproveitar o HTML da página PHP, só trocando a sintaxe.
- Mensagens pós-ação: `useFlash().definirFlash(...)`.

## Comandos
- `npm run dev` (porta 5173; a API só aceita as origens de `CORS_ORIGINS`, ou qualquer uma com `APP_ENV=development`)
- `npm run build` (inclui `tsc -b`)
- `npm run lint`
- `npm test` (roda todo `*.test.*` dentro de `src/`; os testes ficam em `src/__testes__/` e não podem depender da API)
