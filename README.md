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

devil-advocate は決定が確定すると自動で起動し、Codex CLI でレビューする。`codex` が PATH にあり、`codex login` でログイン済みであることが前提。Codex が使えないときは Claude がレビューし、結果の最終行に理由を示す。

## mod（Claude Code 専用）

mod は Claude Code の画面や動作に割り込む関数フックのプラグインで、1 mod を 1 プラグインとして配布する。Codex には配布しない。

| プラグイン | コマンド | 内容 |
|---|---|---|
| tool-calls | `/tool-calls` | ツール呼び出しを成功・失敗・拒否と所要時間つきでライブ表示するペイン。行を押すと入力と結果の先頭を展開する |
| turn-band | `/turn-band` | プロンプトの上に、直前のターンの所要時間・ツール回数・出力トークン・キャッシュヒット率と、キャッシュ失効までの推定残り時間、セッション累計を表示する。120 秒を超えたターン、ヒット率の急落、1 時間 TTL の失効 5 分前はトーストでも知らせる |

mod の API は早期アクセス版で、Claude Code の更新で動かなくなることがある。

## インストール

### Claude Code

```sh
claude plugin marketplace add dazoyee/agent-plugins
claude plugin install dazoyee@dazoyee-agent-plugins

# mod は必要なものだけ入れる
claude plugin install tool-calls@dazoyee-agent-plugins
claude plugin install turn-band@dazoyee-agent-plugins
```

`~/.claude/settings.json` の `extraKnownMarketplaces` と `enabledPlugins` に登録しておくと、新しいマシンでも起動時に自動で取り込まれる。

### Codex

```sh
codex plugin marketplace add dazoyee/agent-plugins
codex plugin add dazoyee@dazoyee-agent-plugins
```

## 更新

push された commit がそのまま新しい版として配布される。次のコマンドで取り込む。

```sh
# Claude Code
claude plugin marketplace update dazoyee-agent-plugins
claude plugin update dazoyee@dazoyee-agent-plugins
claude plugin update tool-calls@dazoyee-agent-plugins
claude plugin update turn-band@dazoyee-agent-plugins

# Codex
codex plugin marketplace upgrade dazoyee-agent-plugins
```

Claude Code の `claude plugin marketplace update` が更新するのはマーケットプレイスの一覧だけで、インストール済みのプラグインは `claude plugin update` で更新する。反映には再起動か `/reload-plugins` が必要。
Codex は版を `local` と表示するが、`codex plugin marketplace upgrade` でインストール済みのプラグインまで更新される。

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

スキルや mod の追加・変更の手順は [CONTRIBUTING.md](CONTRIBUTING.md) を参照する。

## ライセンス

リポジトリは [MIT License](LICENSE) に従う。
ただし plugins/dazoyee/skills/playwright-cli/ は microsoft/playwright-cli を改変したもので、同ディレクトリの LICENSE に記載する Apache License 2.0 に従う。
