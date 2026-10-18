---
name: chezmoi-sync
description: "~/.claude のコア設定（CLAUDE.md・settings.json・rules・output-styles・scripts・hooks）を chezmoi source へ手動同期する。トリガー:「chezmoiを同期して」「chezmoiに反映して」「dot_claudeを最新化して」、~/.claude 変更後の反映依頼。"
---

# chezmoi-sync

`~/.claude` のコア設定（chezmoiが多マシン配布用に管理しているファイル）を
`~/.local/share/chezmoi/dot_claude/` へ同期する。対象は `scripts/sync.sh` の
`PAIRS` 配列が一次情報。

## 対象ファイル

| ~/.claude 側 | chezmoi側 (dot_claude/) |
|---|---|
| `CLAUDE.md` | `CLAUDE.md` |
| `settings.json` | `settings.json` |
| `rules/codex-delegation.md` | `rules/codex-delegation.md` |
| `rules/devil-advocate.md` | `rules/devil-advocate.md` |
| `rules/documentation.md` | `rules/documentation.md` |
| `rules/performance.md` | `rules/performance.md` |
| `rules/security.md` | `rules/security.md` |
| `scripts/sync-plans.sh` | `scripts/sync-plans.sh` |
| `hooks/codex-fallback-detect.mjs` | `hooks/executable_codex-fallback-detect.mjs` |

スキル・アーカイブ・セッションデータ等は対象外（chezmoi側では管理しない）。

## 手順

1. `bash "${CLAUDE_SKILL_DIR}/scripts/sync.sh"` を実行し、差分があるファイルを `dot_claude/` へコピーする
2. 更新があった場合、`git -C ~/.local/share/chezmoi diff -- dot_claude` で差分を表示する
3. 差分をConventional Commits形式で要約し、`git -C ~/.local/share/chezmoi add dot_claude && git -C ~/.local/share/chezmoi commit` でコミットする（push はしない）
4. 差分がなければ「同期済み」とだけ報告して終了する

## 注意

- push は行わない（ローカルコミットまで）
- 自動実行の仕組み（hook等）には組み込まない。必ず明示的な呼び出しでのみ動作する
- 対象ファイル一覧を変更した場合は `scripts/sync.sh` の `PAIRS` 配列も合わせて更新する
