# AGENTS.md

Claude Code と Codex に配布する個人スキル集のプラグインマーケットプレイス。
利用方法は [README.md](README.md)、構成と開発手順は [CONTRIBUTING.md](CONTRIBUTING.md) を参照する。

## 開発と検証

検証の手順は CONTRIBUTING.md の「検証」に従う。
変更後は少なくとも次の2つを通してから完了とする。CI が同じ検査を行い、通らない commit は利用者にそのまま配布されてしまうため。

```sh
claude plugin validate .
claude plugin validate ./plugins/dazoyee
```

Codex 用のマニフェストを変えたときは、「検証」にある `jq` の2つの検査も通す。

## 変更の種類ごとに読む節

次の約束は CONTRIBUTING.md にある。破っても検証が通ることがあり、気づかれにくいので、該当する変更では作業前に読む。

- マニフェスト（`plugin.json`・`marketplace.json`）を編集する、または `claude plugin validate` の `version` の警告を直そうとする → 「版の扱い」
- スキルを追加・削除・改名する → 「スキルの追加」。Codex 用マニフェスト・両方の `description`・README のスキル一覧の更新を漏らしやすい
- `codex-skills/` の変換役を編集する → 「Codex への配布」

## コミット

CONTRIBUTING.md の「コミットメッセージ」に従う。
