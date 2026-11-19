# 白鷺私立探偵事務所 HP

TRPGキャラクター「白鷺 雅」の探偵事務所の架空ホームページ。実在する京都の小規模事業者のサイトとして自然に見えることを最優先にする。

## サイトの作り

- 素のHTML・CSS・JavaScriptのみ。フレームワーク・ビルド工程・ルーティング設定は使わない。
- 公開するファイルはすべて `site/` に置く。`site/` が公開URLのルートになる（`main` に入ると `.github/workflows/pages.yml` が `site/` だけを GitHub Pages に公開する）。
- `site/` の外（`docs/`・`.github/`・このファイルなど）は公開されない。ページでないファイルは `site/` に入れない。
- 1ページ1フォルダ（`site/service/index.html` → `/service/`）。`site/` の中で、ページを `pages/` などにまとめない（公開URLの形が変わるため）。
- 共通ファイルは `site/css/style.css`・`site/js/main.js`・`site/img/`。
- リンクは相対パスで `index.html` まで書く（ローカルでファイルを直接開いて確認できるようにするため）。
- ヘッダー・グローバルナビ・フッターは全ページに同じものが書かれている。どれかを変えたら全ページをそろえる。
- 新しいページを足したら、ナビ・フッター・関連する一覧（事例一覧、お知らせなど）からのリンクも足す。
- フッターの架空サイトである旨の注記は消さない・弱めない。

## キャラクター設定

- 白鷺 雅の設定は `docs/miyabi.md` にまとめてある（いあきゃらのシートから取った控え）。来歴の詳細と事件記録の原文は `docs/miyabi-memo.md`。
- ページの文章・画像・隠し要素を足したり直したりするときは、ここの設定と食い違わないようにする。食い違ったらシートが正なので、ユーザーに確かめる。
- `docs/` はサイトのページではない。ナビやフッターからリンクしない。
- develop へのPRのたびに、GitHub Actions（`.github/workflows/iachara.yml`）がシートを取り、`docs/miyabi-sheet.json` と比べる。変わっていればPRにコメントが付く。
- コメントが付いたら、そのPRとは別に `content/SHIRASAGI-TANTEI-<番号>` のPRを出す。中身は、`docs/miyabi.md`・`docs/miyabi-memo.md` を直して、`IACHARA_FIREBASE_KEY=<キー> node .github/scripts/iachara.mjs update` で `docs/miyabi-sheet.json` を最新にすること。
  - 新しいメモ・通過シナリオ・日記は、ネタバレを含まないか確かめてから載せる。迷ったらユーザーに聞く。
  - キーはリポジトリの Secret `IACHARA_FIREBASE_KEY` に入っている。ファイルには書かない（Trivy の秘密情報スキャンで落ちる）。

## 隠し要素

- トップの灰皿 → 代表あいさつの煙草 → 事務所概要の表札、の順に押すと `site/office/index.html` の `#ura` が出る（`site/js/main.js` の `hsOrder`）。
- 隠しボタンの位置や順番を変えるときは、HTMLの `data-hs` と `hsOrder` を両方直す。

## ブランチ構成

| ブランチ | 役割 |
|---|---|
| `main` | 公開している版。直接コミットしない。`develop` からのPRでだけ更新する。 |
| `develop` | 開発の本線。作業ブランチはここから切り、ここへPRを出す。直接コミットしない。 |
| `<種類>/SHIRASAGI-TANTEI-<PR番号>` | 作業ブランチ。1つの作業に1つ。 |

## 作業の進め方（ブランチ → PR）

実際の案件のように、作業はすべて PR として GitHub に残す。Issue は使わない。

1. **番号を決める**。これから作るPRに付く番号を調べる：
   `gh api 'repos/{owner}/{repo}/issues?state=all&per_page=1' --jq '.[0].number + 1'`
   （Issue と PR は番号を共有しているため、この API で最新の番号がわかる。結果が空なら 1）
2. **ブランチを切る**。`git fetch` して最新の `develop` から、`<種類>/SHIRASAGI-TANTEI-<番号>` を切る。
3. **コミット**。メッセージは `<種類>: <変更内容>`。
4. **PR を出す**。push の直前にもう一度 1. のコマンドで番号を確かめ、ずれていたらローカルのブランチ名を `git branch -m` で直してから push し、`gh pr create --base develop` する。タイトルは `[SHIRASAGI-TANTEI-<番号>] <種類>: <何を実装したか>`。本文は `.github/pull_request_template.md` の形。
   - **PRを出したあとはブランチ名を変えない。** 元ブランチの名前を変えると GitHub がそのPRを閉じてしまう。万一ずれたら、そのままにしておく。
5. マージはユーザーが行う。Claude はマージしない。
6. **リリース**：ユーザーに頼まれたときだけ、`develop` → `main` のPRを出す。タイトルは `release: <日付> <含まれる変更の要約>`、本文には含まれるPRを `#番号` で列挙する。

- PR・コミットメッセージはすべて日本語。
- 1つのPRには1つの目的だけを入れる。別の直しに気づいたら、別のPRにする。

### 種類

| 種類 | 使うとき | ブランチ名の例 | PRタイトルの例 |
|---|---|---|---|
| `feature` | ページ・機能・隠し要素の追加 | `feature/SHIRASAGI-TANTEI-3` | `[SHIRASAGI-TANTEI-3] feature: 調査事例「〇〇」のページを追加し、一覧とトップに掲載` |
| `fix` | 表示崩れ・リンク切れ・誤字などの修正 | `fix/SHIRASAGI-TANTEI-5` | `[SHIRASAGI-TANTEI-5] fix: スマホ幅でメニューを開いたあと閉じられない不具合を修正` |
| `content` | 既存ページの文章の書き直し・お知らせ更新 | `content/SHIRASAGI-TANTEI-7` | `[SHIRASAGI-TANTEI-7] content: 11月のお知らせを2件追加` |
| `chore` | 構成の整理・設定ファイル・このファイルの更新 | `chore/SHIRASAGI-TANTEI-3` | `[SHIRASAGI-TANTEI-3] chore: 開発ルール（CLAUDE.md）とPRテンプレートを追加` |

### PRタイトルと本文の書き方

- タイトルは「何を」「どうしたか」まで書く。`修正`・`更新` だけのタイトルにしない。
- 本文には、変更したファイルごとに何を変えたかを具体的に書く。読んだ人が差分を開かなくても中身がわかるようにする。
- 「確認したこと」には、実際に確認したことだけを書く（表示を確認したページと画面幅、リンクのチェック結果など）。確認していないことは「未確認」と書く。
