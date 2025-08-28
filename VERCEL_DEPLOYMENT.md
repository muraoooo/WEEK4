# Vercel デプロイメントガイド

## 🚀 デプロイ手順

### 1. GitHub リポジトリ
✅ 既に設定済み: https://github.com/muraoooo/WEEK4.git

### 2. Vercel でのプロジェクト作成

1. [Vercel](https://vercel.com) にログイン
2. "New Project" をクリック
3. GitHub リポジトリ `muraoooo/WEEK4` をインポート
4. プロジェクト名を設定（例: secure-session-system）

### 3. 環境変数の設定

Vercel のプロジェクト設定で以下の環境変数を追加してください：

```env
# MongoDB接続
MONGODB_URI=mongodb+srv://adimin:gpt5love@cluster0.zu4p8ot.mongodb.net/embrocal?retryWrites=true&w=majority&appName=Cluster0

# JWT シークレット（本番環境用に変更してください）
JWT_ACCESS_SECRET=your-secure-access-secret-here
JWT_REFRESH_SECRET=your-secure-refresh-secret-here

# その他のオプション
CUSTOM_KEY=your-custom-key-here
```

⚠️ **重要**: 本番環境では必ず強力なランダムな文字列を JWT シークレットに使用してください。

### 4. ビルド設定

Vercel は自動的に Next.js プロジェクトを検出しますが、以下の設定を確認してください：

- **Framework Preset**: Next.js
- **Build Command**: `npm run build` (デフォルト)
- **Output Directory**: `.next` (デフォルト)
- **Install Command**: `npm install` (デフォルト)

### 5. デプロイ

1. "Deploy" ボタンをクリック
2. ビルドログを確認
3. デプロイが成功すると、自動的に URL が生成されます

### 6. デプロイ後の確認

デプロイ後、以下を確認してください：

1. **ホームページ**: `https://your-app.vercel.app/`
2. **ログインページ**: `https://your-app.vercel.app/login`
3. **管理ダッシュボード**: `https://your-app.vercel.app/admin/dashboard`

### 📝 トラブルシューティング

#### MongoDB 接続エラー
- MongoDB Atlas のネットワークアクセスで、Vercel の IP アドレス（0.0.0.0/0）を許可してください

#### ビルドエラー
- Node.js バージョンが 18.18.0 以上であることを確認
- 依存関係が正しくインストールされているか確認

#### 500 エラー
- 環境変数が正しく設定されているか確認
- Vercel のログで詳細なエラーを確認

### 🔒 セキュリティ推奨事項

1. **JWT シークレット**: 本番環境では必ず強力なランダム文字列を使用
2. **MongoDB パスワード**: 定期的に変更
3. **CORS 設定**: 必要に応じて制限を追加
4. **レート制限**: 本番環境では Redis などを使用した永続的なレート制限を実装

### 📚 参考リンク

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Environment Variables](https://vercel.com/docs/projects/environment-variables)