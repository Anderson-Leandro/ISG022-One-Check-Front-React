# Inventário de Ativos — OneCheck Front

> **Por que isso importa:** não dá para proteger o que não se sabe que existe. Cada ativo tem
> propriedades de segurança diferentes (C = confidencialidade, I = integridade, D = disponibilidade,
> A = autenticidade). A importância de cada uma guia os controles.

Rascunho da adoção (2026-11-13), com avaliação preliminar. A revisão com o PO é o DEBT-005.
O front não tem banco: os dados são da API, e aqui entram só os que passam pelo navegador.

| ID | Ativo | Tipo | Onde fica | Dono | C | I | D | A | Dados pessoais? | Observações |
|---|---|---|---|---|---|---|---|---|---|---|
| A-01 | Tokens de sessão (access, refresh e temporário do MFA) | dado | `sessionStorage` e `localStorage` do navegador | Anderson | alta | alta | média | alta | não | o refresh fica na `localStorage` (SEC-002); nunca em log nem em URL |
| A-02 | Dados do usuário logado guardados no navegador | dado | `localStorage` | Anderson | média | média | baixa | média | sim | nome, e-mail e perfil; apagados no logout |
| A-03 | Dados pessoais exibidos nas telas (usuários, locatários, CPF) | dado | memória e cache de consultas do navegador | Anderson | alta | média | baixa | média | sim | CPF completo só no detalhe; a API responde com `no-store` |
| A-04 | Fotos de vistorias e de problemas | dado | API (`/uploads`), exibidas por URL | Anderson | média | alta | média | média | sim | hoje a URL é pública (TK-002) |
| A-05 | Código publicado (bundle) | código | servidor do front (a definir, TK-004) | Anderson | baixa | alta | alta | alta | não | tudo o que vai no bundle é público; sem mapa de código-fonte em produção |
| A-06 | Configuração de build (`VITE_API_URL`) | configuração | `.env` local e variáveis do deploy | Anderson | baixa | alta | média | média | não | variáveis `VITE_*` são públicas: nenhuma pode ser segredo |
| A-07 | Dependências de terceiros (npm) | código | `package-lock.json` | Anderson | baixa | alta | média | alta | não | sem análise automática ainda (DEBT-004) |
| A-08 | Repositório e histórico | código | GitHub | Anderson | média | alta | média | alta | não | branches sem proteção ainda (DEBT-003) |
| A-09 | Notas locais (planos, pendências, mudanças de contrato) | pessoa/processo | máquina de desenvolvimento, fora do git | Anderson | média | baixa | baixa | baixa | não | nunca entram no git |

Tipos: dado, serviço/API, código, configuração/segredo, infraestrutura, pessoa/processo.
