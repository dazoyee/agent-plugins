---
name: asis-tobe
description: "これから行う変更を「項目 | As-Is | To-Be」の比較表でチャットに提示し、承認を得てから着手する。トリガー:「As-Is/To-Beで見せて」「asistobeで」「変更前後を整理して」「何がどう変わるか表で見せて」「Before/Afterで」。明示的に頼まれたときだけ使い、通常の変更依頼では使わない。"
---

# asis-tobe（Codex 用）

手順の本体は Claude Code 用のスキル `../../skills/asis-tobe/SKILL.md`（この SKILL.md のディレクトリ基準）にある。
最初にそのファイルを読み、書かれている手順・比較表の書き方・承認の取り方にそのまま従う。
ただし Claude Code 専用のツールは、次の対応表に従って読み替える。

## 読み替え表

| 本体の記述 | Codex での扱い |
|---|---|
| `AskUserQuestion` | `request_user_input` を使う |

## request_user_input の制約

- 各問の選択肢は2〜3個。本体の承認の選択肢（進める・修正したい・中止する）はそのまま収まる。
- 推奨案を先頭に置き、ラベル末尾に `(Recommended)` を付ける。「Other」は自動で付くので自分では足さない。
- `request_user_input` が使えない（「Default mode では使えない」と返る、`codex exec` で実行している等）ときは、
  同じ選択肢を番号付きの平文で示し、推奨案を明記してターンを終え、回答を待つ。回答が来るまで変更には着手しない。
