# Regras do sprint-executor neste projeto

> **Por que isso importa:** o `/sprint-executor` é uma skill global, usada em vários projetos. Este arquivo guarda
> o que só vale aqui. A skill lê este arquivo junto com o bloco `executor:` do `project.yaml` e com o `CLAUDE.md`.

## Verificação
- Build, lint e testes rodam numa cópia do projeto sem o arquivo de segredos, com
  `bash scripts/verificar_na_copia.sh <scratchpad>/testes`. O script copia o projeto sem `.env`, `node_modules`,
  `dist`, `.git`, as notas locais, `referencia_api/` e `testes-de-api/`, roda `npm ci` só na primeira vez (ou
  quando o `package.json` ou o `package-lock.json` mudam) e depois `npm run build`, `npm run lint` e `npm test`.
  Com argumentos, roda só o vitest com eles; o `--so-copiar` só atualiza a cópia.
- Os testes ficam em `src/__testes__/` e não dependem da API: usam fetch simulado. Os testes de tela contra a
  API real (`testes-de-api/`) ficam fora do git e fora da verificação.
- O teste manual no navegador é do usuário. Quando um critério de aceite só se prova no navegador ou contra a
  API real, o registro do item diz o que conferir, e o item espera o resultado.

## API e produção
- **O front não altera a API** (`../API-python/`) nem o backend PHP antigo (`../back/`). O que faltar ou estiver
  errado na API vira item no backlog da API, ligado a este pelo ID.
- Nada roda contra a API ou o banco de produção. A API local do usuário (docker compose, porta 8000) não é
  reiniciada nem reconfigurada sem confirmação; para gerar os tipos, ela precisa estar em modo de desenvolvimento.
- **Tipos da API:** quando o contrato muda, regenere `src/api/schema.d.ts` com `npm run gen:api` (API local
  atualizada) e commite o resultado no mesmo item.

## Documentação de cada item
- **Mudanças de contrato:** `MUDANCAS_DE_CONTRATO.md` (local, nunca no git, o mesmo arquivo nos dois projetos).
  - Ao concluir aqui o lado do front de uma mudança, marque a coluna "Front" da linha com o ID do item e a data.
  - Pronta nos dois lados, a linha vai para "Concluídas", com a data e os IDs dos dois itens.
  - A cada release, as concluídas saem do arquivo: o histórico fica no git e no CHANGELOG de cada projeto.
- **Trabalho que muda os dois lados:** cada repositório tem o próprio item no próprio backlog, e os dois se
  referenciam pelo ID ("Item da API: SEC-028"). Os arquivos versionados daqui descrevem a tela e citam o ID do
  item da API, sem detalhes de implementação dela.
- **Planos antigos** (`PLANO_*.md`, `ACHADOS_PENDENTES_DA_REVISAO.md`): são histórico local. Achado de revisão
  que ficar sem correção vira item do backlog (`DEBT` ou `BUG`), e não linha nova nesses arquivos.

## Fechamento
- O merge do item e o do PR de fechamento usam o título do PR com `(#n)`.
- Enquanto o CI (DEBT-001) e a issue do item não existirem, o `dod_check` acusa essas duas conferências: o
  registro do item diz que a verificação rodou na cópia e mostra o resultado.
