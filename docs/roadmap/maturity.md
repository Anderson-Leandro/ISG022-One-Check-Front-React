# Diagnóstico de Maturidade — OneCheck Front

- **Data:** 2026-11-13 · **Pontuação:** 8/20
- Gerado pela skill `project-kickoff adopt` (base: `diagnose.py`). Cada lacuna virou um item do backlog.

## Retrato atual
- React 19, Vite 6, TypeScript estrito, TanStack Query, Bootstrap 5, Leaflet e Chart.js; tipos gerados do OpenAPI da API.
- 100 arquivos de código, 42 arquivos de página, 6 arquivos de teste (Vitest, sem depender da API).
- 50 commits de 2026-10-24 a 2026-11-13, 2 autores, nenhuma tag; 4 PRs mesclados.
- Sem CI, sem proteção de branches, sem `docs/` até esta adoção; o README era o modelo do Vite.

## Checklist
| Área | Item | Situação | Item do backlog |
|---|---|---|---|
| docs | README com visão, execução e status | existe, mas é o modelo do Vite | DEBT-002 |
| docs | Licença definida | falta | DEBT-008 |
| build | Manifesto de dependências | ok | — |
| build | Lockfile versionado | ok | — |
| qualidade | Testes automatizados | ok (regras e cliente da API; uma tela) | DEBT-009, DEBT-010 |
| qualidade | CI rodando testes e lint | falta | DEBT-001 |
| qualidade | Lint configurado | ok | — |
| segurança | Atualização de dependências automatizada | falta | DEBT-004 |
| segurança | `.env` ignorado no git e nenhum versionado | ok | — |
| segurança | `.env.example` com valores fictícios | ok | — |
| segurança | Documentação de segurança / threat model | falta | SEC-001 |
| segurança | Auditoria de segurança recente | falta | SEC-001 |
| processo | Decisões registradas (ADRs) | iniciado nesta adoção (0001 e 0002) | DEBT-006 |
| docs | Documentação de arquitetura | falta | DEBT-006 |
| processo | Templates de PR e issue | criados nesta adoção | TK-001 |
| processo | Conventional Commits (≥ 70%) | 0% | DEBT-007 |
| processo | Releases e tags | falta | DEBT-007 |
| docs | CHANGELOG | falta | DEBT-007 |
| processo | Backlog e roadmap estruturados | criados nesta adoção | TK-001 |
| processo | Proteção das branches no GitHub | falta (fora do checklist do script) | DEBT-003 |

## Auditoria de segurança
- Situação: ausente · última: nunca rodou.
- Ação tomada: não executada na adoção, por decisão do usuário em 2026-11-13 → SEC-001 (`must`).

## Funcionalidades (código × git × testes × docs)
Detalhe completo em [feature-map.md](feature-map.md).

| Funcionalidade | Telas | Proteção na interface | Testes | Situação | Itens |
|---|---|---|---|---|---|
| Autenticação, MFA e sessão | 5 | pública e autenticado | cliente da API, MFA, sessão entre abas | feita, teste de tela parcial | US-001, DEBT-009 |
| Usuários e perfis | 5 | admin, gestor | regras | feita, sem teste de tela | US-002, US-009 |
| Imóveis, cômodos e mapa | 8 | admin, gestor, vistoriador | regras, pino do mapa | feita, sem teste de tela | US-003 |
| Contratos e agendamentos | 4 | admin, gestor | regras | feita, sem teste de tela | US-004 |
| Vistorias | 8 | todos os perfis | regras | feita, sem teste de tela | US-005 |
| Problemas | 5 | admin, gestor, locatário | regras | feita, sem teste de tela | US-006 |
| Painéis e logs | 6 | admin, gestor, vistoriador; logs só admin | regras | feita, sem teste de tela | US-007 |
| Área do locatário | 1 | locatário | nenhum | feita, sem teste | US-008 |

