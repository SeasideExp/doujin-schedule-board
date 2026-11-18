# AGENTS.md — 開発・保守ガイドライン

本ファイルは、このリポジトリ（「同人即売会・原稿締切 スケジュール管理」）における開発ルール・アーキテクチャ方針・準拠ガイドラインを定義します。今後の追加方針もここに追記します。

---

## バージョン管理ルール

### 1. 機能の追加や仕様変更・改修があった場合
- **バージョンを一つずつ繰り上げます。**
  - 例：`Ver.0.10` → `Ver.0.11` → `Ver.0.12` → `Ver.0.13`
- 対象となるケース：
  - 新機能の追加（新タブ、新出力形式、新レイアウト等）
  - 仕様変更（デフォルト値の大幅な見直し、UIレイアウトの変更、対応項目の変更等）
  - モジュール構成の変更

### 2. 軽微な修正・バグフィックスに留まる場合
- **メジャー/マイナーバージョン番号は上げず、末尾にアルファベットを付与して区別します。**
  - 例：`Ver.0.11` → `Ver.0.11b` → `Ver.0.11c`
- 対象となるケース：
  - 文言の微細な修正・タイポ修正
  - スタイル（CSS）の微調整
  - 既存機能の軽微なバグ修正

### 3. バージョン更新時に必ず同期すべき箇所
バージョンを更新する際は、以下の箇所を**必ず同時に更新して整合性を保つ**こと：
1. `js/state.js` の `APP_VERSION` 定数（`const APP_VERSION = 'Ver.0.xx';`）および `APP_UPDATED_AT` 定数（`const APP_UPDATED_AT = 'YYYY-MM-DD';`）
2. `index.html` の `<title>` 内バージョン表記、ヘッダーの `#app-version-badge` テキスト、および「このツールについて」ダイアログ内の `#about-version`・`#about-updated-at`（起動時に `js/main.js` の `syncVersionBadge()` でも `APP_VERSION` / `APP_UPDATED_AT` と自動連動）
3. `CHANGELOG.md` の最上部に最新バージョンの見出し・日付・変更内容を追加
4. `README.md` のタイトルおよび最終更新日・最新バージョン表記を更新

---

## 基本開発ガイドライン

### 1. ローカル直接実行（`file://`）の互換性を維持すること
- 本ツールは同人作家がオフライン環境や即売会当日、ローカルPCで `index.html` をダブルクリックするだけで即座に利用できることを最優先としています。
- **ES Modules（`type="module"`, `import / export`）は使用しないでください。** ローカルの `file://` プロトコルではブラウザのCORS制限によりエラーとなるためです。
- 各スクリプトは `index.html` 末尾で通常の `<script src="js/xxx.js" defer></script>` により**依存順**に読み込み、グローバル名前空間（`window.DSBState`, `window.DSBPresets`, `window.DSBBoard`, `window.DSBPlanner`, `window.DSBOutputs`, `window.DSBMain`）を介して連携するアーキテクチャを維持してください。
- 外部CDNやビルドツールへのランタイム依存を持ち込まないこと（印刷用フォントやアイコンもブラウザ標準・ローカル完結で動作させること）。

### 2. モジュールの単一責任の原則を守ること
コードを追加・修正する際は、責務に応じて適切なモジュールファイルに記述してください：

| ファイル | 名前空間 | 責務 |
| --- | --- | --- |
| `js/state.js` | `window.DSBState` | バージョン定数 `APP_VERSION`、アプリ状態（`store.data` / `store.ui`）、ローカル日付演算、HTMLエスケープ、ID生成、`localStorage` 永続化・データ正規化、共通ダイアログ開閉ヘルパー |
| `js/settings.js` | `window.DSBSettings` | UI色調・文字サイズ設定、JFLY（岡部・伊藤）カラーユニバーサルデザイン（CUD）モードの適用・初期化・`localStorage` 永続化 |
| `js/presets.js` | `window.DSBPresets` | 繰り返し使う「イベント名」「場所・会場」候補の追加・管理、フォーム内候補チップ・`<datalist>`・候補マスタUIの描画 |
| `js/board.js` | `window.DSBBoard` | 左ペイン「駅の発車標」風スケジュールボードの描画（時系列整列・残日数表示・フィルタ反映・リアルタイム時計） |
| `js/planner.js` | `window.DSBPlanner` | 右ペイン「年別・日別スケジュール管理」の描画（年/月ナビゲーション、カレンダー、同日重複比較パネル、日別一覧、イベント／締切入力モーダル初期化） |
| `js/outputs.js` | `window.DSBOutputs` | 年別PDFログ（表形式プレビュー・`#print-area` 構築）、CSV出力、JSONエクスポート／インポート（上書き・統合）、サンプルデータ投入 |
| `js/main.js` | `window.DSBMain` | 各モジュールの結合、DOMイベントリスナー登録、画面全体再描画（`renderAll`）、初期化（`init`） |
| `styles.css` | — | レイアウト、発車標LEDスタイル、カレンダー／比較カード、ネイティブ `<dialog>` スタイル、`@media print` 用A4表形式PDFスタイル |
| `index.html` | — | セマンティックHTML構造、`<dialog>` 定義、スクリプト順次読み込み |

### 3. Modern Web Guidance 準拠方針
本プロジェクトは **[GoogleChrome/modern-web-guidance](https://github.com/GoogleChrome/modern-web-guidance)** に準拠し、レガシーなJSハックを避けてブラウザ標準（Baseline）プラットフォーム機能を優先採用します：
- **モーダルUI**：自作 `div` オーバーレイや `z-index` ハックを使わず、HTMLネイティブの **`<dialog>` 要素**（`showModal()` / `close()` / `::backdrop` / `overlay`・`display` に対する `@starting-style` トランジション）を使用する。
- **ポップオーバー／簡易UI**：将来ポップオーバーやツールチップ的オーバーレイを追加する場合は、ネイティブ **Popover API（`popover` 属性）** を優先検討する。
- **モダンCSS**：状態に応じた親・兄弟要素のスタイリングには `:has()`、レイアウトには CSS Grid / Flexbox、スクロール閉じ込めには `overscroll-behavior: contain` 等の Baseline 機能を活用する。
- **ネイティブAPIとフォールバック**：`crypto.randomUUID()` 等を使用する際も、`file://`（非セキュアコンテキスト扱いとなる場合を含む）で動作が破綻しないフォールバックを必ず備える。
- **セキュリティ**：すべてのユーザー入力文字列をテンプレート文字列へ埋め込む際は、`DSBState.escapeHtml()` で必ずエスケープする。

---

## 変更履歴 (Changelog)
各バージョンの詳細な変更履歴は、すべて **[`CHANGELOG.md`](./CHANGELOG.md)** に分離・集約して記録しています。
機能追加やバグ修正を行った際は、`AGENTS.md` ではなく **`CHANGELOG.md`** に最新バージョンの変更内容を追記してください。
