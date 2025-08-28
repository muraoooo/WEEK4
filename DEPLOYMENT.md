# Vercelデプロイメントガイド

## 📋 デプロイ前のチェックリスト

### 1. CSR対策の実装済み項目
- ✅ MUI DataGridの代わりにシンプルなTableコンポーネントを使用
- ✅ Chart.jsコンポーネントを動的インポート（SSR無効化）
- ✅ すべてのクライアントコンポーネントに`'use client'`ディレクティブ追加
- ✅ vercel.json設定ファイルの最適化

### 2. 環境変数の設定
Vercel Dashboardで以下の環境変数を設定してください：

```bash
# Database
MONGODB_URI=mongodb+srv://adimin:gpt5love@cluster0.zu4p8ot.mongodb.net/embrocal?retryWrites=true&w=majority&appName=Cluster0

# JWT Secrets
JWT_SECRET=secure-jwt-secret-key-for-production
JWT_ACCESS_SECRET=access-token-secret-key-production
JWT_REFRESH_SECRET=refresh-token-secret-key-production

# NextAuth
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=krcGUyE4WQ0vI4rigcdNyIIhoLTvaESZ9OHXIZa4Pak=

# Email Configuration
EMAIL_SERVER_HOST=miraichimoonshot.sakura.ne.jp
EMAIL_SERVER_PORT=587
EMAIL_SERVER_SECURE=false
EMAIL_SERVER_USER=noreply@miraichimoonshot.sakura.ne.jp
EMAIL_SERVER_PASSWORD=Vhdyt4@k52uhViB
EMAIL_FROM="Survibe <noreply@miraichimoonshot.sakura.ne.jp>"

# Legacy SMTP
SMTP_HOST=miraichimoonshot.sakura.ne.jp
SMTP_PORT=587
SMTP_USER=noreply@miraichimoonshot.sakura.ne.jp
SMTP_PASS=Vhdyt4@k52uhViB

# Security
ADMIN_SECRET_KEY=admin-production-secret-key
AUDIT_LOG_SECRET=your-audit-log-secret-key
NEXT_PUBLIC_ADMIN_SECRET=admin-production-secret-key
```

## 🚀 デプロイ手順

### 方法1: Vercel CLI を使用
```bash
# Vercel CLIのインストール
npm i -g vercel

# ログイン
vercel login

# デプロイ
vercel

# プロダクションデプロイ
vercel --prod
```

### 方法2: GitHubと連携
1. GitHubリポジトリにプッシュ
2. Vercelダッシュボードで「Import Project」
3. GitHubリポジトリを選択
4. 環境変数を設定
5. 「Deploy」をクリック

## ⚙️ Vercel設定の詳細

### vercel.json の設定内容
- **リージョン**: 東京（hnd1）
- **関数のタイムアウト**: 30秒
- **メモリ**: 1024MB
- **セキュリティヘッダー**: 設定済み

### ビルド最適化
- 動的インポートによるバンドルサイズ削減
- クライアントコンポーネントの最適化
- 不要なSSRの無効化

## 🔍 デプロイ後の確認事項

### 1. 基本動作確認
- [ ] トップページが表示される
- [ ] 管理画面ダッシュボードにアクセスできる
- [ ] APIエンドポイントが正常に動作する

### 2. データベース接続
- [ ] MongoDB Atlasへの接続が成功
- [ ] データの読み取り/書き込みが可能

### 3. 認証機能
- [ ] ログイン/ログアウトが機能する
- [ ] セッション管理が正常

### 4. メール送信
- [ ] メール送信機能が動作する（テスト送信）

## 🐛 トラブルシューティング

### よくあるエラーと対処法

#### 1. ビルドエラー: "Cannot read properties of undefined"
**原因**: SSR時にクライアント専用コンポーネントが実行される
**対処**: 該当コンポーネントを動的インポートに変更

#### 2. MongoDB接続エラー
**原因**: IPホワイトリストの設定不足
**対処**: MongoDB AtlasでVercelのIPを許可（0.0.0.0/0 を設定）

#### 3. 環境変数が読み込まれない
**原因**: Vercelで環境変数が設定されていない
**対処**: Vercelダッシュボードで環境変数を確認・設定

#### 4. API関数のタイムアウト
**原因**: 処理時間が長すぎる
**対処**: vercel.jsonでmaxDurationを調整（最大30秒）

## 📊 パフォーマンス監視

### Vercel Analytics
- Core Web Vitalsの監視
- リアルタイムパフォーマンスデータ
- エラー追跡

### 推奨メトリクス目標
- **LCP**: < 2.5秒
- **FID**: < 100ms
- **CLS**: < 0.1

## 🔄 継続的デプロイメント

### 自動デプロイの設定
1. mainブランチへのプッシュで自動デプロイ
2. プルリクエストでプレビューデプロイ
3. 環境別の設定管理

### デプロイフロー
```
開発 (localhost) 
  ↓ 
プレビュー (PR) 
  ↓ 
ステージング (staging branch)
  ↓ 
本番 (main branch)
```

## 📝 注意事項

1. **セキュリティ**: 本番環境では必ず強力なシークレットキーを使用
2. **スケーリング**: トラフィックに応じてVercelのプランを調整
3. **監視**: エラーログとパフォーマンスを定期的にチェック
4. **バックアップ**: MongoDBの自動バックアップを設定

## 🆘 サポート

問題が発生した場合：
1. Vercelのデプロイログを確認
2. ブラウザのコンソールエラーを確認
3. MongoDBのログを確認
4. 環境変数の設定を再確認