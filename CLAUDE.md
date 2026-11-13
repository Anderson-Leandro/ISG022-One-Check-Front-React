# CLAUDE.md — OneCheck Front (React + Vite)

Front da OneCheck (vistorias de imóveis), que consome a OneCheck API. Gestão ágil em `docs/roadmap/` (fonte da
verdade), espelhada nas Issues do GitHub; decisões em `docs/adr/`. Substitui o front PHP em `../front/`, que
segue como referência visual e de comportamento até o corte final (TK-006).

## Modo de execução da sprint
A execução segue a skill global `/sprint-executor` (`~/.claude/skills/sprint-executor/`), com os comandos do bloco
`executor:` de `docs/roadmap/project.yaml` e as regras deste projeto em `docs/roadmap/executor.md`. O modo vem do
argumento e vale só para aquela execução:
- `/sprint-executor [ID]` (padrão, `confirmar cada item`): um item por vez, até o PR aberto com a verificação
  verde. **O merge é do usuário.**
- `/sprint-executor [ID] --continuo` (`contínuo`): item a item sem parar, com o merge feito depois da verificação
  verde, até um ponto de parada.

## Regras permanentes
- **Branch por mudança:** toda mudança numa branch `tipo/ID-descricao` a partir da `dev`, integrada por PR
  (sem aprovação obrigatória de outra pessoa). Nunca commit ou push direto na `dev` ou na `main`.
- **Commit, PR e merge:** só quando o usuário pedir, ou dentro do fluxo do `sprint-executor` (merge só com
  `--continuo`). Não reescrever histórico (sem `rebase` de branch publicada, `push --force` ou `reset` de commits
  publicados).
- **Segredos:** nunca ler, imprimir ou copiar o `.env`. Variáveis `VITE_*` vão para o código publicado: nenhuma
  pode ser segredo.
- **API e produção:** nunca alterar o backend Python (`../API-python/`) nem `../back/` (backend PHP antigo,
  descartado). Se faltar algo na API, vira item no backlog dela, ligado ao daqui pelo ID. Nada roda contra a API
  ou o banco de produção; a API local do usuário (docker compose, porta 8000) não é tocada sem confirmação.
- **Notas locais:** `MUDANCAS_DE_CONTRATO.md`, `PENDENCIAS_API.md`, `PLANO_*.md` e
  `ACHADOS_PENDENTES_DA_REVISAO.md` nunca entram no git. Os planos e os achados são histórico: o que estava
  aberto neles virou item do backlog em 2026-11-13.
- **Verificação:** roda numa cópia do projeto no scratchpad, sem `.env`, com
  `bash scripts/verificar_na_copia.sh <scratchpad>/testes` (build, lint e testes). Teste existente alterado ou
  removido exige relatório (arquivo, antes, depois, motivo, se quebra o comportamento atual) e aprovação do
  usuário antes do commit.
- **Board:** board-sync sempre em dry-run primeiro.
- **Atribuição:** commits e PRs terminam com as linhas de `atribuicao_commit` e `atribuicao_pr` do bloco
  `executor:`.

## Barreiras automáticas
`.claude/hooks/guarda.py` (hook PreToolUse em `.claude/settings.json`) bloqueia: leitura do `.env`, commit ou
push direto na `dev`/`main` e `git add` das notas locais. Um comando que só cita `.env` também é bloqueado:
reescreva sem citar o arquivo. O hook só carrega quando a sessão começa neste diretório.

## Conferência
`python3 scripts/dod_check.py <ID>` confere a Definition of Done de um item (PR mesclado com CI verde, branch
com o ID, testes, registro em `docs/roadmap/execucao/<ID>.md`, relatório de testes alterados aprovado, issue
fechada, acompanhamento da sprint, backlog válido).

## Backend
- API Python (FastAPI) em Docker: `http://localhost:8000` (`VITE_API_URL`). O compose sobe a API em modo de produção: para o front local funcionar, o `.env` da API precisa de `APP_ENV=development` (libera qualquer origem, o `/openapi.json` e as credenciais do seed) ou, no mínimo, `CORS_ORIGINS=http://localhost:5173`.
- Tipos: `src/api/schema.d.ts` é gerado. A fonte é a API local atualizada: `npm run gen:api` (lê `/openapi.json`, que só existe com `APP_ENV=development` ou `DOCS_ENABLED=true`). `npm run gen:api:referencia` é a alternativa quando a API não está no ar: lê `referencia_api/openapi.json`, uma cópia local fora do git que pode estar defasada; conferir a data antes de commitar o resultado.
- O OpenAPI já descreve os corpos, os enums e as respostas (`components['schemas']['…Resposta']`). Os módulos de `src/api/` mantêm interfaces locais para as respostas, porque normalizam campos que a API varia (`role`/`perfil`, `mfa_ativo`/`mfa_enabled`); usar os tipos gerados para corpos e enums, e nas respostas só quando não houver interface local do mesmo recurso.
- Mudanças de contrato da API e o estado de cada uma nos dois lados: `MUDANCAS_DE_CONTRATO.md` (local, o mesmo arquivo da API). Ao concluir o lado do front, marcar a linha com o ID do item. Sem o arquivo, valer-se do OpenAPI e perguntar antes de supor uma regra da API.
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
