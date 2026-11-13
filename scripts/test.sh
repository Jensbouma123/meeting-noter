#!/bin/sh
# Verification gate for `orchctl verify` (and humans): lint + typecheck + vitest.
#
# OrchestratorAI calls this script in two steps:
#   scripts/test.sh --compile-only [--app-first]  -> eslint + tsc --noEmit
#   scripts/test.sh --run-only [--filter EXPR]    -> vitest run [EXPR]
# With neither flag it runs every step. EXPR is a vitest file filter
# (a path substring such as `session-store` or `src/lib/meeting`).
set -eu

cd "$(dirname "$0")/.."

compile=1
run=1
filter=""
while [ $# -gt 0 ]; do
  case "$1" in
    --compile-only) run=0 ;;
    --run-only) compile=0 ;;
    --app-first) ;;
    --filter)
      [ $# -ge 2 ] || { echo "scripts/test.sh: --filter needs a value" >&2; exit 64; }
      filter="$2"
      shift
      ;;
    *) echo "scripts/test.sh: unknown argument: $1" >&2; exit 64 ;;
  esac
  shift
done

bin=node_modules/.bin

if [ "$compile" = 1 ]; then
  echo "== eslint"
  "$bin/eslint" .
  echo "== tsc --noEmit"
  "$bin/tsc" --noEmit -p tsconfig.json
fi

if [ "$run" = 1 ]; then
  echo "== vitest run ${filter}"
  if [ -n "$filter" ]; then
    "$bin/vitest" run "$filter"
  else
    "$bin/vitest" run
  fi
fi
