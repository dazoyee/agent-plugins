# playwright-cli 詳細リファレンス

SKILL.md で足りない込み入った操作をここにまとめる。必要な節だけ読む。

## 目次

- [待つ（描画・遷移・非同期処理）](#待つ描画遷移非同期処理)
- [run-code — Playwright API を直接使う](#run-code--playwright-api-を直接使う)
- [iframe の中を操作する](#iframe-の中を操作する)
- [セレクタの書き方](#セレクタの書き方)
- [複数タブ・ポップアップ](#複数タブポップアップ)
- [ネットワークのモック（route）](#ネットワークのモックroute)
- [Cookie / Storage を直接いじる](#cookie--storage-を直接いじる)
- [記録（動画・トレース）](#記録動画トレース)
- [セッションを分ける・既存ブラウザに接続する](#セッションを分ける既存ブラウザに接続する)
- [シェルスクリプトに束ねる場合](#シェルスクリプトに束ねる場合)

---

## 待つ（描画・遷移・非同期処理）

この CLI に「待つ」専用コマンドは無い。`click` などの各操作は Playwright の自動待機を
内包しているので、通常の遷移やレンダリングは意識しなくてよい。問題になるのは
**操作を伴わない待ち**（ボタンを押した後、非同期で一覧が差し替わるのを待つ等）。

条件が満たされるまで待つなら `run-code` の `waitForSelector` / `waitForFunction` を使う。
これが最も確実で、固定秒数のスリープより速く安定する。

```bash
# 要素が現れるまで待つ
playwright-cli run-code "async page => await page.waitForSelector('.result-row', { timeout: 15000 })"

# 任意の条件が真になるまで待つ（件数が 0 件でなくなるまで等）
playwright-cli run-code "async page => await page.waitForFunction(() => document.querySelectorAll('.result-row').length > 0, null, { timeout: 15000 })"

# 通信が落ち着くまで待つ
playwright-cli run-code "async page => await page.waitForLoadState('networkidle')"
```

待っても現れない場合、多くは「そもそもリクエストが失敗している」。`console` と
`network` を見れば、待ち不足なのか壊れているのかが切り分けられる。

固定スリープ（`sleep 3`）は最後の手段。CI や遅い回線で不安定になり、原因の切り分けも
できなくなるので、条件待ちで書けるなら常にそちらを選ぶ。

---

## run-code — Playwright API を直接使う

`run-code` は `page` を引数に取る関数を実行する。CLI のサブコマンドで表現できない操作は
すべてここに落とせる。返り値はそのまま出力される。

```bash
# 複数要素からまとめて取る
playwright-cli run-code "async page => await page.locator('.row').allTextContents()"

# 属性で絞って操作する
playwright-cli run-code "async page => await page.getByRole('button', { name: '確定' }).click()"

# ダウンロードを受け取る
playwright-cli run-code "async page => { const [d] = await Promise.all([page.waitForEvent('download'), page.click('text=CSV出力')]); await d.saveAs('/tmp/out.csv'); return d.suggestedFilename() }"

# 長いコードはファイルから
playwright-cli run-code --filename=./step.js
```

`eval` との違い: `eval` はブラウザ内で JS を評価する（DOM を読むのに向く）。
`run-code` は Node 側で Playwright API を動かす（待機・イベント・ダウンロード・
frameLocator など、ブラウザ内 JS では書けないものに向く）。

---

## iframe の中を操作する

`snapshot` に iframe 配下の要素が出ていれば、通常どおり ref やセレクタで触れる。
出ていない場合は `run-code` の `frameLocator` を使う。

```bash
playwright-cli run-code "async page => await page.frameLocator('#payment-frame').locator('#card-number').fill('4242424242424242')"

# iframe の中身を読む
playwright-cli run-code "async page => await page.frameLocator('iframe[name=main]').locator('h1').textContent()"
```

決済フォームや旧来の管理画面は iframe を多用するので、要素が見つからないときは
まず iframe を疑う。

---

## セレクタの書き方

`<target>` は Playwright のロケータ文字列として解釈される。壊れにくい順に選ぶ。

| 書き方 | 例 | 使いどころ |
|--------|-----|-----------|
| ID | `#username` | 最優先。安定していて短い |
| テキスト | `text=ログイン` | ボタン・リンク。文言が変わると壊れる点に注意 |
| 属性 | `[name=email]` / `[data-testid=submit]` | `data-testid` があれば最も堅牢 |
| CSS | `table tbody tr:nth-child(2) td` | 構造依存。表の走査など |
| ロール | `run-code` の `getByRole('button', { name: '確定' })` | アクセシブルな画面で堅牢 |

避けるべきもの: 自動生成された class（`css-1x2y3z`）、深い階層の `div > div > div`、
snapshot の ref をスクリプトに焼き込むこと。いずれも次の実行で壊れる。

セレクタが複数の要素に一致するとエラーになる。`:first-of-type` や `nth-child` で
絞るか、より具体的な属性で特定する。

---

## 複数タブ・ポップアップ

```bash
playwright-cli tab-list          # 一覧（index が振られる）
playwright-cli tab-select 1      # 切り替え
playwright-cli tab-new "https://..."
playwright-cli tab-close 1
```

リンクが新規タブで開く（`target=_blank`）場合、クリックしても現在のタブは変わらない。
`tab-list` で増えているか確認して切り替える。

---

## ネットワークのモック（route）

特定のリクエストを固定レスポンスに差し替える。エラー画面の再現や、外部依存を切って
画面だけ確認したいときに使う。

```bash
# 500 を返させる
playwright-cli route "**/api/orders" --status=500 --body='{"message":"error"}' --content-type=application/json

# 固定データを返させる
playwright-cli route "**/api/user" --body='{"name":"テスト"}' --content-type=application/json

playwright-cli route-list        # 有効なルートを確認
playwright-cli unroute           # 全解除
```

モックを張ったまま別の確認に移ると原因不明の挙動を招くので、用が済んだら `unroute` する。

---

## Cookie / Storage を直接いじる

ログイン画面を通さずに認証状態を作る、フラグを立てて特定の画面を出す、といった用途。

```bash
playwright-cli cookie-set session_id "abc123" --domain=example.internal --path=/ --httpOnly
playwright-cli cookie-list
playwright-cli localstorage-set feature_flag "on"
playwright-cli localstorage-list
playwright-cli cookie-clear
```

まとめて保存・復元するなら個別操作より `state-save` / `state-load` が確実。

---

## 記録（動画・トレース）

```bash
playwright-cli video-start ./run.webm --size=1280x800
playwright-cli video-chapter "ログイン"      # 章マーカー
playwright-cli video-stop

playwright-cli tracing-start
playwright-cli tracing-stop                  # Playwright Trace Viewer で開ける
```

動画は「操作の流れを人に見せる」ため、トレースは「失敗の原因を後から掘る」ためのもの。
毎回撮る必要はない。再現しづらい失敗を追うときにトレースが効く。

---

## セッションを分ける・既存ブラウザに接続する

```bash
playwright-cli -s=admin open "https://example.internal/admin"
playwright-cli -s=user  open "https://example.internal/"
playwright-cli -s=admin click "text=承認"     # セッションを指定して操作
playwright-cli list                            # 全セッションの状態
```

権限の異なる2ユーザーを同時に触る場合や、片方の状態を保ったまま別画面を調べたい場合に使う。
セッション名を付け忘れると `default` を共有して状態が混ざる。

既に起動しているブラウザに繋ぐ場合:

```bash
playwright-cli attach --cdp="http://localhost:9222"
playwright-cli attach --extension=chrome      # ブラウザ拡張経由
```

`--persistent` / `--profile <dir>` で `open` すると、プロファイルが永続化され
ログイン状態がディスクに残る。長期的に同じアカウントを使い回すならこちらが楽だが、
資格情報がディスクに残る点は意識しておく。

---

## シェルスクリプトに束ねる場合

同じ手順を繰り返す価値が出てきたときだけスクリプト化する。使い捨ての作業は
対話でやる方が速い。書くときは SKILL.md の落とし穴1（**exit 0 問題**）を必ず織り込む。

```bash
#!/bin/bash
# 資格情報は環境変数から。スクリプトに書かない。
: "${APP_USER:?APP_USER を設定してください}"
: "${APP_PASS:?APP_PASS を設定してください}"

# playwright-cli は失敗しても exit 0 なので、出力を検査するラッパを通す
pw() {
  local out
  out=$(playwright-cli "$@" 2>&1)
  if printf '%s' "$out" | grep -q '### Error'; then
    printf 'NG: playwright-cli %s\n%s\n' "$*" "$out" >&2
    playwright-cli close >/dev/null 2>&1
    exit 1
  fi
  printf '%s' "$out"
}

trap 'playwright-cli close >/dev/null 2>&1' EXIT

pw open "https://example.internal/login" >/dev/null
pw fill "#username" "$APP_USER" >/dev/null
pw fill "#password" "$APP_PASS" >/dev/null
pw click "text=ログイン" >/dev/null

# 目的の値を取る（--raw は値だけを返す）
total=$(playwright-cli --raw eval "() => document.querySelector('#total').textContent.trim()")
echo "合計: $total"
```

ポイント:

- ラッパ関数で `### Error` を検査する。これが無いスクリプトは壊れても成功を報告する
- `trap ... EXIT` でブラウザを必ず閉じる。ゾンビセッションは次回の実行を汚す
- ref ではなくセレクタで書く。ref は実行ごとに変わる
- 資格情報は環境変数。`: "${VAR:?}"` で未設定を早期に弾く
