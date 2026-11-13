# <ID> — <título do item>

> **Por que isso importa:** este registro junta, num lugar só, a prova de que o item seguiu o processo
> (branch, testes, segurança, documentação). O `scripts/dod_check.py <ID>` confere cada seção contra o
> git e o GitHub; a Sprint Review usa o mesmo arquivo.

- **Sprint:** <N> · **Issue:** #<n> · **Branch:** `<tipo/ID-descricao>` · **PR:** #<n>

## Entrega
<!-- O que mudou, em 2 a 5 linhas, e como cada critério de aceite foi atendido (critério → prova).
     Se o item tem par na API, citar o ID dele. -->

## Testes
<!-- Testes novos (arquivo e o que cobrem, incluindo o cenário negado), resultado de build, lint e da suíte
     completa, e onde rodou (cópia sem o arquivo de segredos, por scripts/verificar_na_copia.sh). -->

## Segurança
<!-- Resultado da /security-audit diff dev: achados por severidade e o que foi feito com cada um.
     Se não se aplica (só documentação), dizer por quê. -->

## Checklist antes da revisão
<!-- Preencha ANTES do /code-review. Marque cada linha com [x] (conferido, diga como) ou [-] (não se aplica,
     diga por quê). O dod_check falha se sobrar alguma linha com [ ]. -->
- [ ] Perfis: a tela, o item de menu e cada ação aparecem só para os perfis que a API aceita (`permissoes.ts`), e o perfil sem acesso não chama a rota.
- [ ] Status finais: toda regra de tela que depende do status trata todos os estados finais (ex.: resolvido e fechado; aceito e rejeitado).
- [ ] Erros da API: `401`, `403`, `409`, `422` (com `erros` por campo) e `429` têm mensagem na tela, sem tela em branco nem erro engolido.
- [ ] Sessão: uma resposta com `dados.sessao` é gravada com `aplicarSessao`, e o fluxo novo não renova nem repete um login ou código recusado.
- [ ] Dados sensíveis: nada de token, senha, código ou dado pessoal em URL, `console`, armazenamento do navegador além da sessão, nem em mensagem de erro.
- [ ] Conteúdo vindo da API é exibido como texto (sem `dangerouslySetInnerHTML`), e URLs vindas de dados não viram `href` ou `src` sem conferência.

## Testes existentes alterados
<!-- "Nenhum." quando só houve testes novos ou asserções acrescentadas.
     Caso contrário, uma linha por teste alterado ou removido, ANTES do commit, e parar para aprovação:

| Arquivo :: teste | Antes | Depois | Por que precisa mudar | O comportamento atual quebra? |
|---|---|---|---|---|

Aprovado por: <nome> em AAAA-MM-DD -->

## Documentação
<!-- README, ADR, riscos, CLAUDE.md, MUDANCAS_DE_CONTRATO.md (local). "Nada a atualizar" com o motivo. -->
