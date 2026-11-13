# Acordo de Trabalho — OneCheck Front

> **Por que isso importa:** regras combinadas antes evitam discussão depois. Num time, o acordo
> garante que todos entendem "pronto" da mesma forma.

## Papéis
| Papel | Quem | Responsabilidade |
|---|---|---|
| Product Owner (PO/PM) | Gabriel Henrique Santana | visão, prioridade do backlog, critérios de aceite, aceite na review |
| Tech Lead (TL) | Anderson Mendes Leandro | arquitetura, padrões, ADRs, qualidade técnica, revisão |
| Dev | Ismael Alves de Almeida | implementar, testar, documentar, revisar |
| Dev | Luiz Felipe dos Santos | implementar, testar, documentar, revisar |

Por enquanto, Anderson Mendes Leandro é o responsável por todos os itens do backlog e por todos os riscos; a
distribuição entre o time acontece no planejamento de cada sprint.

## Cadência (Scrum, sprint de 14 dias)
- **Planning** (início): Sprint Goal + itens `ready` dentro da capacidade.
- **Acompanhamento** (diário ou por sessão de trabalho): andamento, impedimentos, decisões.
- **Refinamento** (meio da sprint): preparar itens da próxima sprint até a DoR.
- **Review** (fim): demonstrar o incremento e as evidências.
- **Retrospectiva** (fim): 1 coisa que funcionou, 1 melhoria → vira ação no backlog.

## Contexto deste projeto
- **Mesmo processo da API:** o front e a OneCheck API são desenvolvidos juntos, pelo mesmo time, com as mesmas
  regras. Cada repositório tem o próprio backlog; um trabalho que muda os dois lados vira um item em cada um,
  ligados pelo ID (ex.: "Item da API: SEC-028").
- **O front não altera a API.** O que faltar ou estiver errado na API vira item no backlog dela.
- **Contrato:** o que mudou no contrato da API e o estado de cada mudança nos dois lados fica em
  `MUDANCAS_DE_CONTRATO.md`, uma nota local, fora do git.
- **Branches:** o trabalho vai para `dev`, e a `main` recebe PR de `dev` na release. As branches curtas de item
  (`tipo/ID-descricao`) saem de `dev` atualizada. O autor pode mergear o próprio PR sem aprovação de outra pessoa.
- **Proteção no GitHub:** ainda não há ruleset nem CI (DEBT-001 e DEBT-003). Até lá, a regra vale por disciplina
  e pelo hook local do Claude.
- **Planos antigos:** `PLANO_MIGRACAO.md`, `PLANO_ADEQUACAO_API.md`, `PLANO_MELHORIAS.md` e
  `ACHADOS_PENDENTES_DA_REVISAO.md` são notas locais e ficam como histórico. O que estava aberto neles virou
  item do backlog em 2026-11-13; a partir daí, a fonte é o backlog.

## Git
- `main` sempre implantável; trabalho em branches curtas: `tipo/ID-descricao`
  (ex.: `feat/US-009-meus-dados`, `fix/BUG-001-listas-acima-de-100`, `chore/DEBT-001-ci`).
- Commits pequenos no padrão **Conventional Commits**, citando o ID: `feat(perfil): tela Meus dados (US-009)`.
- O título do PR segue o mesmo padrão. Todo merge passa por **Pull Request** com o template preenchido, mas
  **não exige aprovação de outra pessoa**: antes de mergear, o autor lê o diff inteiro e confere a verificação
  (o CI, quando existir). `/code-review` é recomendado para mudanças de segurança.
- Nunca commit ou push direto na `dev` ou na `main`. Não reescrever histórico publicado.
- Releases com tag SemVer ao fim de cada marco; CHANGELOG atualizado (DEBT-007).
- **Nunca** versionar segredos: `.env` no `.gitignore`, `.env.example` só com valores fictícios. Variáveis
  `VITE_*` vão para o código publicado: nenhuma pode ser segredo.

## Definition of Ready (DoR) — item pode entrar na sprint quando
- [ ] Objetivo e contexto entendidos (story Como/quero/para quando for história de usuário)
- [ ] Critérios de aceite verificáveis (Dado/Quando/Então)
- [ ] Estimado e cabe em uma sprint (≤ 8 pts; se não, quebrar)
- [ ] Dependências conhecidas e não bloqueantes (inclusive o item da API, quando houver)
- [ ] **Impacto de segurança avaliado** (none/low/medium/high); se medium/high, há critério de cenário negado/abuso

## Definition of Done (DoD) — item só está pronto quando
- [ ] Critérios de aceite atendidos e demonstráveis
- [ ] Código integrado na `dev` via PR, com a verificação verde e o diff relido pelo autor (a `main` recebe a `dev` na release)
- [ ] `npm run build`, `npm run lint` e `npm test` passando; testes novos para a regra ou a tela alterada (incluindo o cenário negado, se houver)
- [ ] Nenhum segredo, credencial ou dado pessoal real adicionado ao repositório
- [ ] Mensagens de erro e o console do navegador não expõem tokens nem dados pessoais
- [ ] Documentação atualizada (README, ADR, riscos — o que se aplicar)
- [ ] Mudança de contrato marcada em `MUDANCAS_DE_CONTRATO.md` (fora do git), com o ID do item
- [ ] Impactos/riscos de segurança avaliados (risco novo → docs/risks/risk-register.md)
- [ ] Evidência registrada no item (PR, teste, commit, print)
- [ ] Teste existente alterado ou removido: relatório no registro do item e aprovação do usuário antes do commit
- [ ] `python3 scripts/dod_check.py <ID>` verde (registro em `docs/roadmap/execucao/<ID>.md`)

## Ética de testes de segurança
- Testes ofensivos só no próprio ambiente ou com autorização explícita por escrito.
- Dados fictícios sempre que bastarem; nunca dados pessoais reais em dev/teste.
- Nada roda contra a API ou o banco de produção.
- Vulnerabilidade achada em sistema de terceiros: comunicar ao responsável, não explorar.
- IA pode apoiar, mas quem entrega revisa, entende e responde por tudo.
