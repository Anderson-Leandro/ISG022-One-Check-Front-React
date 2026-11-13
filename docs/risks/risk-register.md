# Registro de Riscos — OneCheck Front

> **Por que isso importa:** risco = probabilidade × impacto. Registrar força uma decisão consciente
> (mitigar, aceitar, transferir ou evitar) em vez de esquecer o problema.

Escala: probabilidade e impacto de 1 (baixo) a 3 (alto). Nível = P × I → 1–2 baixo · 3–4 médio · 6–9 alto.

Rascunho da adoção (2026-11-13). A revisão com o PO é o DEBT-005; a auditoria (SEC-001) pode acrescentar riscos.

| ID | Risco (ameaça → ativo → consequência) | Ativo | STRIDE | P | I | Nível | Tratamento | Controle / item | Dono | Status | Risco residual |
|---|---|---|---|---|---|---|---|---|---|---|---|
| R-001 | Script injetado (XSS) lê o refresh token e assume a sessão por até 30 dias | A-01 | I, S | 1 | 3 | 3 médio | mitigar | SEC-003 (CSP), SEC-002 (cookie httpOnly, depende da API) | Anderson | aberto | o React escapa o conteúdo por padrão; a API encerra as sessões ao ver um refresh reutilizado |
| R-002 | Dependência npm vulnerável ou comprometida chega ao bundle publicado | A-07, A-05 | T | 2 | 3 | 6 alto | mitigar | DEBT-004, SEC-001 | Anderson | aberto | |
| R-003 | Mudança entra na `dev` ou na `main` sem verificação (push direto, sem CI) e quebra ou enfraquece uma regra de acesso da interface | A-08, A-05 | T | 2 | 2 | 4 médio | mitigar | DEBT-001, DEBT-003 | Anderson | aberto | o hook local bloqueia o Claude, não outras pessoas |
| R-004 | Regressão num fluxo de autenticação (senha expirada, MFA) passa sem teste de tela | A-01 | E, D | 2 | 2 | 4 médio | mitigar | DEBT-009 | Anderson | aberto | |
| R-005 | Front servido por `http` fora de `localhost`: duas abas reenviam o mesmo refresh token, e a API encerra todas as sessões do usuário | A-01 | D | 1 | 2 | 2 baixo | mitigar | DEBT-011; publicar só em `https` (TK-004) | Anderson | aberto | |
| R-006 | Foto de vistoria acessada por quem tem a URL, sem login | A-04 | I | 2 | 2 | 4 médio | mitigar | TK-002 (depende da API) | Anderson | aberto | nome de arquivo aleatório |
| R-007 | Front publicado sem cabeçalhos de segurança (CSP, proteção contra frame) | A-05 | T, S | 2 | 2 | 4 médio | mitigar | SEC-003 | Anderson | aberto | |
| R-008 | Titular não consegue exportar nem excluir os próprios dados pela tela | A-03 | R | 2 | 2 | 4 médio | mitigar | US-009 | Anderson | aberto | a API já oferece as rotas |
| R-009 | Segredo colocado numa variável `VITE_*` vai para o bundle público | A-06 | I | 1 | 3 | 3 médio | mitigar | regra no acordo de trabalho; SEC-001 confere o bundle | Anderson | aberto | hoje só existe `VITE_API_URL` |

**Tratamentos:** mitigar (cria item no backlog) · aceitar (justificar + quem aceitou + quando
revisar) · transferir (seguro, fornecedor) · evitar (remover a funcionalidade).

## Riscos aceitos
| ID | Justificativa | Aceito por | Data | Revisar em |
|---|---|---|---|---|
