#!/usr/bin/env python3
"""Confere a Definition of Done de um item do backlog contra os fatos do git e do GitHub.

Modelo do sprint-executor (~/.claude/skills/_roadmap-shared/templates/executor/). Copie para scripts/dod_check.py
do projeto. A configuração vem do bloco `executor:` de docs/roadmap/project.yaml (todos os campos são opcionais):

  executor:
    branch_base: dev            # base dos PRs de implementação
    branch_release: main        # destino da release (PR branch_base → branch_release)
    pastas_codigo: [app/]       # um PR que muda estas pastas precisa trazer testes
    pastas_testes: [tests/]

Uso: python3 scripts/dod_check.py <ID> [--antes-do-merge]

Sem --antes-do-merge (padrão, depois do merge), confere:
  1. o item existe, está done e tem evidências e PR registrados;
  2. cada PR do item foi mesclado na branch base, com todos os checks do CI em SUCCESS, e há pelo menos um.
     Um PR de release (base → release) listado no item confere só o merge e o CI;
  3. a branch de cada PR de implementação leva o ID do item (tipo/ID-descricao);
  4. se o PR mexe nas pastas de código, o diff também mexe nas pastas de testes;
  5. se o PR altera ou remove um teste que já existia, o registro de execução traz o relatório
     com cada arquivo e a aprovação do usuário;
  6. o registro de execução docs/roadmap/execucao/<ID>.md existe com as seções obrigatórias,
     incluindo o resultado da security-audit;
  7. a issue do item está fechada;
  8. a sprint do item tem uma linha de acompanhamento citando o ID;
  9. o backlog valida sem erros;
 10. se existir .github/repositorio.json, o repositório no GitHub segue essa configuração (por exemplo,
     merge_commit_title=PR_TITLE, para o merge pela interface sair com o título do PR).

Com --antes-do-merge, confere o PR aberto da branch atual (itens 3 a 6), o backlog (9) e a configuração
do repositório (10) antes de pedir o merge.
Sai com 1 se alguma verificação falhar.
"""

import functools
import json
import re
import subprocess
import sys
from pathlib import Path

import yaml

RAIZ = Path(__file__).resolve().parent.parent


def _config() -> dict:
    projeto = RAIZ / "docs/roadmap/project.yaml"
    dados = yaml.safe_load(projeto.read_text(encoding="utf-8")) if projeto.exists() else {}
    return (dados or {}).get("executor") or {}


CONFIG = _config()
BASE = CONFIG.get("branch_base", "dev")
RELEASE = CONFIG.get("branch_release", "main")
PASTAS_CODIGO = tuple(CONFIG.get("pastas_codigo", ["app/"]))
PASTAS_TESTES = tuple(CONFIG.get("pastas_testes", ["tests/"]))
SECOES = ["## Entrega", "## Testes", "## Segurança", "## Testes existentes alterados", "## Documentação"]
resultados: list[tuple[bool, str]] = []


def ok(cond: bool, msg: str) -> bool:
    resultados.append((bool(cond), msg))
    return bool(cond)


def sh(*args: str) -> str:
    r = subprocess.run(args, cwd=RAIZ, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"{' '.join(args)}: {r.stderr.strip()}")
    return r.stdout


def gh_json(*args: str):
    return json.loads(sh("gh", *args))


def item_do_backlog(iid: str) -> dict | None:
    itens = yaml.safe_load((RAIZ / "docs/roadmap/backlog.yaml").read_text())["items"]
    return next((i for i in itens if i["id"] == iid), None)


def testes_alterados(pr: dict) -> list[str]:
    """Arquivos de teste do PR que já existiam antes dele (alterados ou removidos)."""
    base = pr.get("mergeCommit", {}) or {}
    ref = f"{base['oid']}^1" if base.get("oid") else f"origin/{pr['baseRefName']}"
    alterados = []
    for f in pr["files"]:
        caminho = f["path"]
        if not caminho.startswith(PASTAS_TESTES):
            continue
        existia = (
            subprocess.run(["git", "cat-file", "-e", f"{ref}:{caminho}"], cwd=RAIZ, capture_output=True).returncode == 0
        )
        if existia and f.get("deletions", 0) > 0:
            alterados.append(caminho)
    return alterados


