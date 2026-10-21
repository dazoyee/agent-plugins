#!/bin/bash
# Codex に反証レビューさせ、VERDICT 形式の結果を標準出力に書く
# 失敗時は理由を標準エラーに1行出して非0で終了する（呼び出し側が Claude でのレビューに切り替える）
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
TIMEOUT="${DEVIL_ADVOCATE_TIMEOUT:-540}"
# codex がないと perl の exec が失敗しても 0 で終わり理由が分からなくなるため、先に確かめる
if ! command -v codex > /dev/null 2>&1; then
  echo "codex が見つからない（codex CLI が PATH にない）" >&2
  exit 1
fi
TMP="$(mktemp -d "${TMPDIR:-/tmp}/devil-advocate.XXXXXX")"
trap 'rm -rf "$TMP"' EXIT

node "$DIR/extract.mjs" > "$TMP/excerpt"
if grep -Fxq 'レビュー対象なし' "$TMP/excerpt"; then
  echo "レビュー対象なし" >&2
  exit 1
fi

CWD="$(sed -n '1s/^作業ディレクトリ: //p' "$TMP/excerpt")"
[[ -n "$CWD" && -d "$CWD" ]] || CWD="$(pwd)"
cat "$DIR/prompt.md" "$TMP/excerpt" > "$TMP/prompt"

# macOS に timeout コマンドがないため perl の alarm で打ち切る
STATUS=0
perl -e 'alarm shift; exec @ARGV' "$TIMEOUT" \
  codex exec -s read-only -C "$CWD" --skip-git-repo-check --ephemeral -o "$TMP/out" - \
  < "$TMP/prompt" > /dev/null 2> "$TMP/err" || STATUS=$?

if [[ "$STATUS" -eq 142 ]]; then
  echo "codex タイムアウト（${TIMEOUT}秒）" >&2
  exit 1
elif [[ "$STATUS" -ne 0 ]]; then
  echo "codex 終了コード $STATUS: $(tail -n 1 "$TMP/err" | cut -c1-200)" >&2
  exit 1
fi
FIRST="$(awk 'NF { gsub(/^[[:space:]`*]+|[[:space:]`*]+$/, ""); print; exit }' "$TMP/out" 2>/dev/null || true)"
if [[ "$FIRST" != "VERDICT: NO_ISSUES" && "$FIRST" != "VERDICT: ISSUES" ]]; then
  echo "codex の出力形式不正" >&2
  exit 1
fi
cat "$TMP/out"
