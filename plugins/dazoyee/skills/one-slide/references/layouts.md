# レイアウト

本文には内容に合う型を1つ選ぶ。
どの型も、結論の一文を置く上部見出しと、共通の土台を組み合わせて使う。

## 要点ブロック

### 向いている内容

結論を支える根拠や、並列に示せる要点が3〜4個ある内容に向いている。

### 配置

結論の下にカードを3〜4個並べる。
各カードは短い見出しと説明で構成し、重要度の高い要点を先に置く。

### 最小の HTML/CSS 骨組み

```html
<section class="points">
  <article class="card"><h2>要点 1</h2><p>短い説明</p></article>
  <article class="card"><h2>要点 2</h2><p>短い説明</p></article>
  <article class="card"><h2>要点 3</h2><p>短い説明</p></article>
</section>
```

```css
.points { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1em; }
.card { padding: 1.167em; border-top: 0.333em solid var(--accent); background: #f4f6f8; }
.card h2 { margin: 0 0 0.5em; font-size: 1.25em; }
.card p { margin: 0; }
```

## 比較・対照

### 向いている内容

案 A/B、As-Is/To-Be、選択肢の違いを見せ、判断や推奨につなげる内容に向いている。

### 配置

2案を左右に並べるか、項目を行にした表で並べる。
比較軸をそろえ、推奨する案にはアクセント色の枠やラベルを付ける。

### 最小の HTML/CSS 骨組み

```html
<section class="comparison">
  <article class="option"><h2>案 A</h2><p>特徴</p></article>
  <article class="option recommended"><h2>案 B</h2><p>推奨する理由</p></article>
</section>
```

```css
.comparison { display: grid; grid-template-columns: 1fr 1fr; gap: 1em; }
.option { padding: 1.167em; border: 0.083em solid #d8dde3; }
.recommended { border: 0.167em solid var(--accent); }
.option h2 { margin: 0 0 0.5em; font-size: 1.25em; }
.option p { margin: 0; }
```

## 流れ・手順

### 向いている内容

処理の流れ、作業手順、時間の順序が理解の中心になる内容に向いている。

### 配置

工程を左から右へ並べ、矢印でつなぐ。
時間軸を示す場合はタイムラインとして順序を明示し、各工程の説明を短くする。

### 最小の HTML/CSS 骨組み

```html
<ol class="flow">
  <li><h2>入力</h2><p>素材を集める</p></li>
  <li><h2>処理</h2><p>要点を整理する</p></li>
  <li><h2>出力</h2><p>結果を確認する</p></li>
</ol>
```

```css
.flow { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2.5em; margin: 0; padding: 0; list-style: none; }
.flow li { position: relative; padding: 1em; background: #f4f6f8; border-bottom: 0.25em solid var(--accent); }
.flow li h2 { margin: 0 0 0.5em; font-size: 1.25em; }
.flow li p { margin: 0; }
.flow li:not(:last-child)::after { position: absolute; top: 50%; right: -0.625em; content: "→"; color: var(--accent); font-size: 2em; font-weight: bold; transform: translate(50%, -50%); }
```

## 共通の土台

### 16:9キャンバスの拡縮、色、印刷

キャンバスの縦横比を `aspect-ratio` で保ち、画面幅と画面高さの両方に収まるよう `min()` で縮尺を決める。
`.slide` の基準文字サイズを `min(1.25vw, 2.2222vh)` で決め、内側の文字・余白・線などの寸法をすべて `em` で書くと、キャンバスと一緒に拡縮する。
色は CSS 変数にまとめ、印刷時はページとキャンバスを16:9に保ち、背景色を印刷する。

```html
<meta name="viewport" content="width=device-width, initial-scale=1">
<main class="slide"><header><h1>結論を表す一文</h1></header><section>本文</section></main>
```

```css
:root { --accent: #1769aa; --ink: #17212b; --paper: #fff; }
* { box-sizing: border-box; }
html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; }
body { display: grid; place-items: center; background: #e9edf1; font-family: "Yu Gothic", "Meiryo", "Hiragino Kaku Gothic ProN", sans-serif; }
.slide {
  width: min(100vw, 177.78vh);
  height: min(56.25vw, 100vh);
  aspect-ratio: 16 / 9;
  padding: 1.4em;
  overflow: hidden;
  color: var(--ink);
  background: var(--paper);
  font-size: min(1.25vw, 2.2222vh);
}
.slide h1 { margin: 0 0 0.444em; color: var(--accent); font-size: 2.25em; }
@page { size: 13.333in 7.5in; margin: 0; }
@media print {
  * { print-color-adjust: exact; }
  html, body { width: 13.333in; height: 7.5in; background: #fff; }
  .slide { width: 13.333in; height: 7.5in; }
}
```
