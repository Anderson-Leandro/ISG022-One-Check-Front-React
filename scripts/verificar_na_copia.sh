#!/usr/bin/env bash
# Roda a verificação (build, lint e testes) numa cópia do projeto sem o arquivo de segredos (TK-001).
#
# - copia o projeto para <dir>/proj sem o arquivo de segredos e variantes (salvo o .env.example), as notas
#   locais, o node_modules, o dist, o .git e as pastas locais fora do git. A cópia acompanha a origem
#   (rsync --delete), e um arquivo excluído que já estivesse na cópia também sai (--delete-excluded);
# - instala como o CI: npm ci pelo package-lock.json. O node_modules da cópia é reaproveitado e só é
#   refeito quando o package.json ou o package-lock.json mudam;
# - roda npm run build, npm run lint e npm test na cópia. Com argumentos, roda só o vitest com eles.
#
# Uso: bash scripts/verificar_na_copia.sh <dir> [argumentos do vitest]
#      bash scripts/verificar_na_copia.sh --so-copiar <dir>     (só atualiza a cópia)
# <dir> fica fora do projeto, por exemplo no scratchpad. Variável: ORIGEM (padrão: a raiz do projeto).
set -euo pipefail

SO_COPIAR=""
ARGS=()
for a in "$@"; do
  if [ "$a" = "--so-copiar" ]; then SO_COPIAR=1; else ARGS+=("$a"); fi
done
set -- "${ARGS[@]+"${ARGS[@]}"}"
if [ -z "${1:-}" ]; then
  echo "uso: bash scripts/verificar_na_copia.sh [--so-copiar] <dir> [argumentos do vitest]" >&2
  exit 2
fi
DESTINO="$(realpath -m "$1")"
shift
ORIGEM="$(realpath "${ORIGEM:-$(dirname "$0")/..}")"

# O destino não pode ficar dentro do projeto, nem conter o projeto: o rsync --delete apagaria a origem
case "$DESTINO/" in
  "$ORIGEM"/*)
    echo "o destino ($DESTINO) não pode ficar dentro do projeto ($ORIGEM)" >&2
    exit 2
    ;;
esac
case "$ORIGEM/" in
  "$DESTINO"/*)
    echo "o destino ($DESTINO) não pode conter o projeto ($ORIGEM)" >&2
    exit 2
    ;;
esac

mkdir -p "$DESTINO/proj"
# o node_modules da cópia é protegido (P): não vem da origem e não é apagado pelo --delete-excluded
rsync -a --delete --delete-excluded \
  --filter "P /node_modules/" --filter "P /.requisitos" \
  --include ".env.example" --exclude ".env" --exclude ".env.*" --exclude "*.env" --exclude ".envrc" --exclude "*.local" \
  --exclude "MUDANCAS_DE_CONTRATO.md" --exclude "PENDENCIAS_API.md" --exclude "PLANO_*.md" \
  --exclude "ACHADOS_PENDENTES_DA_REVISAO.md" --exclude "/referencia_api" --exclude "/testes-de-api" \
  --exclude "/node_modules" --exclude "/dist" --exclude ".git" --exclude "*.tsbuildinfo" \
  "$ORIGEM/" "$DESTINO/proj/"
[ -n "$SO_COPIAR" ] && exit 0

cd "$DESTINO/proj"
REQUISITOS="$(cat package.json package-lock.json | sha256sum | cut -d' ' -f1)"
if [ "$(cat .requisitos 2>/dev/null || true)" != "$REQUISITOS" ] || [ ! -x node_modules/.bin/vitest ]; then
  npm ci --no-audit --no-fund
  echo "$REQUISITOS" > .requisitos
fi

if [ "$#" -gt 0 ]; then
  exec npx vitest run --dir src "$@"
fi
npm run build
npm run lint
npm test
