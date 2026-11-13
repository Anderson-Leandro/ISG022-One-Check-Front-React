# Visão do Produto — OneCheck Front

> **Por que isso importa:** a visão é o filtro de todas as decisões. Quando surgir uma ideia nova,
> pergunte "isso aproxima o produto desta visão?". Se não, vai para o fim do backlog ou é descartada.

## Problema
Imobiliárias e locatários precisam registrar o estado do imóvel na entrada e na saída, acompanhar contratos e
resolver problemas da locação. A OneCheck API já cuida das regras e dos dados; falta uma interface web que
cada perfil use no dia a dia, no computador e no celular, sem depender do front PHP antigo, que não acompanha
as regras de segurança atuais da API.

## Usuários e perfis
| Perfil | Quem é | O que precisa fazer | Nível de acesso |
|---|---|---|---|
| admin | Responsável pelo sistema na imobiliária | Tudo: usuários, cadastros, vistorias, problemas, painéis e logs de auditoria | Total |
| gestor | Equipe que administra as locações | Imóveis, contratos, vistorias, problemas e usuários dos perfis vistoriador e locatário | Gestão, sem logs e sem contas de admin ou gestor |
| vistoriador | Quem faz a vistoria no imóvel | Preencher e submeter as vistorias designadas a ele, com fotos | Só imóveis e contratos em que tem vistoria; sem problemas |
| locatário | Quem aluga o imóvel | Ver o próprio contrato, aceitar ou rejeitar a vistoria, registrar e comentar problemas | Só o que é do próprio contrato |

O controle de acesso na interface é só de apresentação: quem valida de verdade é a API.

## Proposta de valor
Para a equipe da imobiliária e para o locatário, que precisam conduzir a locação com registro confiável do
imóvel, o OneCheck Front é uma aplicação web que mostra a cada perfil só o que ele pode fazer e leva as regras
de segurança da API até a tela (MFA, política de senha, sessão encerrada, erros por campo).

## Objetivos e métricas de sucesso
| Objetivo | Como medir | Meta |
|---|---|---|
| Substituir o front PHP | Telas do PHP disponíveis no React e front publicado | 100% das telas (atingido) e publicação até 2026-12-11 |
| Acompanhar o contrato da API | Linhas pendentes do lado do front no registro de mudanças de contrato | Zero pendências a cada release |
| Confiança nas mudanças | CI verde em todo PR; fluxos críticos com teste de tela | CI em 100% dos PRs; autenticação e exclusões cobertas |
| Direitos do titular (LGPD) | Tela "Meus dados" disponível | Entregue antes da versão final |

## Escopo do MVP
- Login com MFA, troca obrigatória de senha e sessão com renovação.
- Usuários, imóveis com cômodos e mapa, contratos com agendamentos, vistorias com fotos e laudo, problemas.
- Painéis por perfil, logs de auditoria (admin) e área do locatário.

## Fora de escopo (por enquanto)
- Anexos e assinatura de contrato (a API não tem as rotas).
- Aplicativo móvel nativo e uso sem conexão.
- Qualquer regra de negócio decidida no navegador: a regra é da API.

## Restrições
- Prazo final do projeto: 2026-12-11, junto com a API.
- Stack: React 19, Vite, TypeScript estrito, TanStack Query, Bootstrap 5; tipos gerados do OpenAPI da API.
- O front não altera a API: o que faltar vira item no backlog da API, ligado pelo ID.
- LGPD: o front exibe dados pessoais (nome, e-mail, CPF) e não deve guardá-los além do necessário à sessão.

## Dados e ativos sensíveis (primeira visão)
Tokens de sessão no navegador, dados pessoais exibidos nas telas, fotos de vistorias e o próprio código
publicado. Detalhe em [`docs/risks/asset-inventory.md`](../risks/asset-inventory.md).
