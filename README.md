# FlexPaste-Solo

[![version](https://img.shields.io/badge/version-0.1.1-blue)](projects/app/manifest.json)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Privacy-Local Only](https://img.shields.io/badge/Privacy-Local%20Only-brightgreen)](PRIVACY.md)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-orange)](projects/app/manifest.json)
[![CI](https://github.com/masanori-satake/FlexPaste-Solo/actions/workflows/ci.yml/badge.svg)](https://github.com/masanori-satake/FlexPaste-Solo/actions/workflows/ci.yml)

右クリックからカテゴリ別定型文と動的変数を組み合わせて即座にペースト挿入するChrome拡張機能。

## プロジェクト概要

**FlexPaste-Solo** は、右クリック（コンテキストメニュー）を起点とし、設定画面で事前作成したカテゴリ別テンプレートと動的変数を組み合わせて、ペーストした瞬間に文脈や時間を即座に反映・完成させる定型文流し込みツールです。

設計思想や行動指針については [AGENTS.md](AGENTS.md) を参照してください。

## 特徴

- **100% ローカル完結 (プライバシー最優先):** 外部サーバー通信、トラッキング、アナリティクス、リモートAPI呼び出しは一切行いません。すべての処理をユーザーのブラウザ内で完結させます。
- **2階層コンテキストメニュー:** カテゴリ別のグループ化により、膨大な定型文も迷わずスムーズに選択・挿入可能です。
- **リアルタイム動的変数エンジン:** 日時 (`{{date_with_day}}`, `{{time}}`)、相対日付 (`{{tomorrow}}`)、月末・稼働日 (`{{month_last_workday}}`)、文脈変数 (`{{selection}}`, `{{page_title}}`, `{{page_url}}`) をリアルタイム変換。
- **ノーコード変数挿入 & リアルタイムプレビュー UI:** 設定画面でチップをドラッグ＆ドロップ（またはクリック）するだけでマスタッシュタグを挿入でき、プレビューで最終出力を事前に確認できます。
- **Material Design 3:** Native CSS カスタムプロパティを使用し、M3 ガイドラインに準拠した直感的で洗練されたインターフェース。

## インストール方法

### 🚀 Chrome ウェブストアからインストール（推奨）

[Chrome ウェブストア](https://chromewebstore.google.com) からインストールしてください。

### 🛠️ ソースコードからインストール

1. リリースページから最新の `FlexPaste-Solo-vX.X.X.zip` をダウンロードします。
2. `chrome://extensions` を開き、デベロッパーモードをオンにします。
3. 解凍したフォルダ（またはリポジトリの `projects/app` フォルダ）を「パッケージ化されていない拡張機能を読み込む」で選択します。

## 使い方

1. 拡張機能アイコンまたはコンテキストメニューの「⚙ 設定」から管理画面を開きます。
2. カテゴリや定型文テンプレートを作成・編集します。テキストエリア上の変数チップをクリックまたはドラッグ＆ドロップして動的変数を配置できます。
3. 任意のWebページで入力欄 (`<input>`, `<textarea>`, `[contenteditable]`) を右クリックし、`FlexPaste` から目的の定型文を選択して即座にペースト挿入します。

## プライバシーとセキュリティ

- **Local Only:** 本拡張機能は一切の外部通信を行いません。詳細なポリシーは [PRIVACY.md](PRIVACY.md) および [SECURITY.md](SECURITY.md) を参照してください。
- **トラッキングなし:** アクセス解析や広告、外部サービスへのデータ送信は一切行いません。
- **透明性:** 外部ライブラリを一切使用しない Vanilla JS 構成。

## ディレクトリ構成

- `projects/app/`: 拡張機能の本体コード
- `docs/`: 要件定義・技術仕様書
- `scripts/`: ビルド・バージョン管理ユーティリティ

## 免責事項

本ソフトウェアは無保証であり、利用により生じたいかなる損害についても開発者は責任を負いません。自己責任でご利用ください。

## ライセンス

[MIT License](LICENSE)
