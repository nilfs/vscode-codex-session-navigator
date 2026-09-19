# Codex Sessions

現在のVS Codeワークスペースに関連するローカルCodexセッションを、サイドバーからすばやく探して開くための拡張機能です。

## 主な機能

- 現在のワークスペースに関連するセッションだけを一覧表示
- 選択したセッションをCodexのエディタータブで開く
- アーカイブ済みセッションの表示切り替え
- セッション名とセッションIDのコピー

セッションデータの変更、削除、アーカイブ操作は行いません。

## 必要条件

- VS Code 1.138以降
- 公式OpenAI Codex拡張機能（`openai.chatgpt`）
- ローカルのWindows、macOS、Linux環境

Remote SSH、Dev Container、WSLのリモートウィンドウには対応していません。

## インストール

GitHub Releasesで公開されるVSIXを取得し、VS Codeの `Extensions: Install from VSIX...` でインストールします。

ローカルでVSIXを作成する場合:

```console
npm ci
npm run package
```

生成先は `dist/codex-session-0.2.0.vsix` です。

## 使い方

1. Activity BarのCodex Sessionsアイコンを開きます。
2. `Current Workspace` の一覧からセッションを選択します。
3. 必要に応じて、ビュー上部の目のアイコンでアーカイブ済みセッションの表示を切り替えます。

セッションを右クリックすると、表示名またはセッションIDをコピーできます。アーカイブ表示の選択は `codexSession.showArchived` 設定に保存されます。

## 開発

```console
npm ci
npm run check
npm run package
```

コードを自動整形する場合は `npm run format` を実行します。

## 互換性

この拡張機能はCodexのローカルデータと内部エディター連携を利用しています。Codex拡張の更新により動作しなくなる可能性があります。

実装方式とデータの扱いについては `docs/technical-design.md` を参照してください。

## ライセンス

MIT License（`LICENSE`）
