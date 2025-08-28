# Vercel デプロイメント環境変数設定ガイド

## 🚀 クイックスタート

### 1. GitHubリポジトリ
- **URL**: https://github.com/muraoooo/WEEK4
- **ブランチ**: main

### 2. Vercelプロジェクト設定

#### プロジェクト名候補（いずれか選択）
```
mura-secure-session-2024
embrocal-admin-system
secure-auth-panel-mb1
muraoooo-week4-admin
```

## 📝 必須環境変数

以下の環境変数をVercelのEnvironment Variablesに設定してください：

```bash
# データベース接続
MONGODB_URI=mongodb+srv://adimin:gpt5love@cluster0.zu4p8ot.mongodb.net/embrocal?retryWrites=true&w=majority&appName=Cluster0

# 認証設定（NEXTAUTH_URLはプロジェクト名に合わせて変更）
NEXTAUTH_URL=https://[your-project-name].vercel.app
NEXTAUTH_SECRET=krcGUyE4WQ0vI4rigcdNyIIhoLTvaESZ9OHXIZa4Pak=

# JWT設定
JWT_SECRET=krcGUyE4WQ0vI4rigcdNyIIhoLTvaESZ9OHXIZa4Pak=
JWT_REFRESH_SECRET=oPoQInQC1MTyqqIkLY9U9zim5JblK72D4CNTp2y0AMs=

# 管理者設定
ADMIN_SECRET_KEY=admin-production-secret-key-2024

# メール設定
EMAIL_SERVER_USER=noreply@miraichimoonshot.sakura.ne.jp
EMAIL_SERVER_PASSWORD=Vhdyt4@k52uhViB
EMAIL_SERVER_HOST=miraichimoonshot.sakura.ne.jp
EMAIL_SERVER_PORT=587
EMAIL_FROM=Survibe <noreply@miraichimoonshot.sakura.ne.jp>

# 環境設定
NODE_ENV=production
```

## 🔧 Vercelでのデプロイ手順

### ステップ 1: Vercelにログイン
1. https://vercel.com にアクセス
2. GitHubアカウントでログイン

### ステップ 2: 新しいプロジェクトを作成
1. 「New Project」をクリック
2. GitHubリポジトリ「muraoooo/WEEK4」をインポート
3. プロジェクト名を設定（上記の候補から選択）

### ステップ 3: 環境変数を設定
1. 「Environment Variables」セクションで上記の変数をすべて追加
2. 各変数で「Production」「Preview」「Development」すべてにチェック
3. **注意**: `NEXTAUTH_URL`の値をプロジェクトURLに合わせて変更

### ステップ 4: デプロイ
1. すべての設定を確認
2. 「Deploy」ボタンをクリック
3. デプロイ完了を待つ（約2-3分）

## ✅ デプロイ後の確認

### アクセスURL
```
https://[your-project-name].vercel.app/admin/dashboard
```

### デフォルト管理者認証
- 管理画面へのアクセスには`ADMIN_SECRET_KEY`が必要です
- APIエンドポイントには`x-admin-secret`ヘッダーが必要です

## 🔍 トラブルシューティング

### よくあるエラーと解決方法

#### 1. MongoDB接続エラー
- MongoDB AtlasのNetwork AccessでIP「0.0.0.0/0」を許可

#### 2. 認証エラー
- `NEXTAUTH_URL`が正しいVercel URLになっているか確認

#### 3. メール送信エラー
- SMTP設定が正しいか確認
- ポート587でTLSが有効になっているか確認

## 📊 管理画面の機能

### 利用可能な管理機能
- `/admin/dashboard` - ダッシュボード
- `/admin/users` - ユーザー管理
- `/admin/sessions` - セッション管理
- `/admin/posts` - 投稿管理
- `/admin/reports` - レポート管理
- `/admin/audit-logs` - 監査ログ
- `/admin/settings` - システム設定

## 🛡️ セキュリティ注意事項

1. **本番環境では必ず変更すべき値**：
   - `ADMIN_SECRET_KEY`
   - `JWT_REFRESH_SECRET`（既に生成済み）

2. **MongoDB Atlas設定**：
   - 本番環境用の専用ユーザーを作成推奨
   - IPホワイトリストを適切に設定

3. **定期的なメンテナンス**：
   - シークレットキーの定期的な更新
   - 監査ログの定期的な確認

---
最終更新: 2024年12月28日