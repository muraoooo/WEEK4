# Secure Session System

エンタープライズレベルのセキュリティを提供する包括的なセッション管理システム

## 🔒 主要セキュリティ機能

- **JWT認証**: アクセストークン（15分）+ リフレッシュトークン（7日）
- **セキュアクッキー**: HTTPOnly、Secure、SameSite=Strict
- **セッションタイムアウト**: アイドル（30分）+ 絶対（8時間）+ 5分前警告
- **デバイスフィンガープリント**: 不正デバイス検出とリスクスコア計算
- **CSRF保護**: Double Submit Cookie方式
- **同時ログイン制御**: ユーザー/デバイス単位でのセッション制限
- **自動保存機能**: タイムアウト前のデータ保存

## 🚀 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript
- **データベース**: MongoDB with Mongoose
- **認証**: JWT (jsonwebtoken)
- **スタイリング**: Tailwind CSS
- **テスト**: Playwright (E2E)
- **デプロイ**: Vercel対応

## 📁 プロジェクト構造

```
secure-session-system/
├── app/
│   ├── api/auth/refresh/          # リフレッシュトークンAPI
│   ├── layout.tsx                 # ルートレイアウト
│   └── page.tsx                   # メインページ
├── lib/auth/                      # 認証・セッション管理
│   ├── jwt-service.ts             # JWT認証サービス
│   ├── cookie-service.ts          # セキュアクッキー管理
│   ├── device-service.ts          # デバイスフィンガープリント
│   ├── session-timeout.ts         # セッションタイムアウト管理
│   ├── csrf-service.ts            # CSRF保護
│   └── concurrent-session-control.ts # 同時ログイン制御
├── models/                        # データベースモデル
│   ├── UserSession.ts             # セッション管理
│   ├── TokenBlacklist.ts          # トークンブラックリスト
│   └── LoginAttempt.ts            # ログイン試行記録
├── tests/e2e/                     # E2Eテスト
└── types/                         # 型定義
```

## 🛠️ セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

```bash
cp .env.example .env.local
```

`.env.local`を編集して必要な環境変数を設定:

```env
# Database
MONGODB_URI=your-mongodb-connection-string

# JWT Secrets
JWT_SECRET=your-super-secret-jwt-key
JWT_ACCESS_SECRET=your-access-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Security
ADMIN_SECRET_KEY=your-admin-secret-key
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

アプリケーションは `http://localhost:3000` でアクセスできます。

## 🧪 テスト

### E2Eテストの実行

```bash
# Playwrightブラウザのインストール
npx playwright install

# テストの実行
npm run test

# UIモードでテスト実行
npm run test:ui
```

### ビルドテスト

```bash
npm run build
```

## 📚 API リファレンス

### リフレッシュトークン API

**POST** `/api/auth/refresh`

リフレッシュトークンを使用してアクセストークンを更新します。

**レスポンス例:**

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "expiresIn": 900,
  "refreshExpiresIn": 604800
}
```

**エラーレスポンス:**

```json
{
  "success": false,
  "error": {
    "code": "REFRESH_TOKEN_MISSING",
    "message": "Refresh token not found"
  }
}
```

## 🔒 セキュリティ機能詳細

### JWT認証

- **アクセストークン**: 15分の短い有効期限で高い安全性を確保
- **リフレッシュトークン**: 7日間有効で自動更新機能付き
- **トークンローテーション**: セキュリティ向上のための自動更新
- **ブラックリスト機能**: 無効化されたトークンの管理

### セキュアクッキー

- **HTTPOnly**: JavaScriptからのアクセスを防止
- **Secure**: HTTPS接続でのみ送信
- **SameSite=Strict**: CSRF攻撃を防止
- **パス制限**: 最小権限原則に基づく適用範囲制限

### デバイスフィンガープリント

- **識別要素**: User-Agent、画面解像度、タイムゾーン、言語設定
- **リスクスコア**: 0-100の数値でデバイスの危険度を評価
- **異常検知**: 不正なデバイスアクセスを自動検出
- **ブロック機能**: 高リスクデバイスの自動ブロック

### セッションタイムアウト

- **アイドルタイムアウト**: 30分操作なしで自動ログアウト
- **絶対タイムアウト**: 8時間で強制ログアウト
- **警告システム**: 5分前にポップアップ通知
- **自動保存**: 2分毎にフォームデータを保存
- **アクティビティ監視**: マウス、キーボード、タッチ操作を検知

## 🚀 Vercelデプロイ

### 1. Vercel CLIのインストール

```bash
npm install -g vercel
```

### 2. プロジェクトのデプロイ

```bash
vercel
```

### 3. 環境変数の設定

Vercelダッシュボードで以下の環境変数を設定:

- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `ADMIN_SECRET_KEY`

## 📊 モニタリング

システムには以下の監視機能が組み込まれています:

- **ログイン試行の記録**: 成功/失敗の詳細ログ
- **セッション統計**: アクティブセッション数の追跡
- **デバイス分析**: 新しいデバイスや疑わしいアクティビティの検出
- **リスクスコア**: セキュリティリスクの数値化

## 🔧 カスタマイズ

### タイムアウト設定の変更

```typescript
// lib/auth/session-timeout.ts
const DEFAULT_CONFIG: SessionTimeoutConfig = {
  idleTimeout: 30 * 60 * 1000,    // 30分
  absoluteTimeout: 8 * 60 * 60 * 1000, // 8時間
  warningTime: 5 * 60 * 1000,     // 5分前警告
  autoSaveInterval: 2 * 60 * 1000  // 2分毎自動保存
};
```

### セッション制限の変更

```typescript
// lib/auth/concurrent-session-control.ts
const DEFAULT_CONFIG: ConcurrentSessionConfig = {
  maxSessionsPerUser: 3,      // ユーザーあたり最大3セッション
  maxSessionsPerDevice: 1,    // デバイスあたり最大1セッション
  allowDuplicateDevice: false // 同一デバイス重複ログイン禁止
};
```

## 📝 ライセンス

MIT License

## 🤝 コントリビューション

プルリクエストやイシューの報告を歓迎します。

## 📞 サポート

質問やサポートが必要な場合は、GitHubのイシューを作成してください。