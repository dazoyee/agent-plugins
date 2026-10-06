# CONTRIBUTING

agent-plugins にスキルを追加・変更するための手順をまとめる。

## 構成

```
.claude-plugin/marketplace.json     Claude Code 用マーケットプレイス
.agents/plugins/marketplace.json    Codex 用マーケットプレイス
plugins/<plugin>/
  .claude-plugin/plugin.json        Claude Code 用マニフェスト
  .codex-plugin/plugin.json         Codex 用マニフェスト
  skills/<skill>/SKILL.md           スキル本体（Agent Skills 仕様）
  codex-skills/<skill>/SKILL.md     Codex 用の変換役
  agents/<agent>.md                 Claude Code 用のサブエージェント定義
```

## Codex への配布

Codex に出すスキルは `plugins/dazoyee/.codex-plugin/plugin.json` の `skills` 配列で指定する。

Claude Code 専用のツールに依存するスキルは、`plugins/dazoyee/codex-skills/<skill>/SKILL.md` に Codex 用の変換役を置く。
変換役は `skills/<skill>/SKILL.md`（本体）を読ませたうえで、Claude Code 専用のツールを Codex のツールに読み替える対応表だけを持つ。
Claude Code は `skills/` だけを読み込むため、変換役は Claude Code の動作に影響しない。手順を変えるときは本体だけを直す。

## 版の扱い

マニフェストに `version` を書かず、commit SHA を版として扱う。push した commit がそのまま利用者への更新になる。
`plugin.json` とマーケットプレイスのエントリのどちらかに `version` を書くと、新しい commit が更新として検出されなくなる。
`claude plugin validate` は `version` が無いと警告を出すが、この運用では想定どおりの警告なので、`version` を足さない。

## 開発環境

```sh
# 編集中のプラグインを読み込んで起動（変更は /reload-plugins で反映）
claude --plugin-dir ./plugins/dazoyee
```

## 検証

CI（`.github/workflows/validate.yml`）は push と pull request のたびに次の検査を行う。push する前に同じ検査を通す。

```sh
# マーケットプレイスとプラグインの検証
claude plugin validate .
claude plugin validate ./plugins/dazoyee

# Codex 用のマニフェストが JSON として正しいこと
jq empty .agents/plugins/marketplace.json plugins/dazoyee/.codex-plugin/plugin.json

# Codex 用マニフェストの skills が実在するスキルを指していること（何も出力されなければよい）
# Windows の jq は CRLF で出力するため、tr で \r を落とす
jq -r '.skills[]' plugins/dazoyee/.codex-plugin/plugin.json | tr -d '\r' | while read -r s; do [ -f "plugins/dazoyee/$s/SKILL.md" ] || echo "missing: $s"; done
```

## スキルの追加

1. `plugins/dazoyee/skills/<skill>/SKILL.md` を作る。`name` はディレクトリ名と一致させる。
2. スキル同梱のファイルは `${CLAUDE_SKILL_DIR}` 起点で参照する。インストール時はプラグインディレクトリだけがキャッシュへコピーされるため、プラグイン外のファイルや `~/.claude/skills/...` の絶対パスは参照できない。
3. 状態や秘密情報はスキル内に置かない（`${CLAUDE_PLUGIN_DATA}` や環境変数を使う）。
4. Codex にも出す場合は `.codex-plugin/plugin.json` の `skills` 配列に追記する。Claude Code 専用のツールに依存するスキルは、「Codex への配布」に従って変換役を置き、そのパスを追記する。
5. `.claude-plugin/plugin.json` と `.codex-plugin/plugin.json` の `description`、README のスキル一覧を更新する。
6. 「検証」の検査を通す。

## コミットメッセージ

[Conventional Commits](https://www.conventionalcommits.org/ja/) の形式で、件名は日本語で「〜する」と書く。

```text
feat: 変更前後を比較表で提示する asis-tobe スキルを追加する
docs: README のスキル一覧に asis-tobe を追加する
```
