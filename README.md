# agent-plugins

個人スキル集のプラグインマーケットプレイス。1つのリポジトリで Claude Code と Codex の両方に配布する。

## 構成

```
.claude-plugin/marketplace.json     Claude Code 用マーケットプレイス
.agents/plugins/marketplace.json    Codex 用マーケットプレイス
plugins/<plugin>/
  .claude-plugin/plugin.json        Claude Code 用マニフェスト
  .codex-plugin/plugin.json         Codex 用マニフェスト（Codex に配布するプラグインのみ）
  skills/<skill>/SKILL.md           スキル本体（Agent Skills 仕様）
```

| プラグイン | スキル | Claude Code | Codex |
|---|---|---|---|
| workflow | ask-question, commit, task-orchestrator | ○ | - |
| browser | browser-drive, playwright-cli | ○ | ○ |
| dotfiles | chezmoi-sync | ○ | - |

プラグイン内のスキルは `/<plugin>:<skill>`（例: `/workflow:commit`）で呼び出す。

## インストール

### Claude Code

```sh
claude plugin marketplace add dazoyee/agent-plugins
claude plugin install workflow@dazoyee-agent-plugins
claude plugin install browser@dazoyee-agent-plugins
claude plugin install dotfiles@dazoyee-agent-plugins
```

`~/.claude/settings.json` の `extraKnownMarketplaces` と `enabledPlugins` に登録しておくと、新しいマシンでも起動時に自動で取り込まれる。

### Codex

```sh
codex plugin marketplace add dazoyee/agent-plugins
codex plugin add browser@dazoyee-agent-plugins
```

## 更新

マニフェストに `version` を書かない運用とし、commit SHA を版として扱う。push すれば更新対象になる。

```sh
claude plugin marketplace update dazoyee-agent-plugins
codex plugin marketplace upgrade dazoyee-agent-plugins
```

## 開発

```sh
# 編集中のプラグインを読み込んで起動（変更は /reload-plugins で反映）
claude --plugin-dir ./plugins/workflow

# 検証
claude plugin validate .
claude plugin validate ./plugins/workflow
```

### スキルの追加

1. `plugins/<plugin>/skills/<skill>/SKILL.md` を作る。`name` はディレクトリ名と一致させる。
2. スキル同梱のファイルは `${CLAUDE_SKILL_DIR}` 起点で参照する。インストール時はプラグインディレクトリだけがキャッシュへコピーされるため、プラグイン外のファイルや `~/.claude/skills/...` の絶対パスは参照できない。
3. 状態や秘密情報はスキル内に置かない（`${CLAUDE_PLUGIN_DATA}` や環境変数を使う）。

### プラグインの追加

1. `plugins/<plugin>/.claude-plugin/plugin.json` を作り、`.claude-plugin/marketplace.json` の `plugins` に追記する。
2. Codex にも配布する場合は `plugins/<plugin>/.codex-plugin/plugin.json`（`"skills": "./skills/"`）を作り、`.agents/plugins/marketplace.json` に追記する。