def secao(registro: str, titulo: str) -> str | None:
    """Corpo da seção '## titulo' (o título no começo da linha), até a próxima seção; None se não existe."""
    achado = re.search(rf"^## {re.escape(titulo)}(?:\s*[(:—–][^\n]*)?\s*$", registro, re.M)
    if not achado:
        return None
    return registro[achado.end() :].split("\n## ", 1)[0]


def cita_id(texto: str, iid: str) -> bool:
    """O texto cita o ID, direto ou num intervalo do mesmo tipo ('SPK-001 a SPK-004', 'até', '–')."""
    if re.search(rf"\b{re.escape(iid)}\b", texto):
        return True
    prefixo, _, numero = iid.rpartition("-")
    if not numero.isdigit():
        return False
    intervalo = rf"\b{re.escape(prefixo)}-(\d+)\s*(?:a|até|–|—|-)\s*{re.escape(prefixo)}-(\d+)\b"
    return any(
        len(a) == len(b) == len(numero) and int(a) <= int(numero) <= int(b) for a, b in re.findall(intervalo, texto)
    )


def faltando_no_relatorio(alterados: list[str], relatorio: str, arquivos_de_teste: list[str]) -> list[str]:
    """Testes alterados que o relatório não cita. Vale o caminho completo, ou só o nome do arquivo quando
    nenhum outro arquivo de teste do projeto tem o mesmo nome."""
    nomes = [Path(a).name for a in set(arquivos_de_teste) | set(alterados)]

    def citado(caminho: str) -> bool:
        if caminho in relatorio:
            return True
        nome = Path(caminho).name
        return (
            nomes.count(nome) == 1 and re.search(rf"(?<![\w.\-/]){re.escape(nome)}(?![\w.\-])", relatorio) is not None
        )

    return [a for a in alterados if not citado(a)]


_NAO_RODOU = re.compile(r"\bn[ãa]o\s+(?:foi\s+|foram\s+)?(?:rodad|rodou|executad|feit)|\bainda\s+n[ãa]o\b", re.I)
_DE_ITEM = re.compile(r"\b[A-Z]{2,5}-\d+\b|\bite(?:m|ns)\b", re.I)


def auditoria_rodou(seguranca: str) -> bool:
    """A seção cita a security-audit e não diz que ela ficou por fazer.

    'pendente' reprova, salvo numa frase que fala de um item do backlog ('SEC-019 continua pendente',
    'os itens pendentes'), que não é a auditoria."""
    if not re.search(r"security-audit", seguranca, re.I) or _NAO_RODOU.search(seguranca):
        return False
    frases = re.split(r"[.;\n]", seguranca)
    return not any(re.search(r"pendente", f, re.I) and not _DE_ITEM.search(f) for f in frases)


@functools.cache
def arquivos_de_teste() -> list[str]:
    """Arquivos de teste na branch base remota (a base dos PRs), lidos uma vez por execução."""
    pastas = [p.rstrip("/") for p in PASTAS_TESTES]
    try:
        return sh("git", "ls-tree", "-r", "--name-only", f"origin/{BASE}", *pastas).splitlines()
    except RuntimeError:
        return sh("git", "ls-files", *pastas).splitlines()


