# CHANGELOG.md の標準構成

[Keep a Changelog 1.1.0](https://keepachangelog.com/ja/1.1.0/) をもとにする。
読み手は「版を上げるときに何が変わったかを知りたい利用者」。

## 節の構成

上から順に並べる。

| 節 | 書くこと |
|---|---|
| 冒頭の説明 | Keep a Changelog に準拠すること。Semantic Versioning に従う場合はその旨 |
| `## [Unreleased]` | 次の版に含める、利用者に影響する変更 |
| `## [版] - YYYY-MM-DD` | リリース済みの変更。日付は ISO 8601 形式で、新しい版から並べる |
| 比較リンクの定義 | 版間の差分へのリンク。remote の実 URL とタグを確認できた場合だけ記載する |

取り下げた版の見出しには末尾に ` [YANKED]` を付ける。
比較リンクは `[1.0.0]: https://example.com/compare/v0.9.0...v1.0.0` の形式で定義する。
URL のホストやタグを推測してリンクを作らない。

## 変更の種別

種別の見出しはツールが解析するため、英語のまま使う。
項目の本文はリポジトリで使われている言語に合わせ、利用者の言葉で書く。

| 見出し | 内容 |
|---|---|
| Added | 新機能 |
| Changed | 既存機能の変更 |
| Deprecated | 今後削除される機能 |
| Removed | 削除した機能 |
| Fixed | 不具合の修正 |
| Security | セキュリティ上の修正 |

## 作成を提案する条件

リリースがあるリポジトリにだけ CHANGELOG.md の作成を提案する。
リリースの有無は git タグ・マニフェストの版番号・GitHub Releases から確認する。
commit SHA を版として扱うなど、リリースの無いリポジトリでは提案しない。
版ごとの区切りが無いと Unreleased が際限なく伸び、読み手の役に立たないため。

## 自動生成との関係

release-please・semantic-release・changesets・git-cliff・conventional-changelog などの設定があれば、CHANGELOG.md を手で編集しない。
設定の例は `release-please-config.json`・`.releaserc*`・`.changeset/`・`cliff.toml`。
点検では設定と既存ファイルの書式が噛み合っているかだけを確認する。
手で編集すると、次の生成で上書きされたり項目が重複したりするため。

## [Unreleased] への項目追記

1. `git describe --tags --abbrev=0` で直近のタグを確認する。
2. 直近のタグから HEAD までの `git log` を読み、利用者に影響する変更だけを6種に振り分ける。
3. 利用者の言葉で1行ずつ書く。コミットの件名をそのまま転記しない。Keep a Changelog はコミットログの差分を雑音として扱う。
4. refactor・test・ci・docs など、利用者に見えない変更は載せない。
5. 破壊的変更・非推奨・削除は必ず載せる。
6. 既に載っている項目と重複させない。

## 置かないもの

- 使い方 → README.md
- 開発手順 → CONTRIBUTING.md
- リリース手順 → CONTRIBUTING.md の「リリース」
- コミットの一覧そのもの

## チェックリスト

- [ ] 冒頭で Keep a Changelog 準拠を示し、Semantic Versioning を使う場合はその旨を書いている
- [ ] `## [Unreleased]` が先頭にある
- [ ] リリース済みの版が新しい順に並んでいる
- [ ] 日付が ISO 8601 形式になっている
- [ ] 種別の見出しが Added・Changed・Deprecated・Removed・Fixed・Security のいずれかになっている
- [ ] 取り下げた版に ` [YANKED]` を付けている
- [ ] 比較リンクがある場合、remote の実 URL とタグを確認でき、リンク先が実在する
- [ ] 版見出しと git タグが一致している
- [ ] 自動生成の設定がある場合、手編集の跡がなく、設定と既存ファイルの書式が噛み合っている
- [ ] 利用者に見えない変更やコミット件名の転記がない
- [ ] 破壊的変更・非推奨・削除を記載している
- [ ] README.md・CONTRIBUTING.md と役割が重複していない
