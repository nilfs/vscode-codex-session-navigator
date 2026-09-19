# 技術仕様

## 構成

- `extension.js`: Tree View、コマンド、Codexエディター連携
- `lib/codex-state.js`: Codexの状態データベース読み取りと正規化
- `lib/workspace-paths.js`: ワークスペースとセッションのパス照合
- `lib/session-command-values.js`: コンテキストメニュー引数の処理

拡張機能本体に外部ランタイム依存はありません。開発時のみPrettierを使用します。

## セッションの取得

1. `CODEX_HOME`、未設定の場合は `~/.codex` を参照します。
2. 番号が最大の `state_*.sqlite` を読み取り専用で開きます。
3. `threads` テーブルから `source = 'vscode'` のセッションを取得します。
4. `codexSessionNavigator.showArchived` が無効な場合は、アーカイブ済みセッションを除外します。
5. 更新日時の新しい順に並べます。

必須列は `id`、`cwd`、`source`、`archived` です。スキーマに互換性がない場合は推測を行わず、ビュー内にエラーを表示します。

表示名には、`name`、`preview`、`title`、`first_user_message`、`id` の順で最初の空でない値を使用します。

## ワークスペースとの照合

セッションの `threads.cwd` が、開いているワークスペースフォルダ自身またはその子孫である場合に表示します。複数ルートのワークスペースでは、いずれかのルートに一致すれば対象になります。

Windowsでは次の差異を正規化します。

- 大文字と小文字
- 末尾の区切り文字
- `\\?\` と `\\?\UNC\` デバイスパス接頭辞

`threads.cwd` はセッション単位の作業ルートです。途中で個別コマンドの実行先を別フォルダへ変更しても、セッションの所属先は変わりません。

## Codexセッションを開く仕組み

Codex IDE拡張には、他の拡張機能がセッション一覧を取得したり、IDを指定して開いたりするための公開APIがありません。

この拡張機能は、選択したIDから `openai-codex://route/local/<session-id>` URIを作成し、公式拡張の `chatgpt.conversationEditor` で開きます。そのため、公式拡張の内部仕様変更による影響を受ける可能性があります。

セッションIDはURI作成前に英数字、ピリオド、アンダースコア、ハイフンだけに制限しています。

## 設定

| 設定                                 | 型      | 既定値  | 説明                                         |
| ------------------------------------ | ------- | ------- | -------------------------------------------- |
| `codexSessionNavigator.showArchived` | boolean | `false` | アーカイブ済みセッションも一覧に表示します。 |

ビュー上部の表示切り替えボタンは、この設定の実効スコープへ値を保存します。設定ファイルから変更した場合も一覧を自動更新します。

## データとプライバシー

- CodexのSQLiteデータベースは読み取り専用で開きます。
- セッションの書き換え、削除、アーカイブ操作は行いません。
- この拡張機能自身はネットワーク通信、テレメトリ、ファイル監視を行いません。
- セッションを開いた後の通信や認証は、公式Codex拡張の動作です。

## テストとパッケージ

- `npm test`: Node.jsによる単体テスト
- `integration/extension-host-tests.js`: VS Code Extension Host上のコマンド統合テスト
- `npm run format:check`: Prettierによるフォーマット検証
- `npm run check`: フォーマット検証と単体テスト
- `npm run package`: `dist/codex-session-navigator-0.2.0.vsix` を生成
