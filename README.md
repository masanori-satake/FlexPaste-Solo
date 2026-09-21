# FlexPaste-Solo - Smart Clipboard Templates

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/egmememialdjhohecnfkimpablkjfabg)](https://chromewebstore.google.com/detail/egmememialdjhohecnfkimpablkjfabg)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-orange)](projects/app/manifest.json)
[![Privacy: 100% Local](https://img.shields.io/badge/Privacy-100%25%20Local-brightgreen)](PRIVACY.md)
[![version](https://img.shields.io/badge/version-1.2.1-blue)](projects/app/manifest.json)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![CI](https://github.com/masanori-satake/FlexPaste-Solo/actions/workflows/ci.yml/badge.svg)](https://github.com/masanori-satake/FlexPaste-Solo/actions/workflows/ci.yml)

A privacy-first **chrome-extension**, **clipboard-manager**, and **text-formatter** designed to instantly insert pre-configured category templates and dynamic variables directly from the right-click context menu.

## Overview

Repeatedly typing or copying standard messages, dates, times, and structured notes can disrupt your focus and productivity. **FlexPaste-Solo** accelerates your daily workflow by allowing you to organize custom templates into categories and enrich them with dynamic variables (such as dates, times, workdays, and custom definitions). With a single right-click, you can paste dynamic, perfectly formatted templates into web applications like **GitHub**, **Microsoft Loop**, **Google Docs**, and online chats.

## Key Features

- **2-Tier Context Menu Paste:** Group custom templates into categories for rapid right-click selection and instant insertion.
- **Dynamic Variable Engine:** Automatically resolves variable chips like `{{date_with_day}}`, `{{time}}`, `{{tomorrow}}`, `{{next_workday}}`, `{{month_last_workday}}`, and category definitions (`{{def_1}}`, `{{def_2}}`, `{{def_3}}`) at the exact moment of insertion.
- **Universal Paste Support:** Built-in paste mode allows seamless template insertion into modern rich-text editors and web applications (e.g. Teams, Microsoft Loop, GitHub) that restrict standard DOM text node injection.
- **No-Code Chip UI & Live Preview:** Click or drag-and-drop variable chips directly into template editors, with instant live preview of the generated output.
- **Local-First Architecture:** All templates and settings are stored locally in `chrome.storage.local`. Optional device sync (β) keeps templates updated across browsers signed into the same Google account via `chrome.storage.sync`.
- **Lightweight Productivity Tool:** Pure Vanilla JS extension built with zero external dependencies for maximum privacy and performance.

## 🔒 Privacy & Security

- **100% Local Execution:** Runs completely inside your browser with zero external server communication, tracking, telemetry, or remote analytics.
- **Zero Third-Party Dependencies:** Written in Pure Vanilla JS with zero external libraries or heavy build toolchains.
- **Zero Data Collection:** Your templates, dynamic variables, and clipboard data are never transmitted to any third party.

## Installation

### 🚀 Chrome Web Store (Recommended)

Install directly from the [Chrome Web Store](https://chromewebstore.google.com/detail/egmememialdjhohecnfkimpablkjfabg).

### 🛠️ Developer Mode (From Source)

1. Download the latest `FlexPaste-Solo-vX.X.X.zip` from Releases or clone this repository.
2. Open `chrome://extensions` in Chrome and enable **Developer mode**.
3. Click **Load unpacked** and select the `projects/app` folder.

## Usage

1. Open options via the extension icon or right-click context menu "⚙ Settings".
2. Create categories, set workdays/time rounding intervals, and edit templates using variable chips.
3. Right-click any text field (`<input>`, `<textarea>`, or `[contenteditable]`), select `FlexPaste`, and pick your template to insert instantly.

---

## 🇯🇵 日本語

### FlexPaste-Solo - 定型文＆動的変数ペースト挿入

**FlexPaste-Solo** は、右クリック（コンテキストメニュー）を起点とし、設定画面で事前作成したカテゴリ別テンプレートと動的変数を組み合わせて、ペーストした瞬間に文脈や現在日時を即座に反映・完成させる定型文流し込みツールです。

### 主な特徴

- **2階層コンテキストメニュー:** カテゴリ別のグループ化により、膨大な定型文も迷わずスムーズに右クリックから選択・挿入可能。
- **リアルタイム動的変数エンジン:** 日時 (`{{date_with_day}}`, `{{time}}`)、相対日付 (`{{tomorrow}}`)、月末・稼働日 (`{{month_last_workday}}`)、カテゴリ定義文 (`{{def_1}}`, `{{def_2}}`, `{{def_3}}`) を挿入の瞬間に自動計算して適用。
- **高度なペースト入力モード:** 直接的なテキスト挿入に対応していない **GitHub**、**Microsoft Loop**、**Teams** 等のWebアプリケーションでも確実にテンプレートを入力可能。
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
