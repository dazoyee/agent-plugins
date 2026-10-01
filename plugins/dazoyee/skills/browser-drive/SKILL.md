---
name: browser-drive
description: "playwright-cli で実ブラウザを操作して作業を代行・情報取得する。ログインが必要な社内システムの画面から値を拾う、フォーム入力や登録の定型作業を回す、複数ページを巡回して内容をまとめる、認証状態を保存して使い回す、スクリーンショットを撮る、といったブラウザ越しの作業全般を担う。トリガー:「ブラウザで〜して」「ログインして〜を取ってきて」「画面から〜を拾って」「〜にアクセスして中身を見て」「フォームに入力して送信して」「スクショを撮って」「画面を操作して」。URL と『ブラウザ越しでないと取れない情報・できない操作』が読み取れたら、ユーザーが playwright と明示しなくても必ずこのスキルを使う。WebFetch で取れない（ログイン必須・JS描画・操作が必要）ものは特にこのスキルの領分。「動作確認して」「画面が正しく表示されるか確認して」「表示崩れがないか見て」「ちゃんと動くか確かめて」のような画面の動作確認・不具合調査も同じくこのスキルで扱う。"
compatibility:
  requires:
    - playwright-cli (npm i -g @playwright/cli)
---

# ブラウザ操作スキル

`playwright-cli` で実ブラウザを駆動し、ユーザーの代わりに画面を操作して結果を返す。

**このスキルの守備範囲**は「ブラウザ越しでないと成立しない作業」。ログイン後の画面から値を
取る、JS で描画される内容を読む、フォームを埋めて送る、画面を撮る。逆に、認証不要で
静的に取れる HTML や JSON API を読むだけなら `WebFetch` や `curl` の方が速いので、
ブラウザを起こす必要はない。

---

## まず知っておくべき3つの落とし穴

この CLI は素直に見えて、知らないと確実に事故る癖が3つある。ここを外すと「動いたように
見えて何も確認できていない」状態に陥るので、最初に頭に入れる。

### 1. 失敗しても終了コードは 0

セレクタが1つも一致しなくても、JS が例外を投げても、`playwright-cli` は exit 0 を返し、
標準出力に `### Error` と書くだけで終わる。

```
$ playwright-cli click "#nope"
### Error
Error: "#nope" does not match any elements.
$ echo $?
0
```

つまり `set -e` は何も守ってくれない。**成否は毎回、出力そのものを読んで判断する**。
シェルスクリプトに束ねる場合も、出力を変数に取って `### Error` を検査する形にしないと
「全ステップ成功」と嘘をつくスクリプトができあがる。

```bash
out=$(playwright-cli click "#submit" 2>&1)
case "$out" in *"### Error"*) echo "NG: $out"; exit 1 ;; esac
```

### 2. ref は使い捨て、セレクタは資産

`click` / `fill` / `hover` などの `<target>` は、snapshot が返す ref（`e6` など）でも
CSS/Playwright セレクタでも受け付ける。

ref は snapshot を撮り直すたびに振り直される番号なので、**その snapshot を読んだ直後の
1操作にしか使えない**。あとで再現したい・人に見せたい・スクリプトに残したい操作は
セレクタで書く。ref をスクリプトに焼き込むと、次の実行では別の要素を指すか、何も指さない。

```bash
# 探索中（snapshot を読んだ直後）— ref が速い
playwright-cli click e6

# 残す操作 — セレクタで書く
playwright-cli click "text=ログイン"
playwright-cli fill "#username" "$APP_USER"
```

### 3. ブラウザは常駐セッション

`open` するとブラウザプロセスが常駐し、以降の CLI 呼び出しはそのセッションに接続する。
`close` を忘れるとゾンビが残り、次回の操作が前回の状態を引きずる。

```bash
playwright-cli list        # 生きているセッションを確認
playwright-cli close       # 現在のセッションを閉じる
playwright-cli close-all   # 全部閉じる
playwright-cli kill-all    # 応答しないゾンビを強制終了
```

