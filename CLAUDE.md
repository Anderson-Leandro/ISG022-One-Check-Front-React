# CLAUDE.md — OneCheck Front (React + Vite)

Substitui o front PHP em `../front/`, que segue como referência visual e de comportamento até o corte final.
Planos e histórico de progresso ficam em arquivos locais, fora do git: `PLANO_MIGRACAO.md` (migração do PHP), `PLANO_ADEQUACAO_API.md` (adequação às mudanças da API de 2026-11) e `ACHADOS_PENDENTES_DA_REVISAO.md` (achados de revisão não corrigidos). Se existirem, ler antes de continuar e atualizar ao concluir etapas.

## Backend
- API Python (FastAPI) já rodando em Docker: `http://localhost:8000` (`VITE_API_URL`).
- **Nunca alterar** `../back/` (backend PHP antigo, descartado) nem o backend Python. Se faltar endpoint, anotar para o time da API.
- Tipos: `npm run gen:api` regenera `src/api/schema.d.ts` a partir de `/openapi.json` da API local (só existe com `APP_ENV=development` ou `DOCS_ENABLED=true`); `npm run gen:api:referencia` faz o mesmo a partir de `referencia_api/openapi.json`, quando a pasta existir (fica fora do git). O OpenAPI já descreve as respostas (`components['schemas']['…Resposta']`) e os enums: preferir esses tipos nas interfaces novas.
- Mudanças da API que o front precisa seguir: `referencia_api/MUDANCAS_API_PARA_FRONT.md` (fora do git).
- Envelope: `{sucesso, dados, paginacao?, erro?}`; todo erro vem como `{sucesso: false, erro, erros?}` com status HTTP de erro (`erros` traz as mensagens por campo no `422`). Sempre usar `obterDados`/`desembrulhar` de `src/api/client.ts`; `ErroApi` expõe `status`, `erros` e `esperarSegundos` (`429`).

## Convenções
- Nomes em português do Brasil, semânticos (`buscarImoveis`, `listaDeContratos`), sem abreviações.
- TypeScript strict; componentes em PascalCase; um componente de página por arquivo em `src/pages/<modulo>/`.
- Dados do servidor via TanStack Query (`useQuery`/`useMutation`) — nada de `useEffect` + `fetch`.
- Permissões: `src/auth/permissoes.ts` (nasceu de `front/includes/rbac.php`, hoje segue as regras da API); rotas guardadas com `<RotaProtegida pagina="…">`. Perfis: `admin`, `gestor`, `vistoriador` e `locatario` (`PERFIS` em `src/auth/tipos.ts`).
- Troca de credencial (senha, autenticador, MFA): a resposta traz `dados.sessao`; gravar com `armazenamentoDeTokens.aplicarSessao` (os hooks de `src/api/usuarios.ts` já fazem).
- Senha nova: `CampoDeSenhaNova` + `validarSenhaNova` (`src/utils/senha.ts`); CPF: `src/utils/cpf.ts`.
- Visual: Bootstrap 5 + `src/styles/style.css` (copiado do PHP). Reaproveitar o HTML da página PHP, só trocando a sintaxe.
- Mensagens pós-ação: `useFlash().definirFlash(...)`.

## Comandos
- `npm run dev` (porta 5173; a API só aceita as origens de `CORS_ORIGINS`, ou qualquer uma com `APP_ENV=development`)
- `npm run build` (inclui `tsc -b`)
- `npm run lint`
- `npm test` (unitários em `src/__testes__/`, sem API)
