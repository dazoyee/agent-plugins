---
name: ask-question
description: "計画・設計・要件について質問を重ねて認識合わせするスキル。未解決の確認事項がゼロになるまで構造化された質問を回し続ける。トリガー:「認識合わせして」「詰めて」「ask-question」。"
---

# ask-question（Codex 用）

手順の本体は Claude Code 用のスキル `../../skills/ask-question/SKILL.md`（この SKILL.md のディレクトリ基準）にある。
最初にそのファイルを読み、書かれている手順・質問の作法・終了条件にそのまま従う。
ただし Claude Code 専用のツールと仕組みは、次の対応表に従って読み替える。

## 読み替え表

| 本体の記述 | Codex での扱い |
|---|---|
| `AskUserQuestion` | `request_user_input` を使う |
| `ScheduleWakeup` による再開 | 使わない（代わりの仕組みがない）。チェックリストのファイルは残し、ユーザーが `$ask-question` を呼び直したら続きから再開する |
| scratchpad ディレクトリ | OS の一時ディレクトリ（`$TMPDIR`、Windows では `%TEMP%`）に `ask-question-checklist-<一意な ID>.md` を作り、そのパスを会話で示す |
| Grep / Read / Glob ツール | シェルの `rg` や `cat` などで調べる |
| `/dazoyee:ask-question` | `$ask-question` |

## request_user_input の制約

- 1回の呼び出しで聞けるのは最大3問、各問の選択肢は2〜3個。本体の「選択肢は2〜4個」は「2〜3個」と読み替える。
- 推奨案を先頭に置き、ラベル末尾に `(Recommended)` を付ける。「Other」は自動で付くので自分では足さない。
- 複数選択（multiSelect）はない。複数選択が自然な論点は、候補を番号付きで示して「当てはまる番号をすべて」と平文で聞く。
- `request_user_input` が使えない（「Default mode では使えない」と返る、`codex exec` で実行している等）ときは、
  同じ内容を番号付きの平文で質問し、推奨案を明記してターンを終え、回答を待つ。
