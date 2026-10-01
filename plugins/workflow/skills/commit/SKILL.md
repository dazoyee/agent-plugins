---
name: commit
description: "変更を Conventional Commits 形式でコミットする。分析→メッセージ生成→ステージング→コミットを一連で実行。トリガー:「コミットして」「変更をコミット」/workflow:commit。"
---

# コミットスキル

変更中のソースをコミットします。

## 使い方

`/workflow:commit [message]`

- `message` (オプション): コミットメッセージ。省略時は自動生成。

## ワークフロー

```
[Start] --> git status で変更確認
   |
[Analysis] --> 変更ファイルと差分を分析
   |
[Message] --> Conventional Commits 形式でメッセージ生成
   |
[Stage] --> 関連ファイルをステージング
   |
[Commit] --> コミット実行
   |
[Verify] --> git status で完了確認
```

## 実行手順

### 1. 変更状況の確認

以下のコマンドを並列で実行:

```bash
git status
git diff --name-only
git diff --staged --name-only
git log --oneline -5
```

### 2. 変更内容の分析

- `git diff HEAD` で変更内容を詳細に分析
- 変更の種類を判定:
  - `feat`: 新機能
  - `fix`: バグ修正
  - `refactor`: リファクタリング（機能変更なし）
  - `docs`: ドキュメントのみの変更
  - `test`: テストの追加・修正
  - `style`: フォーマットのみの変更（動作に影響しない空白・整形等）
  - `perf`: パフォーマンス改善
  - `build`: ビルドシステム・外部依存関係の変更
  - `ci`: CI/CD 設定の変更
  - `revert`: 過去のコミットの取り消し
  - `chore`: 上記に該当しない補助的な変更（設定・雑務等）
- 無関係な変更が混在している場合は、1コミット＝1論理変更となるよう複数コミットに分割する

### 3. 機密ファイルのチェック

以下のファイルはコミットしない:

- `.env`, `.env.*`
- `*credentials*`, `*secrets*`
- `*.pem`, `*.key`
- `application-local.yml`

該当ファイルが含まれている場合は警告を表示し、除外する。

### 4. コミットメッセージの生成

Conventional Commits 形式:

```
<type>(<scope>): <description>

<optional body>

<optional footer>
```

- 変更内容を分析して適切な type を選択
- scope は変更対象の領域（例: `skills`, `settings`, `hooks`）。既存履歴の scope に合わせ、特定できない場合は省略可
- description（件名行）の規則:
  - 命令形・現在形で書く（英語なら "add"、日本語なら「〜する」）
  - 末尾にピリオド・句点を付けない
  - 英語の場合は小文字始まり
  - 50文字以内を目安に簡潔に
- body は変更の WHY を中心に記載し、72桁で折り返す
- 破壊的変更（後方互換性を壊す変更）がある場合は type の直後に `!` を付け、
  footer に `BREAKING CHANGE: <説明>` を記載する（例: `feat(api)!: ...`）
- 日本語でも英語でも可（既存のコミット履歴に合わせる）

### 5. ステージングとコミット

```bash
# ファイルを明示的にステージング（git add -A は使用しない）
git add <file1> <file2> ...

# コミット（HEREDOC形式でメッセージを渡す）
git commit -m "$(cat <<'EOF'
<type>(<scope>): <description>

<body>

Co-Authored-By: Claude <実行中のモデル名> <noreply@anthropic.com>
EOF
)"

# 完了確認
git status
```

## 注意事項

- `git add -A` や `git add .` は使用しない（意図しないファイルのコミットを防ぐ）
- `--amend` は使用しない（前のコミットを上書きしない）
- pre-commit hook が失敗した場合は問題を修正して新規コミットを作成
- 機密情報を含むファイルは絶対にコミットしない

## 引数

$ARGUMENTS:

- `<message>` (オプション): コミットメッセージを直接指定