### Pontos de segurança a confirmar
| Local | Indício | Item |
|---|---|---|
| `src/auth/armazenamentoDeTokens.ts` | Refresh token na `localStorage`, ao alcance de um eventual XSS | SEC-002 |
| `src/api/client.ts` (`comTravaEntreAbas`) | Sem `navigator.locks` (origem `http` fora de `localhost`), duas abas podem reenviar o mesmo refresh token, e a API encerra todas as sessões | DEBT-011 |
| `src/api/client.ts` (`marcarSenhaExpirada`) | Senha expirada detectada pelo texto da mensagem do `403` | DEBT-011 |
| Servidor do front (a definir) | Sem CSP nem cabeçalhos de segurança definidos | SEC-003 |
| `GET /uploads/{arquivo}` | Fotos acessíveis sem login até a API trocar por URL assinada | TK-002 |
| Dependências (`package.json`) | Nenhuma análise automática de vulnerabilidades | DEBT-004, SEC-001 |

Nenhuma rota pública além das telas de login e do primeiro acesso do MFA, que são públicas por desenho.

## O que já foi feito (reconstruído do histórico)
| Épico | Entregas (commits/PRs) |
|---|---|
| EP-002 Autenticação, MFA e sessão | base e autenticação (`bf07170`), cliente e sessão (`dc14298`), MFA e senha expirada (`42476d8`), mensagens e sessão entre abas (PR #1) |
| EP-003 Usuários e perfis | migração (`cc86b35`), perfis, senha, CPF e MFA de terceiros (`51339d1`), desativar usuário (`c96821c`) |
| EP-004 Imóveis, cômodos e mapa | migração (`a019646`), histórico (`68c6e40`), exclusão (`c96821c`), pino do mapa (PR #2) |
| EP-005 Contratos e agendamentos | migração (`b7af71f`), exclusão e agenda (`68c6e40`) |
| EP-006 Vistorias | migração (`b0714b5`), regras da API, fotos e nova inicial (`7f16b15`) |
| EP-007 Problemas | migração (`d5ae3cc`), exclusão e comentário do locatário (`68c6e40`) |
| EP-008 Painéis e auditoria | migração (`7907789`), painel por perfil (`7f16b15`), logs (`68c6e40`) |
| EP-009 Área do locatário | migração (`8f42256`), agenda (`68c6e40`) |

## Pendências importadas
| Origem | Itens criados |
|---|---|
| `PLANO_MELHORIAS.md` (itens ainda abertos) | US-009 a US-018, BUG-001, DEBT-002, DEBT-011 a DEBT-013, SEC-002 |
| `ACHADOS_PENDENTES_DA_REVISAO.md` (abertos) | TK-003 (itens 2, 8, 14), DEBT-009 (12), DEBT-010 (19), DEBT-011 (3, 5, 6), DEBT-012 (10, 11, 16, 17, 18), DEBT-014 (1) |
| `PLANO_MIGRACAO.md` (Fase 6, adiada) | TK-004, TK-005, TK-006 |
| Registro de mudanças de contrato | US-009 (linha 46), TK-005 (linha 19), TK-002 (seção 6) |
| `PENDENCIAS_API.md` | nenhum: os itens são da API; "anexos e assinatura de contrato" segue sem rota e fora de escopo |

Os achados com situação "aceito" (4, 9, 15, 20, 21 e 22) não viraram item: a decisão de não corrigir está
registrada no arquivo de origem.

## Fase do roadmap
O projeto foi posicionado em **F0** porque faltam evidências de saída da fundação: CI rodando (DEBT-001),
README do projeto (DEBT-002) e branches protegidas (DEBT-003). As fases F1 e F2 também têm lacunas
(riscos em rascunho, sem auditoria nem modelo de ameaças). O código, por sua vez, já entrega o que as fases
F3 e F4 pedem; por isso a primeira sprint é de fundação, e não de funcionalidade.