作業の頭で `list` を見て想定外のセッションが残っていないか確認し、終わりに必ず閉じる。
別作業を並行させたいときは `-s=<名前>` でセッションを分ける（`playwright-cli -s=sub open ...`）。

---

## 基本の進め方

1回の操作ごとに応答を読んで次を決める、対話ループが基本形。**先にスクリプトを書き切って
一気に流すのは避ける** — 画面がどう出るか分からないうちに書いた手順は、まず当たらない。

```bash
# 1. 開く（--headed で人が見られる。既定はヘッドレス）
playwright-cli open "https://example.internal/login" --headed

# 2. 構造を見て操作対象を特定する
playwright-cli snapshot

# 3. 操作する（応答に遷移後の URL / Title / snapshot が付いてくる）
playwright-cli fill "#username" "$APP_USER"
playwright-cli fill "#password" "$APP_PASS"
playwright-cli click "text=ログイン"

# 4. 目的の情報を取る
playwright-cli --raw eval "() => document.querySelector('.total').textContent"

# 5. 閉じる
playwright-cli close
```

`open` や `click` の応答には遷移後の **Page URL / Page Title / Snapshot** が既に含まれる。
操作のたびに `snapshot` を打ち直す必要はない。応答を読めば今どこにいるか分かる。

### 主要コマンド早見表

| やること | コマンド |
|---------|---------|
| 開く / 遷移 | `open [url] [--headed] [--browser=chrome\|firefox\|webkit\|msedge]` / `goto <url>` |
| 構造を見る | `snapshot [element] [--depth N]` |
| クリック | `click <target>` / `dblclick <target>` |
| 入力 | `fill <target> <text> [--submit]` / `type <text>` / `press <key>` |
| 選択 | `select <target> <val>` / `check <target>` / `uncheck <target>` |
| ファイル添付 | `upload <file>` |
| 値を取る | `eval "() => ..."` （`--raw` で値だけ） |
| 撮る | `screenshot [target] [--filename=x.png] [--full-page]` / `pdf` |
| 履歴 | `go-back` / `go-forward` / `reload` |
| タブ | `tab-list` / `tab-new [url]` / `tab-select <index>` / `tab-close` |
| ダイアログ | `dialog-accept [prompt]` / `dialog-dismiss` |
| 表示サイズ | `resize <w> <h>` |
| 閉じる | `close` / `close-all` / `kill-all` |

`--raw` を付けると装飾なしで値だけが返るので、シェル変数に入れる用途はこれを使う。

---

## 情報を取り出す

目的が「値を持ち帰る」なら、snapshot を丸ごと読むより `eval --raw` で狙い撃ちする方が
速くて正確。snapshot はページ全体のアクセシビリティツリーなので、大きい画面では読むコストが
高い。

```bash
# 単一の値
playwright-cli --raw eval "() => document.querySelector('#balance').textContent.trim()"

# 表を構造化して取る（JSON で受けて jq に流せる）
playwright-cli --raw eval "() => [...document.querySelectorAll('table tbody tr')].map(tr => [...tr.cells].map(td => td.textContent.trim()))"
```

一覧の件数や存在確認だけなら `eval` の方が snapshot より圧倒的に軽い。逆に「どんな要素が
あるか分からない」段階では snapshot を読む。`--depth` で深さを絞れば出力を抑えられる。

### 画面が正常に見えても壊れている場合

見た目が出ていても JS がエラーを吐いていたり、裏の API が 500 を返していたりする。
それを掴めるのは次の2つだけなので、「なぜか値が入らない」ときは真っ先に見る。

```bash
playwright-cli console warning      # warning 以上のコンソールメッセージ
playwright-cli network --filter "/api/.*"   # API リクエストの結果
```

`network` は既定で画像・フォント等の静的リソースを省くので、そのままで API の成否が読める。
`--request-body` / `--request-headers` で中身も見られる。

---

## 認証を使い回す

ログインが必要なシステムを何度も触るなら、毎回ログイン画面を通す必要はない。
ログイン後の状態をファイルに保存し、次回はそれを読み込んで始める。

