# FlexPaste-Solo - Smart Clipboard Text Formatter

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/egmememialdjhohecnfkimpablkjfabg)](https://chromewebstore.google.com/detail/egmememialdjhohecnfkimpablkjfabg)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-orange)](projects/app/manifest.json)
[![Privacy: 100% Local](https://img.shields.io/badge/Privacy-100%25%20Local-brightgreen)](PRIVACY.md)
[![version](https://img.shields.io/badge/version-1.2.1-blue)](projects/app/manifest.json)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![CI](https://github.com/masanori-satake/FlexPaste-Solo/actions/workflows/ci.yml/badge.svg)](https://github.com/masanori-satake/FlexPaste-Solo/actions/workflows/ci.yml)

A privacy-first **chrome-extension**, **clipboard-manager**, and **text-formatter** designed to clean up awkward line breaks and formatting before pasting, while inserting dynamic category templates right from the context menu.

## Overview

When copying text into documents, chats, or web apps, unwanted line breaks and rich text formatting often disrupt your workflow. **FlexPaste-Solo** solves this pain point by acting as a fast **line-break-remover** and smart template engine. With a single right-click, you can clean up raw text, substitute dynamic variables (such as dates, times, workdays, and custom definitions), and paste pristine content into your favorite tools.

## Key Features

- **Line Break Remover & Format Cleaner:** Automatically clean up extra spaces, unwanted line breaks, and rich formatting before pasting into docs, chats, and platforms such as **GitHub**, **Microsoft Loop**, **Google Docs**, and code editors.
- **2-Tier Context Menu Paste:** Organize templates into distinct categories for instant right-click selection and rapid insertion.
- **Dynamic Variable Engine:** Convert dynamic tags like `{{date_with_day}}`, `{{time}}`, `{{tomorrow}}`, `{{month_last_workday}}`, and custom category definitions (`{{def_1}}`, `{{def_2}}`, `{{def_3}}`) in real-time.
- **No-Code Chip UI & Live Preview:** Click or drag variable chips directly into template editors and inspect rendered outputs instantly in live preview.
- **Local First Architecture:** Default data is saved locally in `chrome.storage.local`. Optional device sync (β) syncs templates across browsers signed into the same Google account via `chrome.storage.sync`.
- **Ultimate Productivity:** A pure Vanilla JS **text-formatter** built for maximum speed and daily efficiency.

## 🔒 Privacy & Security

- **100% Local Execution:** Runs completely inside your browser with zero external server communication, tracking, telemetry, or remote analytics.
- **Zero Third-Party Dependencies:** Written in Pure Vanilla JS with zero external libraries or heavy build toolchains.
- **Zero Data Collection:** Your clipboard data, custom templates, and settings are never transmitted to any third party.

## Installation

### 🚀 Chrome Web Store (Recommended)

Install directly from the [Chrome Web Store](https://chromewebstore.google.com/detail/egmememialdjhohecnfkimpablkjfabg).

### 🛠️ Developer Mode (From Source)

1. Download the latest `FlexPaste-Solo-vX.X.X.zip` from Releases or clone this repository.
2. Open `chrome://extensions` in Chrome and enable **Developer mode**.
3. Click **Load unpacked** and select the `projects/app` folder.

## Usage

1. Open options via the extension icon or right-click context menu "⚙ Settings".
2. Create categories, adjust workdays/time intervals, and edit templates using variable chips.
3. Right-click any text field (`<input>`, `<textarea>`, or `[contenteditable]`), choose `FlexPaste`, and select your template for instant insertion.

---

## 🇯🇵 日本語

### FlexPaste-Solo - クリップボードテキストの改行・フォーマット柔軟変換

**FlexPaste-Solo** は、右クリック（コンテキストメニュー）を起点とし、コピーしたテキストの余計な改行除去やフォーマット調整をペースト前に瞬時に実行するとともに、設定画面で事前作成したカテゴリ別テンプレートと動的変数を組み合わせて流し込むChrome拡張機能です。

### 主な特徴

- **改行除去 ＆ フォーマットクリーン:** コピーした文章の不必要な改行や装飾フォーマットを削除し、**GitHub**、**Microsoft Loop**、**Google ドキュメント**、チャットツールなどへ綺麗にペーストできます。
- **2階層コンテキストメニュー:** カテゴリ別に整理された定型文を、右クリックから迷わずスムーズに選択・挿入。
- **リアルタイム動的変数エンジン:** 日時 (`{{date_with_day}}`, `{{time}}`)、相対日付 (`{{tomorrow}}`)、月末・稼働日 (`{{month_last_workday}}`)、カテゴリ定義文 (`{{def_1}}`, `{{def_2}}`, `{{def_3}}`) をリアルタイム変換。
- **ノーコード変数挿入 & リアルタイムプレビュー UI:** 設定画面でチップをクリック/ドラッグ＆ドロップするだけで変数を配置でき、プレビューで最終出力を事前に確認可能。
- **完全ローカル実行 & 端末間同期(β):** デフォルトではすべてのデータがブラウザ内の `chrome.storage.local` に保存されます（外部サーバーへの送信は一切行われません）。「端末間同期(β)」を有効にした場合のみ、`chrome.storage.sync` を経由して同一Googleアカウント間で自動同期されます。

### 🔒 プライバシーとセキュリティ

- **完全ローカル実行:** 外部API通信、トラッキング、アナリティクス、テレメトリは一切行いません。
- **外部依存ライブラリなし:** Pure Vanilla JS（ES Modules, DOM API）のみで構築。
- **ユーザーデータの収集ゼロ:** テンプレート内容やクリップボードデータが第三者に送信されることはありません。詳細なポリシーは [PRIVACY.md](PRIVACY.md) および [SECURITY.md](SECURITY.md) を参照してください。

### 使い方

1. 拡張機能アイコンまたはコンテキストメニューの「⚙ 設定」から管理画面を開きます。
2. カテゴリや定型文テンプレートを作成・編集します。
3. 任意のWebページで入力欄を右クリックし、`FlexPaste` から目的の定型文を選択してペースト挿入します。

### 免責事項・ライセンス

本ソフトウェアは無保証であり、利用により生じたいかなる損害についても開発者は責任を負いません。自己責任でご利用ください。ライセンスは [MIT License](LICENSE) です。
