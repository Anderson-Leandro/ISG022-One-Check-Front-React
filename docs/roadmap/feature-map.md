# Mapa de funcionalidades — OneCheck Front

- **Data:** 2026-11-13 · linha de base da adoção do roadmap.
- O `feature_map.py` não detecta rotas em front React, então o mapa foi montado à mão a partir de
  `src/App.tsx` (rotas), `src/auth/permissoes.ts` (perfis por página) e `src/__testes__/`.
- **Proteção** aqui é a da interface (`RotaProtegida`): esconde telas e ações. Quem autoriza de verdade é a API.

## Rotas

| Rota | Tela | Proteção na interface |
|---|---|---|
| `/login`, `/mfa/verificar`, `/mfa/configurar-login` | Login, verificação e primeiro acesso do MFA | pública (`RotaPublica`) |
| `/mfa/configurar`, `/senha/trocar` | Reconfigurar autenticador; troca obrigatória de senha | autenticado |
| `/locatario` | Área do locatário | locatário |
| `/dashboard`, `/dashboard/analytics`, `/dashboard/financeiro`, `/dashboard/operacional` | Painéis | admin, gestor, vistoriador |
| `/dashboard/logs` | Logs de auditoria | admin |
| `/imoveis`, `/imoveis/novo`, `/imoveis/:id`, `/imoveis/:id/editar`, `/imoveis/:id/comodos`, `/imoveis/:id/historico` | Imóveis | admin, gestor, vistoriador |
| `/imoveis/mapa` | Mapa | admin, gestor, vistoriador |
| `/vistorias`, `/vistorias/nova`, `/vistorias/:id` e `/checklist`, `/fotos`, `/comparativo`, `/relatorio` | Vistorias | admin, gestor, vistoriador, locatário |
| `/contratos`, `/contratos/novo`, `/contratos/:id` | Contratos | admin, gestor |
| `/problemas`, `/problemas/novo`, `/problemas/:id`, `/problemas/:id/historico` | Problemas | admin, gestor, locatário |
| `/usuarios/perfil` | Meu perfil | autenticado |
| `/usuarios`, `/usuarios/novo`, `/usuarios/:id/editar`, `/usuarios/:id/permissoes` | Gestão de usuários | admin, gestor |
| `*` | Redireciona para o início do perfil ou para o login | — |

As ações dentro das telas (criar, excluir, aceitar, comentar) seguem `PERFIS_QUE_CRIAM`,
`podeGerenciarUsuario` e `permissoesDaVistoria`.

## Matriz: o que existe × o que foi feito × o que falta

| Funcionalidade | Telas | Testes | Git (período) | Pendências | Situação | Itens |
|---|---|---|---|---|---|---|
| Autenticação, MFA e sessão | 5 | `client.test.ts` (16), `ConfigurarMfa.test.tsx` (3), `mensagens.test.tsx`, sessão entre abas | `bf07170` (10-24) a PR #3 (11-13) | senha expirada e desabilitar MFA sem teste de tela; 3 pontos sem conferência contra a API | feita, teste parcial | US-001, DEBT-009, DEBT-011, TK-003 |
| Usuários e perfis | 5 | `regras.test.ts` (acesso, CPF, senha) | `cc86b35` a `c96821c` | "Meus dados" (LGPD) não existe | feita, sem teste de tela | US-002, US-009 |
| Imóveis, cômodos, histórico e mapa | 8 | `regras.test.ts` (endereço), `mapa.test.ts` | `a019646` a `f8d2b7d` | editar cômodo; bloco e andar | feita, sem teste de tela | US-003, US-013, US-014, DEBT-010 |
| Contratos e agendamentos | 4 | `regras.test.ts` (agendamentos) | `b7af71f` a `68c6e40` | anexos e assinatura: sem rota na API | feita, sem teste de tela | US-004, DEBT-010 |
| Vistorias | 8 | `regras.test.ts` (permissões, fotos) | `b0714b5` a `7f16b15` | fotos por URL assinada (depende da API) | feita, sem teste de tela | US-005, TK-002 |
| Problemas | 5 | `regras.test.ts` (encerramento) | `d5ae3cc` a `68c6e40` | foto e cômodo no problema | feita, sem teste de tela | US-006, US-010, DEBT-010 |
| Painéis e logs | 6 | `regras.test.ts` (meses, campos do log) | `7907789` a `68c6e40` | limite de 100 registros; filtro por usuário | feita, sem teste de tela | US-007, BUG-001, US-015 |
| Área do locatário | 1 | nenhum | `8f42256` a `68c6e40` | — | feita, sem teste | US-008, DEBT-010 |
| Robustez e mensagens | — | `robustez.test.tsx`, `mensagens.test.tsx` | `c96821c` (PR #1) | página não encontrada; voltar ao destino; diálogos | feita em parte | US-011, US-012, US-016 a US-018 |

Totais: 42 telas de página, 6 arquivos de teste com 70 testes; uma única tela (`ConfigurarMfa`) tem teste de tela.

## Chamadas à API por módulo

| Módulo (`src/api/`) | Recursos da API |
|---|---|
| `client.ts` | envelope, erros, `401` com renovação única (inclusive entre abas), `429` com `Retry-After` |
| `usuarios.ts` | `/usuarios`, `/usuarios/me`, `/usuarios/me/senha`, `/auth/mfa/setup`, `/activate`, `/desabilitar`, `/usuarios/{id}/mfa` |
| `imoveis.ts` | `/imoveis`, endereço, cômodos, histórico |
| `contratos.ts` | `/contratos`, agendamentos |
| `vistorias.ts` | checklists, itens, fotos, aceite, laudo em PDF |
| `problemas.ts` | problemas, status, atualizações |
| `painel.ts` | `/dashboard`, `/logs` |
| `locatario.ts` | agregação do contrato do locatário |
| `exclusao.ts` | invalidação de cache depois de excluir |

Para comparar numa review futura: conferir de novo `src/App.tsx`, `src/auth/permissoes.ts` e a contagem de testes.
