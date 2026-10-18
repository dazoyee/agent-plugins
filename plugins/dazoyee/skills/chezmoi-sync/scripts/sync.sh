#!/bin/bash
# ~/.claude のコア設定（常時ロード対象のみ）を chezmoi source (dot_claude/) へ手動同期する。
# 自動実行はしない。~/.claude 側の変更が一段落したタイミングで手動実行すること。
set -euo pipefail

SRC="$HOME/.claude"
DST="$HOME/.local/share/chezmoi/dot_claude"

declare -a PAIRS=(
  "CLAUDE.md:CLAUDE.md"
  "settings.json:settings.json"
  "rules/codex-delegation.md:rules/codex-delegation.md"
  "rules/devil-advocate.md:rules/devil-advocate.md"
  "rules/documentation.md:rules/documentation.md"
  "rules/performance.md:rules/performance.md"
  "rules/security.md:rules/security.md"
  "scripts/sync-plans.sh:scripts/sync-plans.sh"
  "hooks/codex-fallback-detect.mjs:hooks/executable_codex-fallback-detect.mjs"
)

changed=0
for pair in "${PAIRS[@]}"; do
  src_rel="${pair%%:*}"
  dst_rel="${pair#*:}"
  src="$SRC/$src_rel"
  dst="$DST/$dst_rel"
  if [ ! -f "$src" ]; then
    echo "SKIP (source missing): $src_rel"
    continue
  fi
  if ! diff -q "$src" "$dst" > /dev/null 2>&1; then
    echo "UPDATE: $src_rel -> $dst_rel"
    mkdir -p "$(dirname "$dst")"
    cp "$src" "$dst"
    changed=$((changed + 1))
  fi
done

echo ""
if [ "$changed" -eq 0 ]; then
  echo "差分なし。chezmoi source は最新です。"
else
  echo "$changed 件を更新しました。以下でレビューしてコミットしてください:"
  echo "  git -C ~/.local/share/chezmoi diff -- dot_claude"
  echo "  git -C ~/.local/share/chezmoi add dot_claude && git -C ~/.local/share/chezmoi commit"
fi
