# FlexPaste-Solo - Smart Clipboard Templates

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/egmememialdjhohecnfkimpablkjfabg)](https://chromewebstore.google.com/detail/egmememialdjhohecnfkimpablkjfabg)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-orange)](projects/app/manifest.json)
[![Privacy: Local-First](https://img.shields.io/badge/Privacy-Local--First-brightgreen)](PRIVACY.md)
[![version](https://img.shields.io/badge/version-1.2.1-blue)](projects/app/manifest.json)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![CI](https://github.com/masanori-satake/FlexPaste-Solo/actions/workflows/ci.yml/badge.svg)](https://github.com/masanori-satake/FlexPaste-Solo/actions/workflows/ci.yml)

プライバシーを重視した **chrome-extension**、**clipboard-manager**、**text-formatter** で、事前設定したカテゴリ別テンプレートと動的変数を右クリックのコンテキストメニューから直接、瞬時に挿入できます。

## 概要

定型メッセージ、日付、時刻、構造化されたメモを何度も入力またはコピーすると、集中力や生産性が損なわれることがあります。**FlexPaste-Solo** では、カスタムテンプレートをカテゴリ別に整理し、日付、時刻、稼働日、カスタム定義などの動的変数を組み合わせることで、日々の作業を効率化できます。1回の右クリックで、動的に生成された整形済みテンプレートを **GitHub**、**Microsoft Loop**、**Google Docs**、オンラインチャットなどのWebアプリケーションにペーストできます。

## 主な機能

- **2階層コンテキストメニューからのペースト:** カスタムテンプレートをカテゴリ別にまとめ、右クリックですばやく選択して即座に挿入できます。
- **動的変数エンジン:** `{{date_with_day}}`、`{{time}}`、`{{tomorrow}}`、`{{next_workday}}`、`{{month_last_workday}}`、カテゴリ定義 (`{{def_1}}`、`{{def_2}}`、`{{def_3}}`) などの変数チップを、挿入した瞬間に自動で展開します。
- **幅広いペースト対応:** 標準的なDOMテキストノードの挿入を制限している最新のリッチテキストエディタやWebアプリケーション（Teams、Microsoft Loop、GitHub など）にも、組み込みのペーストモードでシームレスにテンプレートを挿入できます。
- **ノーコードのチップUIとライブプレビュー:** 変数チップをクリックまたはドラッグ＆ドロップしてテンプレートエディタへ直接配置でき、生成結果をすぐにライブプレビューできます。
- **ローカルファースト設計:** デフォルトではすべてのテンプレートと設定を `chrome.storage.local` にローカル保存します。任意の端末間同期 (β) を有効にすると、`chrome.storage.sync` を使用して、同じGoogleアカウントでログインしているブラウザ間で設定とテンプレートを同期できます。
- **軽量な生産性向上ツール:** プライバシーとパフォーマンスを最大限に高めるため、外部依存関係のないPure Vanilla JSで構築された拡張機能です。

## 🔒 プライバシーとセキュリティ

- **ローカルファースト:** デフォルトではブラウザ内で動作し、設定とテンプレートを `chrome.storage.local` に保存します。同期を有効にした場合は、Chrome Sync (`chrome.storage.sync`) を通じて設定とテンプレートが端末外へ同期されます。このChrome Syncを除き、外部サーバー通信、トラッキング、テレメトリ、リモートアナリティクスは行いません。
- **サードパーティ依存関係なし:** 外部ライブラリや大規模なビルドツールチェーンを使わず、Pure Vanilla JSで記述されています。
- **データ収集なし:** 開発者はテンプレート、動的変数、クリップボードデータを収集しません。同期を有効にした場合のみ、設定とテンプレートがChrome Syncを通じて保存・同期されます。

## インストール

### 🚀 Chrome Web Store（推奨）

[Chrome Web Store](https://chromewebstore.google.com/detail/egmememialdjhohecnfkimpablkjfabg) から直接インストールします。

### 🛠️ デベロッパーモード（ソースから）

1. Releasesから最新の `FlexPaste-Solo-vX.X.X.zip` をダウンロードするか、このリポジトリをクローンします。
2. Chromeで `chrome://extensions` を開き、**デベロッパーモード**を有効にします。
3. **パッケージ化されていない拡張機能を読み込む**をクリックし、`projects/app` フォルダを選択します。

## 使い方

1. 拡張機能アイコンまたは右クリックのコンテキストメニューにある「⚙ Settings」から設定画面を開きます。
2. カテゴリを作成し、稼働日や時刻の丸め間隔を設定して、変数チップを使ってテンプレートを編集します。
3. 任意のテキストフィールド（`<input>`、`<textarea>`、`[contenteditable]`）を右クリックし、`FlexPaste` からテンプレートを選択して即座に挿入します。

---

## 🇯🇵 日本語

### FlexPaste-Solo - 定型文＆動的変数ペースト挿入

**FlexPaste-Solo** は、右クリック（コンテキストメニュー）を起点とし、設定画面で事前作成したカテゴリ別テンプレートと動的変数を組み合わせて、ペーストした瞬間に文脈や現在日時を即座に反映・完成させる定型文流し込みツールです。

### 主な特徴

- **2階層コンテキストメニュー:** カテゴリ別のグループ化により、膨大な定型文も迷わずスムーズに右クリックから選択・挿入可能。
- **リアルタイム動的変数エンジン:** 日時 (`{{date_with_day}}`, `{{time}}`)、相対日付 (`{{tomorrow}}`)、月末・稼働日 (`{{month_last_workday}}`)、カテゴリ定義文 (`{{def_1}}`, `{{def_2}}`, `{{def_3}}`) を挿入の瞬間に自動計算して適用。
- **高度なペースト入力モード:** 直接的なテキスト挿入に対応していない **GitHub**、**Microsoft Loop**、**Teams** 等のWebアプリケーションでも確実にテンプレートを入力可能。
- **ノーコード変数挿入 & リアルタイムプレビュー UI:** 設定画面でチップをクリック/ドラッグ＆ドロップするだけで変数を配置でき、プレビューで最終出力を事前に確認可能。
- **ローカルファースト & 端末間同期(β):** デフォルトではすべてのデータがブラウザ内の `chrome.storage.local` に保存されます。「端末間同期(β)」を有効にした場合のみ、設定とテンプレートデータがChrome Sync (`chrome.storage.sync`) を通じて端末外に保存され、同一Googleアカウント間で自動同期されます。

### 🔒 プライバシーとセキュリティ

- **ローカルファースト:** デフォルトでは設定とテンプレートを `chrome.storage.local` に保存します。同期を有効にした場合は、Chrome Sync (`chrome.storage.sync`) を通じて設定とテンプレートが端末外へ同期されます。このChrome Syncを除き、外部サーバー通信、外部API通信、トラッキング、アナリティクス、テレメトリは行いません。
- **外部依存ライブラリなし:** Pure Vanilla JS（ES Modules, DOM API）のみで構築。
- **ユーザーデータの収集なし:** 開発者はテンプレート内容やクリップボードデータを収集しません。同期を有効にした場合のみ、設定とテンプレートがChrome Syncを通じて保存・同期されます。詳細なポリシーは [PRIVACY.md](PRIVACY.md) および [SECURITY.md](SECURITY.md) を参照してください。

### 使い方

1. 拡張機能アイコンまたはコンテキストメニューの「⚙ 設定」から管理画面を開きます。
2. カテゴリや定型文テンプレートを作成・編集します。
3. 任意のWebページで入力欄を右クリックし、`FlexPaste` から目的の定型文を選択してペースト挿入します。

### 免責事項・ライセンス

本ソフトウェアは無保証であり、利用により生じたいかなる損害についても開発者は責任を負いません。自己責任でご利用ください。ライセンスは [MIT License](LICENSE) です。
