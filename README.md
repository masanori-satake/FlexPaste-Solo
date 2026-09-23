# FlexPaste-Solo - Smart Clipboard Templates

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/egmememialdjhohecnfkimpablkjfabg?logo=google-chrome&logoColor=white&label=Chrome%20Web%20Store)](https://chromewebstore.google.com/detail/egmememialdjhohecnfkimpablkjfabg)
[![version](https://img.shields.io/badge/version-1.2.2-blue)](projects/app/manifest.json)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Privacy: Local-First](https://img.shields.io/badge/Privacy-Local--First-brightgreen)](PRIVACY.md)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-orange)](projects/app/manifest.json)
[![Tests](https://img.shields.io/github/actions/workflow/status/masanori-satake/FlexPaste-Solo/code-quality.yml?branch=main&label=Tests)](https://github.com/masanori-satake/FlexPaste-Solo/actions/workflows/code-quality.yml)
[![Pure Vanilla JS](https://img.shields.io/badge/Pure%20Vanilla%20JS-Zero%20Dependencies-informational?logo=javascript&logoColor=white)](PRIVACY.md)

A privacy-focused **chrome-extension**, **clipboard-manager**, and **text-formatter** that allows you to instantly insert pre-configured categorized templates and dynamic variables directly from the right-click context menu.

## Overview

Repeatedly typing or copying repetitive messages, dates, times, or structured notes can drain focus and productivity. **FlexPaste-Solo** streamlines your daily workflow by organizing custom templates into categories and pairing them with dynamic variables such as dates, times, workdays, and custom definitions. In a single right-click, you can paste dynamically evaluated, pre-formatted templates into web applications like **GitHub**, **Microsoft Loop**, **Google Docs**, or online chats.

## Key Features

- **2-Tier Context Menu Pasting:** Organize custom templates into categories and select them quickly via right-click for immediate insertion.
- **Dynamic Variable Engine:** Automatically expands variable chips like `{{date_with_day}}`, `{{time}}`, `{{tomorrow}}`, `{{next_workday}}`, `{{month_last_workday}}`, and category definitions (`{{def_1}}`, `{{def_2}}`, `{{def_3}}`) at the moment of insertion.
- **Broad Paste Compatibility:** Native paste mode seamlessly inserts templates even into modern rich text editors and web applications (e.g., Teams, Microsoft Loop, GitHub) that restrict standard DOM text node insertion.
- **No-Code Chip UI & Live Preview:** Click or drag-and-drop variable chips directly into the template editor and inspect the generated output instantly with live preview.
- **Local-First Design:** All templates and settings are stored locally in `chrome.storage.local` by default. Optional cross-device sync (β) uses `chrome.storage.sync` to keep settings and templates synchronized across browsers signed into the same Google account.
- **Lightweight Productivity:** Built with Pure Vanilla JS without external dependencies to maximize privacy and performance.

## 🔒 Privacy & Security

- **Local-First:** Operates within your browser by default and saves settings and templates in `chrome.storage.local`. When sync is enabled, settings and templates are synchronized off-device via Chrome Sync (`chrome.storage.sync`). Excluding Chrome Sync, no external server communication, tracking, telemetry, or remote analytics are performed.
- **Zero Third-Party Dependencies:** Written in Pure Vanilla JS with no external libraries or heavy build toolchains.
- **No Data Collection:** The developer does not collect your templates, dynamic variables, or clipboard data. Only when sync is enabled are settings and templates saved and synced via Chrome Sync.

## Installation

### 🚀 Chrome Web Store (Recommended)

Install directly from the [Chrome Web Store](https://chromewebstore.google.com/detail/egmememialdjhohecnfkimpablkjfabg).

### 🛠️ Developer Mode (From Source)

1. Download the latest `FlexPaste-Solo-vX.X.X.zip` from Releases or clone this repository.
2. Open `chrome://extensions` in Chrome and enable **Developer mode**.
3. Click **Load unpacked** and select the `projects/app` folder.

## Usage

1. Open settings from the extension icon or "⚙ Settings" in the right-click context menu.
2. Create categories, configure workday rules or time rounding intervals, and edit templates using variable chips.
3. Right-click any text field (`<input>`, `<textarea>`, `[contenteditable]`), navigate to `FlexPaste`, and select your template for instant insertion.

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