def conferir_pr(iid: str, numero: str, registro: str, depois_do_merge: bool) -> bool:
    """Confere um PR do item. Devolve True se é PR de implementação (False para a release base → release)."""
    campos = "number,state,baseRefName,headRefName,mergeCommit,statusCheckRollup,files"
    pr = gh_json("pr", "view", numero, "--json", campos)
    rotulo = f"PR #{pr['number']}"
    if pr["baseRefName"] == RELEASE and pr["headRefName"] == BASE:
        # PR de release (base → release): não é PR de implementação do item; confere só o merge e o CI
        checks = pr.get("statusCheckRollup") or []
        ok(
            pr["state"] == "MERGED" and checks and all(c.get("conclusion") == "SUCCESS" for c in checks),
            f"{rotulo}: release na {RELEASE} mesclada com o CI verde",
        )
        return False
    if depois_do_merge:
        ok(pr["state"] == "MERGED" and pr["baseRefName"] == BASE, f"{rotulo} mesclado na {BASE}")
    else:
        ok(pr["baseRefName"] == BASE, f"{rotulo} aponta para a {BASE}")
    checks = pr.get("statusCheckRollup") or []
    ruins = [c.get("name") for c in checks if c.get("conclusion") != "SUCCESS"]
    ok(checks and not ruins, f"{rotulo}: CI verde" + (f" (pendente ou falho: {', '.join(ruins)})" if ruins else ""))
    ok(iid.lower() in pr["headRefName"].lower(), f"{rotulo}: branch '{pr['headRefName']}' leva o ID")

    arquivos = [f["path"] for f in pr["files"]]
    if any(a.startswith(PASTAS_CODIGO) for a in arquivos):
        ok(any(a.startswith(PASTAS_TESTES) for a in arquivos), f"{rotulo}: muda {', '.join(PASTAS_CODIGO)} e traz testes")

    alterados = testes_alterados(pr)
    if alterados:
        relatorio = secao(registro, "Testes existentes alterados") or ""
        faltando = faltando_no_relatorio(alterados, relatorio, arquivos_de_teste())
        ok(
            not faltando,
            f"{rotulo}: relatório cita cada teste existente alterado"
            + (f" (faltam: {', '.join(faltando)})" if faltando else ""),
        )
        ok(
            re.search(r"Aprovado por:\s*\S+.*\d{4}-\d{2}-\d{2}", relatorio),
            f"{rotulo}: alteração de testes existentes aprovada pelo usuário (linha 'Aprovado por: <nome> em AAAA-MM-DD')",
        )
    return True


_CHECKLIST = re.compile(r"^## Checklist antes da revis[ãa]o\s*$", re.M)
_CAIXA = re.compile(r"^\s*(?:[-*+]|\d+\.)\s*\[(?P<marca>[^\]]*)\]\s*(?P<texto>.*)$")


def configuracao_esperada() -> dict:
    """Configuração de merge do repositório versionada em .github/repositorio.json (opcional)."""
    return json.loads((RAIZ / ".github/repositorio.json").read_text(encoding="utf-8"))


def divergencias_do_merge(atual: dict, esperado: dict) -> list[str]:
    """Campos da configuração do repositório diferentes do esperado; um campo ausente também diverge."""
    return [
        f"{campo}: {atual[campo] if campo in atual else 'ausente'} (esperado {valor})"
        for campo, valor in esperado.items()
        if atual.get(campo) != valor
    ]


