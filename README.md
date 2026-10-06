# agent-plugins

個人スキル集のプラグインマーケットプレイス。1つのリポジトリで Claude Code と Codex の両方に配布する。

## スキル

プラグインは `dazoyee` の1つで、スキルは `/dazoyee:<skill>`（例: `/dazoyee:commit`）で呼び出す。

| スキル | Claude Code | Codex |
|---|---|---|
| ask-question | ○ | ○（変換役） |
| asis-tobe | ○ | ○（変換役） |
| commit | ○ | ○ |
| repo-docs | ○ | ○ |
| task-orchestrator | ○ | ○（変換役） |
| browser-drive | ○ | ○ |
| playwright-cli | ○ | ○ |
| chezmoi-sync | ○ | ○（変換役） |
| devil-advocate | ○ | × |
| skill-stats | ○ | × |
| skill-design-review | ○ | × |

「○（変換役）」のスキルは、Claude Code 専用のツールを Codex のツールに読み替えて動く。

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

push された commit がそのまま新しい版として配布される。次のコマンドで取り込む。Codex は版を `local` と表示するが、`codex plugin marketplace upgrade` でインストール済みのプラグインまで更新される。

```sh
claude plugin marketplace update dazoyee-agent-plugins
codex plugin marketplace upgrade dazoyee-agent-plugins
```

### Claude Code の自動更新

サードパーティのマーケットプレイスは自動更新が既定でオフで、`marketplace.json` からはオンにできない。利用者側で次のどちらかを設定する。

- `/plugin` の Marketplaces タブで `dazoyee-agent-plugins` を選び、Enable auto-update を選ぶ
- `~/.claude/settings.json` の `extraKnownMarketplaces` のエントリに `"autoUpdate": true` を書く

```json
{
  "extraKnownMarketplaces": {
    "dazoyee-agent-plugins": {
      "source": { "source": "github", "repo": "dazoyee/agent-plugins" },
      "autoUpdate": true
    }
  }
}
```

自動更新はセッションで最初のメッセージを送った後、バックグラウンドで実行される。実行中のセッションへの反映は `/reload-plugins` を使い、次回起動時には自動で新しい版が読み込まれる。

## 貢献

スキルの追加や変更の手順は [CONTRIBUTING.md](CONTRIBUTING.md) を参照する。
