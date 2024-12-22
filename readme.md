# Slack Thanks Bot

Slackで感謝のメッセージを送信できるボットアプリケーションです。公開/非公開、記名/匿名での送信に対応しています。

## 機能概要

- スラッシュコマンドによる感謝メッセージの送信
- 公開（#thanks-boardチャンネル）または非公開（DM）での送信
- 記名または匿名での送信
- モーダルUIによる直感的な操作

## セットアップ手順

### 1. Slack App の作成

1. [Slack API](https://api.slack.com/apps) にアクセス
2. 「Create New App」をクリック
3. 「From scratch」を選択
4. App Name と workspace を設定

### 2. Bot Token Scopes の設定

「OAuth & Permissions」セクションで以下の権限を追加：

- `chat:write` - メッセージの送信
- `im:write` - DMの作成
- `commands` - スラッシュコマンドの使用
- `users:read` - ユーザー情報の読み取り

### 3. Slash Command の設定

1. 「Slash Commands」セクションで「Create New Command」をクリック
2. 以下を設定：
   - Command: `/thanks`（任意）
   - Request URL: デプロイ後のWebアプリケーションURL
   - Short Description: 「感謝のメッセージを送信」など
   - Usage Hint: 任意

### 4. Interactivity の有効化

1. 「Interactivity & Shortcuts」を有効化
2. Request URLにデプロイ後のWebアプリケーションURLを設定

### 5. Google Apps Script (GAS) の設定

1. 新規GASプロジェクトを作成
2. コードをコピー
3. スクリプトプロパティに以下を設定：
   - キー: `SLACK_BOT_TOKEN`
   - 値: Slack AppのBot User OAuth Token

### 6. デプロイ

1. 「デプロイ」→「新しいデプロイ」をクリック
2. 「種類の選択」→「ウェブアプリケーション」を選択
3. 以下を設定：
   - 次のユーザーとして実行: 自分
   - アクセスできるユーザー: 全員
4. 「デプロイ」をクリック
5. 生成されたURLをSlackアプリの各種Request URLに設定

### 7. Slack ワークスペースへのインストール

1. 「Install App」セクションからワークスペースにアプリをインストール
2. 必要なチャンネル（#thanks-board）を作成
3. ボットをチャンネルに招待（`/invite @ボット名`）

## 使用方法

1. Slackで `/thanks` コマンドを入力
2. モーダルが開くので以下を入力：
   - 送信先ユーザー
   - メッセージ内容
   - 公開/非公開設定
   - 記名/匿名設定
3. 「送信」をクリック

## トラブルシューティング

### よくあるエラー

1. **「Slack BOTトークンが設定されていません」**
   - スクリプトプロパティに`SLACK_BOT_TOKEN`が正しく設定されているか確認

2. **「無効なリクエストです」**
   - Request URLが正しく設定されているか確認
   - デプロイ後のURLが最新か確認

3. **Slackからのレスポンスエラー**
   - ボットの権限設定を確認
   - チャンネルへのボットの招待状況を確認

## メンテナンス情報

### ログの確認

- GASの実行ログでエラーや動作を確認可能
- 主要な処理でログ出力を実装済み

### コード構成

- `CONFIG`: 設定値の定数
- `SCRIPT_PROPERTIES`: スクリプトプロパティのキー定義
- `SLACK_API`: Slack API関連の定数
- 各関数は役割ごとにモジュール化

### 拡張ポイント

1. メッセージフォーマットの変更
   - `handleViewSubmission`内の`messageText`を編集

2. 新機能の追加
   - `blocks`配列に新しい入力項目を追加
   - 対応する処理を`handleViewSubmission`に実装
