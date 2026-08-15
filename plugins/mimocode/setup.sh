#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# config dir follows mimo's base-dir resolution: MIMOCODE_HOME overrides all
# base dirs (config lives at <home>/config), otherwise XDG, else the default
if [ -n "${MIMOCODE_HOME:-}" ]; then
    MIMOCODE_CONFIG="$MIMOCODE_HOME/config"
elif [ -n "${XDG_CONFIG_HOME:-}" ]; then
    MIMOCODE_CONFIG="$XDG_CONFIG_HOME/mimocode"
else
    MIMOCODE_CONFIG="$HOME/.config/mimocode"
fi

copy_file() {
  local src="$1"
  local dst="$2"
  local make_exec="${3:-}"

  if [[ ! -f "$src" ]]; then
    echo "ERROR: source file not found: $src" >&2
    return 1
  fi

  cp "$src" "$dst"
  [[ "$make_exec" == "exec" ]] && chmod +x "$dst"
  echo "Copied ${src#"$REPO_ROOT"/} -> $dst"
}

mkdir -p "$MIMOCODE_CONFIG/tools"
mkdir -p "$MIMOCODE_CONFIG/commands"
mkdir -p "$MIMOCODE_CONFIG/plugin"

errors=0

copy_file "$REPO_ROOT/.claude-plugin/skills/revdiff/scripts/launch-revdiff.sh"  "$MIMOCODE_CONFIG/tools/launch-revdiff.sh" exec || ((errors++))
copy_file "$REPO_ROOT/plugins/revdiff-planning/scripts/launch-plan-review.sh"   "$MIMOCODE_CONFIG/plugin/launch-plan-review.sh" exec || ((errors++))
copy_file "$SCRIPT_DIR/commands/revdiff.md"  "$MIMOCODE_CONFIG/commands/revdiff.md" || ((errors++))
copy_file "$SCRIPT_DIR/tools/revdiff.ts"     "$MIMOCODE_CONFIG/tools/revdiff.ts" || ((errors++))
copy_file "$SCRIPT_DIR/plugin/revdiff-plan-review.ts"   "$MIMOCODE_CONFIG/plugin/revdiff-plan-review.ts" || ((errors++))

# No config registration needed: mimo auto-discovers tools/, commands/ and
# plugin/ under the config dir.

if ((errors > 0)); then
  echo "Done with $errors error(s)." >&2
  exit 1
fi

echo "Done."
echo "Restart mimo — the tool, command and plan-review plugin are loaded at startup."