def checklist_pendente(registro: str) -> list[str] | None:
    """Linhas da 'Checklist antes da revisão' sem resposta; None se o registro não tem a seção (registros antigos).

    Responder é marcar [x] (conferido) ou [-] (não se aplica). Uma seção sem nenhuma linha de checklist também
    conta como pendente.
    """
    achado = _CHECKLIST.search(registro)
    if not achado:
        return None
    corpo = registro[achado.end() :].split("\n## ", 1)[0]
    caixas = [m for m in map(_CAIXA.match, corpo.splitlines()) if m]
    if not caixas:
        return ["a seção não tem as linhas da checklist"]
    return [m["texto"].split(":", 1)[0][:60] for m in caixas if m["marca"].strip() not in ("x", "X", "-")]


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 1:
        print(__doc__)
        return 2
    iid = args[0].upper()
    depois = "--antes-do-merge" not in sys.argv

    item = item_do_backlog(iid)
    if not ok(item, f"{iid} existe no backlog"):
        return relatorio(iid)

    arq = RAIZ / f"docs/roadmap/execucao/{iid}.md"
    registro = arq.read_text(encoding="utf-8") if arq.exists() else ""
    if ok(registro, f"registro de execução {arq.relative_to(RAIZ)}"):
        for s in SECOES:
            corpo = (secao(registro, s[3:]) or "").strip()
            ok(corpo and "<!--" not in corpo[:4], f"registro: seção '{s[3:]}' preenchida")
        pendentes = checklist_pendente(registro)
        if pendentes is not None:
            ok(
                not pendentes,
                "registro: checklist antes da revisão respondida"
                + (f" (sem resposta: {'; '.join(pendentes)})" if pendentes else ""),
            )
        ok(
            auditoria_rodou(secao(registro, "Segurança") or ""),
            "registro: security-audit rodada e com resultado (sem 'não foi rodada' ou auditoria pendente)",
        )

    if depois:
        prs = [str(p).lstrip("#") for p in (item.get("links", {}) or {}).get("prs", []) or []]
        ok(item.get("status") == "done", f"{iid} está done (status: {item.get('status')})")
        ok(item.get("evidence"), f"{iid} tem evidências registradas")
        ok(prs, f"{iid} tem PR registrado em links.prs")
    else:
        branch = sh("git", "rev-parse", "--abbrev-ref", "HEAD").strip()
        abertos = gh_json("pr", "list", "--head", branch, "--state", "open", "--json", "number")
        prs = [str(p["number"]) for p in abertos]
        ok(prs, f"PR aberto para a branch {branch}")

    implementacao = 0
    for numero in prs:
        try:
            implementacao += conferir_pr(iid, numero, registro, depois)
        except RuntimeError as e:
            ok(False, f"PR #{numero}: {e}")
    if prs:
        ok(implementacao, f"{iid} tem pelo menos um PR de implementação (base {BASE}), além da release")

    if depois:
        issue = (item.get("links", {}) or {}).get("gh_issue")
        if ok(issue, f"{iid} ligado a uma issue"):
            estado = gh_json("issue", "view", str(issue), "--json", "state")["state"]
            ok(estado == "CLOSED", f"issue #{issue} fechada (estado: {estado})")
        sprint = item.get("sprint")
        if sprint:
            md = RAIZ / f"docs/roadmap/sprints/sprint-{int(sprint):02d}.md"
            acomp = (secao(md.read_text(encoding="utf-8"), "Acompanhamento") or "") if md.exists() else ""
            ok(cita_id(acomp, iid), f"acompanhamento da Sprint {sprint} cita {iid}")

    validar = subprocess.run(
        [
            "python3",
            str(Path.home() / ".claude/skills/_roadmap-shared/scripts/backlog.py"),
            "--root",
            str(RAIZ),
            "validate",
        ],
        capture_output=True,
        text=True,
    )
    ok(validar.returncode == 0, "backlog valida sem erros")

    if (RAIZ / ".github/repositorio.json").exists():
        # uma falha do gh ou do arquivo vira check reprovado, sem perder o relatório dos demais
        try:
            divergencias = divergencias_do_merge(gh_json("api", "repos/{owner}/{repo}"), configuracao_esperada())
        except (RuntimeError, OSError, ValueError) as e:
            divergencias = [f"não foi possível conferir: {e}"]
        ok(
            not divergencias,
            "repositório com o merge no padrão de .github/repositorio.json"
            + (f" ({'; '.join(divergencias)})" if divergencias else ""),
        )
    return relatorio(iid)


def relatorio(iid: str) -> int:
    falhas = [m for passou, m in resultados if not passou]
    print(f"DoD de {iid}: {len(resultados) - len(falhas)}/{len(resultados)} verificações")
    for passou, msg in resultados:
        print(f"  {'✓' if passou else '✗'} {msg}")
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
