# ADR-0002: React, Vite e TypeScript no lugar do front PHP

- **Status:** aceito
- **Data:** 2026-11-13 (decisão tomada em 2026-10-24; registrada na adoção do roadmap)
- **Itens relacionados:** TK-001, US-001 a US-008

> **Por que isso importa:** daqui a 6 meses ninguém lembra por que escolheu X. O ADR guarda o
> contexto e as alternativas, e evita rediscutir a mesma decisão.

## Contexto
O front antigo era PHP renderizado no servidor, que guardava a sessão e repassava as chamadas à API. A API
passou a ser a OneCheck API (FastAPI), com JWT, MFA e regras de acesso próprias, e o front PHP não acompanhava
essas regras. Era preciso uma interface que falasse direto com a API e fosse mantida pelo mesmo time.

## Opções consideradas
1. **Manter e adaptar o front PHP** — reaproveita as telas, mas mantém uma segunda camada de sessão e regras
   duplicadas no servidor do front.
2. **React + Vite + TypeScript (SPA)** — fala direto com a API, tipos gerados do OpenAPI, build estático.
3. **Next.js** — renderização no servidor e rotas prontas, mas traz um servidor Node a mais para operar, sem
   necessidade: não há página pública para indexar.

## Decisão
Vamos usar uma SPA em React 19 com Vite e TypeScript estrito, porque fala direto com a API, publica como
arquivos estáticos e deixa o contrato conferido pelo compilador. Complementos:
- **TanStack Query** para os dados do servidor (nada de `useEffect` com `fetch`);
- **openapi-fetch** com `src/api/schema.d.ts` gerado do `/openapi.json` da API;
- **React Router** com rotas guardadas por perfil (`RotaProtegida`);
- **Bootstrap 5** e o CSS do front PHP, para manter o visual;
- **Vitest** com Testing Library; os testes não dependem da API.

## Consequências
- Positivas: uma só fonte de regras (a API); contrato tipado; deploy simples; code splitting por rota.
- Negativas / custos: o servidor que publica o build precisa do fallback de SPA (TK-004); o controle de acesso
  na interface é só de apresentação e precisa seguir a API a cada mudança de contrato.
- **Segurança:** os tokens ficam no navegador (R-001; SEC-002 e SEC-003); todo o código publicado é público,
  então nenhum segredo pode ir para variáveis `VITE_*` (R-009); a API continua sendo a única autoridade de
  autorização.
