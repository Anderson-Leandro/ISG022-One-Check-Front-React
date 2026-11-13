# Sprint 0

- **Período:** 2026-11-13 → 2026-11-14
- **Sprint Goal:** Front adotado na gestão por roadmap, com o mesmo processo da API
- **Capacidade:** 20 pts · **Comprometido:** 3 pts

> **Sprint Goal** é o "porquê" da sprint: se algum item não couber, o goal ajuda a decidir o que
> cortar sem perder o valor da entrega.

A Sprint 0 é só a adoção. A Sprint 1 é planejada com `/sprint-manager plan`, junto com a Sprint 15 da API.

## Itens comprometidos
| ID | Título | Est. | Seg. | Status final |
|---|---|---|---|---|
| TK-001 | Adotar a gestão por roadmap e instalar o sprint-executor | 3 | none | |

## Acompanhamento
| Data | Andamento | Impedimentos | Decisões (→ ADR?) |
|---|---|---|---|
| 2026-11-13 | TK-001: adoção gravada na branch `chore/TK-001-adocao-roadmap` (docs/roadmap, riscos, ADRs 0001 e 0002, templates, 54 itens no backlog) e sprint-executor instalado (`dod_check`, modelo de registro, verificação na cópia, hook de guarda). Linhas 1 a 50 do registro de mudanças de contrato conferidas no código | Sem CI e sem issue: o `dod_check` de TK-001 acusa as duas conferências até DEBT-001 e o primeiro board-sync | Auditoria de segurança não rodou na adoção (decisão do usuário) → SEC-001; projeto posicionado em F0 |

## Sprint Review
- **Incremento demonstrável:**
- **Goal atingido?** sim / parcial / não — por quê:
- **Evidências** (PRs, testes, prints, relatórios):
- **Checagem de segurança** (`/security-audit diff`, segredos, riscos novos):
- **Feedback do cliente/PO:**

## Retrospectiva
| Funcionou bem | Melhorar | Ação (vira item no backlog) |
|---|---|---|

## Métricas
- Velocity: — pts (comprometido 3)
- Itens que voltaram ao backlog:
