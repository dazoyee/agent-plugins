---
name: chezmoi-sync
description: "~/.claude のコア設定（CLAUDE.md・rules・settings.json・agents 等）を chezmoi source へ手動同期する。トリガー:「chezmoiを同期して」「chezmoiに反映して」「dot_claudeを最新化して」、~/.claude 変更後の反映依頼。"
---

# chezmoi-sync（Codex 用）

手順の本体は Claude Code 用のスキル `../../skills/chezmoi-sync/SKILL.md`（この SKILL.md のディレクトリ基準）にある。
最初にそのファイルを読み、対象ファイル・手順・注意にそのまま従う。

本体に出てくる `${CLAUDE_SKILL_DIR}` は、本体の SKILL.md があるディレクトリ（この SKILL.md から見て `../../skills/chezmoi-sync`）と読み替える。
同期スクリプトは `bash "<そのディレクトリ>/scripts/sync.sh"` で実行する。
