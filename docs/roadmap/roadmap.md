# Roadmap — OneCheck Front

> **Por que isso importa:** o roadmap mostra a ordem lógica de evolução. Cada fase termina com
> evidências verificáveis; segurança entra desde a F0, não no final.
> Fase atual: **F0** · Sprint de 14 dias · Atualizado em 2026-11-13

As funcionalidades já estão no nível das fases F3 e F4, mas o projeto foi adotado na gestão por roadmap em
2026-11-13 sem as evidências das fases iniciais (CI, README, riscos, auditoria). Pela regra do roadmap, a fase
atual é a primeira com evidência faltando; as lacunas viraram itens de prioridade alta.

| Fase | Foco | Sprints (prev.) | Status | Evidências de saída |
|---|---|---|---|---|
| **F0 Fundação** | começar certo | 0 e 1 | em andamento | visão, acordo de trabalho e backlog (TK-001); faltam CI (DEBT-001), README (DEBT-002) e proteção das branches (DEBT-003) |
| **F1 Requisitos e riscos** | saber o que proteger | 1 | rascunho | inventário de ativos e riscos em rascunho; falta a revisão (DEBT-005) |
| **F2 Arquitetura** | decisões registradas | 1 | parcial | ADR-0001 e ADR-0002; faltam a auditoria e o modelo de ameaças (SEC-001) e a arquitetura (DEBT-006) |
| **F3 MVP + identidade e acesso** | login, MFA, sessão e acesso por perfil | — | feito no código | US-001 e US-002, com testes do cliente da API e das regras de acesso; faltam os testes de tela (DEBT-009) |
| **F4 Funcionalidades + mitigações** | demais telas | 1 e 2 | feito no código, com itens abertos | US-003 a US-008; abertos: US-009 (Meus dados), US-010, TK-002 |
| **F5 Qualidade e observabilidade** | confiar no que roda | 2 | a fazer | DEBT-009 a DEBT-011, BUG-001, DEBT-004 |
| **F6 Hardening e release** | preparar a publicação | 2 | a fazer | SEC-003, DEBT-007 |
| **F7 Entrega e operação** | publicar e cortar o PHP | 2 | a fazer | TK-004, TK-005, TK-006 |

## Marcos (releases)
| Marco | Conteúdo | Data prevista | Status |
|---|---|---|---|
| v0.1.0 | Estado atual: todas as telas migradas e adequadas à API, com CI e README | <!-- a definir no planejamento da Sprint 1 --> | planejado |
| v1.0.0 | Front publicado, "Meus dados" e auditoria tratada | 2026-12-11 | planejado |

## Riscos ao roadmap
- **Prazo:** 2026-12-11 é a data final, e a fundação (F0 a F2) consome parte da primeira sprint.
- **Decisão de deploy:** onde o front será publicado ainda não foi decidido; TK-004, TK-005, TK-006 e SEC-003 dependem disso.
- **Dependência da API:** TK-002 (fotos por URL assinada) só começa quando a API definir o contrato novo; SEC-002 depende de um item ainda não criado na API.
- **Auditoria:** SEC-001 pode trazer achados que disputam a capacidade com as funcionalidades.

## Histórico de replanejamento
| Data | Mudança | Motivo |
|---|---|---|
| 2026-11-13 | Adoção do roadmap; projeto posicionado em F0 | O front passou a ser desenvolvido junto com a API, com o mesmo processo |
