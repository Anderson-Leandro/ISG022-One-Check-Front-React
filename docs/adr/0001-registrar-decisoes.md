# ADR-0001: Registrar as decisões de arquitetura em ADRs

- **Status:** aceito
- **Data:** 2026-11-13
- **Itens relacionados:** TK-001, DEBT-006

> **Por que isso importa:** daqui a 6 meses ninguém lembra por que escolheu X. O ADR guarda o
> contexto e as alternativas, e evita rediscutir a mesma decisão.

## Contexto
O front foi construído em três semanas, com as decisões espalhadas em planos locais, fora do git
(`PLANO_MIGRACAO.md`, `PLANO_ADEQUACAO_API.md`). Com a adoção do roadmap e o trabalho em conjunto com a API,
as decisões precisam ficar no repositório, onde o time inteiro lê.

## Opções consideradas
1. **Continuar nos planos locais** — sem custo, mas só existe numa máquina e some com ela.
2. **ADRs em `docs/adr/`** — um arquivo curto por decisão, versionado, no mesmo formato da API.
3. **Wiki do GitHub** — fora do fluxo de PR e sem revisão junto com o código.

## Decisão
Vamos usar ADRs em `docs/adr/NNNN-titulo.md`, no mesmo formato da OneCheck API, porque ficam no git, passam
por PR e podem ser citados pelos itens do backlog.

## Consequências
- Positivas: decisões com contexto e alternativas; mesmo formato nos dois repositórios.
- Negativas / custos: escrever o ADR faz parte do item que toma a decisão. As decisões já tomadas (guarda dos
  tokens, tipos gerados do OpenAPI, controle de acesso só de interface) ainda precisam ser registradas (DEBT-006).
- **Segurança:** decisões com risco aceito passam a ter registro e ligação com `docs/risks/risk-register.md`.
