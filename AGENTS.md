# FlexPaste-Solo 開発・エージェントガイドライン

## プロジェクト概要
FlexPaste-Soloは、右クリック（コンテキストメニュー）を起点とし、設定画面で事前作成したカテゴリ別テンプレートと動的変数を組み合わせて即座にペースト挿入する、ローカル完結型Chrome拡張機能です。

## 開発指針
1. **完全ローカル完結**: 外部サーバー、クラウドAPI、トラッキング、外部CDNなどは一切使用禁止。
2. **Material Design 3 (M3) 準拠**: Native CSS カスタムプロパティを使用し、GoogleのMaterial Design 3に完全準拠したUI/UXを提供すること。
3. **Vanilla JS & ゼロ依存**: フレームワーク（React/Vue等）、ビルドツール（Webpack/Vite等）、サードパーティライブラリを一切使用せず、ブラウザ標準技術（ES Modules, DOM API, HTML5, CSS3）のみで構成すること。
4. **日本語での対話**: このプロジェクトにおける開発者（エージェント）とのやり取り、PRのタイトル・説明、コミットメッセージ、ドキュメント等はすべて日本語で行うこと。

## ディレクトリ構成
- `projects/app/`: 拡張機能のソースコード
- `docs/`: 要件定義・技術仕様書 (`requirements.md` 等)
- `scripts/`: ビルド・ユーティリティスクリプト (`create_package.py`, `check_version.py`, `bump_version.py`)
- `.github/workflows/`: CI/CD ワークフロー定義

## ビルド・リリース
- `npm run build`: バージョン整合性を検証し、拡張機能のパッケージ（zip）を `releases/` に作成
- `npm run test`: バージョン整合性の検証 (`python3 scripts/check_version.py`)
- `npm run version:bump`: バージョン番号のインクリメント