```bash
# 初回: ログインしてから保存
playwright-cli state-save .playwright-cli/auth.json

# 次回以降: 開いてから読み込み、目的のページへ
playwright-cli open "https://example.internal/"
playwright-cli state-load .playwright-cli/auth.json
playwright-cli goto "https://example.internal/orders"
```

**資格情報は必ず環境変数から渡す**。スクリプトやコマンド履歴にパスワードを直書きすると、
そのまま残って漏れる。ユーザーから平文で受け取った場合も、コマンドに埋め込む前に
環境変数へ退避する。保存した状態ファイル（`auth.json`）はセッションクッキーを含む
機密ファイルなので、リポジトリに入らないようにする。

```bash
export APP_USER='...' APP_PASS='...'   # ユーザーに設定してもらう
playwright-cli fill "#password" "$APP_PASS"
```

`.playwright-cli/` は CLI が snapshot・スクリーンショット・状態ファイルを置く作業
ディレクトリ。プロジェクト内で作業するなら `.gitignore` に入っているか確認し、
なければ追加を提案する。

---

## 副作用のある操作の扱い

登録・更新・削除・送信・決済のように、押したら戻せない操作は、押す前に何が起きるかを
ユーザーに伝えて確認を取る。「フォームに入力して送信して」と頼まれていても、送信ボタンの
手前まで進めてスクリーンショットを見せ、送信の可否を確認する方が安全なことが多い。

判断の目安:

- 読み取り・検索・画面遷移 → そのまま進める
- 下書き保存・自分の設定変更 → 進めてよいが、結果を明示する
- 他者に届く送信、外部への登録、削除、金銭が動く操作 → **押す前に確認する**

検証環境と本番環境の URL が似ている場合は、操作前に開いている URL を読み上げて、
対象環境が合っているかを確認する。

---

## 詰まったときの手当て

| 症状 | 対処 |
|------|------|
| セレクタが一致しない | `snapshot` を撮り直して現在の構造を確認。要素がまだ描画途中なら `reload` 後に再取得、または `eval` で出現を待つ |
| クリックしても何も起きない | `console` でエラー確認。オーバーレイに覆われている場合は先に閉じる要素をクリック |
| 別ウィンドウ・ポップアップに遷移した | `tab-list` で一覧、`tab-select <index>` で切り替え |
| iframe 内の要素が触れない | `snapshot` に iframe 配下が出るか確認。出ない場合は `run-code` で frameLocator を使う |
| 確認ダイアログで止まる | `dialog-accept` / `dialog-dismiss` |
| 前回の状態を引きずる | `close-all` してやり直す。それでも残るなら `kill-all` |
| ブラウザが起動しない | `playwright-cli install-browser chrome` |
| `playwright-cli` が無い | `npm i -g @playwright/cli` を提案 |

`--browser` の候補は `chrome` / `firefox` / `webkit` / `msedge`。既定はシステムに
インストール済みの Chrome。`chromium` を渡すと Playwright 同梱の `chrome-for-testing` が
使われるので、システムの Chrome の状態に左右されたくないときはこちらを指定する。

これで解けない込み入った操作（複雑な待ち、frameLocator、リクエストのモック）は
`references/playwright-cli.md` に詳細をまとめてある。必要になったら読む。

---

## 報告の作法

作業が終わったら、チャット本文で結果を伝える。ユーザーが欲しいのは「何が分かったか」で、
ログの再掲ではない。

- 取ってきた情報 → そのまま本文に書く（表なら表で）
- 実行した操作 → 何をどの順で操作したかを1〜2行で
- 撮ったスクリーンショット → パスを示す。画面の見た目が論点なら `Read` で自分も確認して
  所見を添える
- うまくいかなかった点 → 隠さず書く。「セレクタが見つからず〇〇は取得できていない」

スクリーンショットや動画は、ユーザーが見た目を知りたいとき・失敗の証跡が必要なときに撮る。
毎回一式そろえる必要はない。Markdown のレポートファイルは、ユーザーが明示的に求めたときだけ
作る。
