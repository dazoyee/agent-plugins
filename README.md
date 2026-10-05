# agent-plugins

個人スキル集のプラグインマーケットプレイス。1つのリポジトリで Claude Code と Codex の両方に配布する。

## 構成

```
.claude-plugin/marketplace.json     Claude Code 用マーケットプレイス
.agents/plugins/marketplace.json    Codex 用マーケットプレイス
plugins/<plugin>/
  .claude-plugin/plugin.json        Claude Code 用マニフェスト
  .codex-plugin/plugin.json         Codex 用マニフェスト
  skills/<skill>/SKILL.md           スキル本体（Agent Skills 仕様）
```

プラグインは `dazoyee` の1つで、スキルは `/dazoyee:<skill>`（例: `/dazoyee:commit`）で呼び出す。

| スキル | Claude Code | Codex |
|---|---|---|
| ask-question | ○ | ○（変換役） |
| commit | ○ | ○ |
| task-orchestrator | ○ | ○（変換役） |
| browser-drive | ○ | ○ |
| playwright-cli | ○ | ○ |
| chezmoi-sync | ○ | ○（変換役） |
| devil-advocate | ○ | × |
| skill-stats | ○ | × |
| skill-design-review | ○ | × |

Codex に出すスキルは `plugins/dazoyee/.codex-plugin/plugin.json` の `skills` 配列で指定する。

Claude Code 専用のツールに依存するスキルは、`plugins/dazoyee/codex-skills/<skill>/SKILL.md` に Codex 用の変換役を置く。
変換役は `skills/<skill>/SKILL.md`（本体）を読ませたうえで、Claude Code 専用のツールを Codex のツールに読み替える対応表だけを持つ。
Claude Code は `skills/` だけを読み込むため、変換役は Claude Code の動作に影響しない。手順を変えるときは本体だけを直す。

ask-question の変換役は `request_user_input` を使う。Codex の通常モードで使うには `~/.codex/config.toml` の `[features]` に
`default_mode_request_user_input = true` が必要。

## インストール

### Claude Code

```sh
claude plugin marketplace add dazoyee/agent-plugins
claude plugin install dazoyee@dazoyee-agent-plugins
```

`~/.claude/settings.json` の `extraKnownMarketplaces` と `enabledPlugins` に登録しておくと、新しいマシンでも起動時に自動で取り込まれる。

### Codex

```sh
codex plugin marketplace add dazoyee/agent-plugins
codex plugin add dazoyee@dazoyee-agent-plugins
```

## 更新

マニフェストに `version` を書かない運用とし、commit SHA を版として扱う。push すれば更新対象になる。Codex は版を `local` と表示するが、`codex plugin marketplace upgrade` でインストール済みのプラグインまで更新される。

```sh
claude plugin marketplace update dazoyee-agent-plugins
codex plugin marketplace upgrade dazoyee-agent-plugins
```

## 開発

```sh
# 編集中のプラグインを読み込んで起動（変更は /reload-plugins で反映）
claude --plugin-dir ./plugins/dazoyee

# 検証
claude plugin validate .
claude plugin validate ./plugins/dazoyee
```

### スキルの追加

1. `plugins/dazoyee/skills/<skill>/SKILL.md` を作る。`name` はディレクトリ名と一致させる。Codex にも出す場合は `.codex-plugin/plugin.json` の `skills` 配列に追記する。
2. スキル同梱のファイルは `${CLAUDE_SKILL_DIR}` 起点で参照する。インストール時はプラグインディレクトリだけがキャッシュへコピーされるため、プラグイン外のファイルや `~/.claude/skills/...` の絶対パスは参照できない。
3. 状態や秘密情報はスキル内に置かない（`${CLAUDE_PLUGIN_DATA}` や環境変数を使う）。
