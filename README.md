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
| ask-question | ○ | - |
| commit | ○ | ○ |
| task-orchestrator | ○ | - |
| browser-drive | ○ | ○ |
| playwright-cli | ○ | ○ |
| chezmoi-sync | ○ | - |

Codex に出すスキルは `plugins/dazoyee/.codex-plugin/plugin.json` の `skills` 配列で指定する。

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

マニフェストに `version` を書かない運用とし、commit SHA を版として扱う。push すれば更新対象になる。

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
