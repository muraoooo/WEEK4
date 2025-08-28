# Secure Session System - 完全システムドキュメント

## 目次
1. [システム概要](#システム概要)
2. [環境設定](#環境設定)
3. [データベース構成](#データベース構成)
4. [実装済み機能](#実装済み機能)
5. [よくあるエラーと解決方法](#よくあるエラーと解決方法)
6. [API仕様](#api仕様)
7. [重要な実装ポイント](#重要な実装ポイント)

## システム概要

### プロジェクト構成
- **フレームワーク**: Next.js 13+ (App Router)
- **言語**: TypeScript
- **データベース**: MongoDB (MongoDB Atlas)
- **UIライブラリ**: Material-UI (MUI) v5
- **認証**: JWT + bcryptjs
- **メール送信**: Nodemailer

### 主要機能
- ユーザー管理システム（管理者向け）
- 投稿管理システム
- セッション管理
- 監査ログ機能
- メール通知機能

## 環境設定

### 必須の環境変数 (.env.local)
```env
# Database
MONGODB_URI=mongodb+srv://adimin:gpt5love@cluster0.zu4p8ot.mongodb.net/embrocal?retryWrites=true&w=majority&appName=Cluster0

# JWT Secrets
JWT_SECRET=secure-jwt-secret-key-for-development
JWT_ACCESS_SECRET=access-token-secret-key-development
JWT_REFRESH_SECRET=refresh-token-secret-key-development

# Environment
NODE_ENV=development
NEXTAUTH_URL=http://localhost:3000

# Email Configuration
EMAIL_SERVER_USER=noreply@miraichimoonshot.sakura.ne.jp
EMAIL_SERVER_PASSWORD=Vhdyt4@k52uhViB
EMAIL_SERVER_HOST=miraichimoonshot.sakura.ne.jp
EMAIL_SERVER_PORT=587
EMAIL_SERVER_SECURE=false
EMAIL_FROM="Survibe <noreply@miraichimoonshot.sakura.ne.jp>"

# Legacy SMTP (for backward compatibility)
SMTP_HOST=miraichimoonshot.sakura.ne.jp
SMTP_PORT=587
SMTP_USER=noreply@miraichimoonshot.sakura.ne.jp
SMTP_PASS=Vhdyt4@k52uhViB

# Security
ADMIN_SECRET_KEY=admin-development-secret-key
```

## データベース構成

### コレクション構造

#### users コレクション
```javascript
{
  _id: ObjectId,
  email: String (required, unique),
  name: String,
  password: String (hashed),
  role: String ('admin' | 'moderator' | 'user'),
  status: String ('active' | 'suspended' | 'banned' | 'deleted'),
  warningCount: Number (default: 0),
  createdAt: Date,
  updatedAt: Date,
  lastLoginAt: Date,
  emailVerified: Boolean,
  profilePicture: String,
  bio: String
}
```

#### posts コレクション
```javascript
{
  _id: ObjectId,
  authorId: String,
  authorName: String,
  authorEmail: String,
  author: ObjectId (reference to users),
  content: String,
  likes: Array<String>,
  comments: Array,
  isDeleted: Boolean,
  isHidden: Boolean,
  reported: Boolean,
  reportCount: Number,
  createdAt: Date,
  updatedAt: Date
}
```

#### audit_logs コレクション
```javascript
{
  _id: ObjectId,
  timestamp: Date,
  action: String ('ROLE_CHANGE' | 'WARNING' | 'SUSPEND' | 'REACTIVATE' | 'PROFILE_UPDATE' | etc.),
  adminId: String,
  targetUserId: String,
  targetUserEmail: String,
  details: Object,
  ipAddress: String,
  userAgent: String
}
```

#### user_sessions コレクション
```javascript
{
  _id: ObjectId,
  sessionId: String,
  userId: String,
  token: String,
  createdAt: Date,
  lastActivity: Date,
  expiresAt: Date,
  ipAddress: String,
  userAgent: String,
  isActive: Boolean,
  deviceType: String,
  location: String
}
```

### データベース初期設定スクリプト

#### 1. ユーザーデータの更新 (/scripts/update-users.js)
```bash
node scripts/update-users.js
```
このスクリプトは既存のユーザーに不足しているフィールドを追加します。

#### 2. 監査ログの作成 (/scripts/create-audit-logs.js)
```bash
node scripts/create-audit-logs.js
```
テスト用の監査ログとアクティビティ履歴を生成します。

## 実装済み機能

### 1. ユーザー管理 (/app/admin/users)

#### 機能一覧
- ユーザー一覧表示（ページネーション：50件/ページ）
- 検索機能（メール・名前）
- フィルタリング（権限・ステータス）
- ユーザー詳細表示
- 新規ユーザー作成
- ユーザーアクション（警告・停止・BAN・再有効化・削除）
- 一括操作機能
- 監査ログ記録

#### 重要なファイル
- `/app/admin/users/page.tsx` - ユーザー一覧ページ
- `/app/admin/users/[id]/page.tsx` - ユーザー詳細ページ
- `/app/admin/users/new/page.tsx` - 新規ユーザー作成ページ
- `/app/api/admin/users/route.ts` - ユーザー管理API

### 2. 投稿管理 (/app/admin/posts)

#### 機能一覧
- 投稿一覧表示
- 投稿内容の詳細表示
- 投稿の非表示/削除/復元
- いいね数・コメント数の表示
- 通報状況の管理

#### 重要なファイル
- `/app/admin/posts/page.tsx` - 投稿一覧ページ
- `/app/api/admin/posts/route.ts` - 投稿管理API

### 3. メール送信機能

#### 実装内容
- ウェルカムメール送信
- パスワードリセットメール
- Nodemailerを使用したSMTP送信

#### 重要なファイル
- `/lib/email.ts` - メール送信ユーティリティ

## よくあるエラーと解決方法

### 1. MUI DataGrid SSRエラー

#### エラー内容
```
Runtime TypeError: Cannot read properties of undefined (reading 'size')
```

#### 原因
DataGridはクライアントサイドコンポーネントで、SSRと互換性がない。

#### 解決方法
シンプルなMUI Tableコンポーネントに置き換える：

```typescript
// ❌ DataGridを使用（SSRエラー）
import { DataGrid } from '@mui/x-data-grid';

// ✅ シンプルなTableを使用
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
```

### 2. フィルターラベル表示問題

#### 問題
SelectコンポーネントでラベルがValueとして表示される

#### 解決方法
```typescript
<FormControl size="small">
  <InputLabel shrink>権限</InputLabel>
  <Select
    value={roleFilter}
    label="権限"
    displayEmpty
    notched
    renderValue={(selected) => {
      if (selected === '') return <span style={{ color: '#999' }}>すべて</span>;
      const roleMap = { admin: '管理者', moderator: 'モデレーター', user: 'ユーザー' };
      return roleMap[selected] || selected;
    }}
  >
    <MenuItem value="">すべて</MenuItem>
    <MenuItem value="admin">管理者</MenuItem>
    <MenuItem value="moderator">モデレーター</MenuItem>
    <MenuItem value="user">ユーザー</MenuItem>
  </Select>
</FormControl>
```

### 3. Timeline Component エラー

#### エラー内容
```
Element type is invalid: expected a string... but got: undefined
```

#### 原因
MUI Lab v5のTimelineコンポーネントが正しくインポートできない

#### 解決方法
ListベースのUIに置き換える：

```typescript
// ❌ Timelineを使用
import Timeline from '@mui/lab/Timeline';

// ✅ Listを使用
import { List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
```

### 4. Nodemailer Import エラー

#### エラー内容
```
TypeError: nodemailer.createTransporter is not a function
```

#### 解決方法
requireを使用：

```javascript
// ❌ ESModuleインポート
import nodemailer from 'nodemailer';

// ✅ CommonJS require
const nodemailer = require('nodemailer');
```

### 5. MongoDB接続エラー

#### 確認事項
1. MongoDBURIが正しく設定されているか
2. IPアドレスがMongoDB Atlasでホワイトリスト登録されているか
3. データベース名が正しいか（embrocal）

## API仕様

### ユーザー管理API

#### GET /api/admin/users
ユーザー一覧取得
```typescript
Query Parameters:
- page: number (ページ番号)
- limit: number (1ページあたりの件数)
- search: string (検索キーワード)
- role: string (権限フィルター)
- status: string (ステータスフィルター)

Response:
{
  users: User[],
  total: number,
  page: number,
  limit: number
}
```

#### POST /api/admin/users
新規ユーザー作成
```typescript
Body:
{
  email: string,
  name: string,
  password: string,
  role: string,
  sendWelcomeEmail: boolean
}

Response:
{
  success: boolean,
  message: string,
  userId?: string
}
```

#### GET /api/admin/users/[id]
ユーザー詳細取得
```typescript
Response:
{
  user: User,
  auditLogs: AuditLog[],
  sessions: Session[]
}
```

### 投稿管理API

#### GET /api/admin/posts
投稿一覧取得
```typescript
Response:
{
  posts: Post[],
  total: number,
  active: number,
  hidden: number,
  deleted: number
}
```

#### DELETE /api/admin/posts
投稿削除（論理削除）
```typescript
Query Parameters:
- id: string (投稿ID)

Response:
{
  success: boolean,
  message: string
}
```

#### PUT /api/admin/posts
投稿ステータス更新
```typescript
Body:
{
  postId: string,
  action: 'hide' | 'unhide' | 'restore'
}

Response:
{
  success: boolean,
  message: string
}
```

## 重要な実装ポイント

### 1. MongoDB データの取得と表示

すべてのデータは必ずMongoDBから取得する：

```typescript
// ユーザー情報を取得
const usersCollection = mongoose.connection.collection('users');
const users = await usersCollection
  .find(filter)
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip(skip)
  .toArray();

// nullチェックとデフォルト値の設定
const formattedUsers = users.map(user => ({
  _id: user._id,
  email: user.email,
  name: user.name || 'Unknown',
  role: user.role || 'user',
  status: user.status || 'active',
  warningCount: user.warningCount || 0,
  createdAt: user.createdAt || new Date(),
  lastLoginAt: user.lastLoginAt || null
}));
```

### 2. セキュリティ対策

#### パスワードのハッシュ化
```typescript
const bcrypt = require('bcryptjs');
const hashedPassword = await bcrypt.hash(password, 10);
```

#### 管理者権限の確認
```typescript
// APIルートで管理者権限を確認
const isAdmin = request.headers.get('x-admin-secret') === process.env.ADMIN_SECRET_KEY;
if (!isAdmin) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### 3. エラーハンドリング

```typescript
try {
  await connectDatabase();
  // 処理
} catch (error) {
  console.error('Error:', error);
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
```

### 4. ページネーション実装

```typescript
const handleChangePage = (event: unknown, newPage: number) => {
  setPage(newPage);
};

const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
  setRowsPerPage(parseInt(event.target.value, 10));
  setPage(0);
};

// データのスライス
const paginatedData = filteredData.slice(
  page * rowsPerPage,
  page * rowsPerPage + rowsPerPage
);
```

## トラブルシューティング

### 開発サーバーの起動
```bash
npm run dev
```

### データベーススクリプトの実行順序
1. `node scripts/update-users.js` - ユーザーフィールドの更新
2. `node scripts/create-audit-logs.js` - テストデータの作成

### よくある質問

**Q: メールが送信されない**
A: .env.localのSMTP設定を確認し、ファイアウォールでポート587が開いていることを確認してください。

**Q: MongoDBに接続できない**
A: MongoDB AtlasのNetwork AccessでIPアドレスが許可されているか確認してください。

**Q: 日本語が文字化けする**
A: ファイルのエンコーディングがUTF-8になっているか確認してください。

## 今後の拡張ポイント

1. **テストコードの実装**
   - Jestを使用した単体テスト
   - Cypressを使用したE2Eテスト

2. **パフォーマンスの最適化**
   - インデックスの追加
   - キャッシュの実装
   - 画像の遅延読み込み

3. **セキュリティの強化**
   - Rate limiting
   - CSRF protection
   - Content Security Policy

4. **機能の追加**
   - リアルタイム通知
   - ダッシュボード分析
   - エクスポート機能

## メンテナンス

### ログの確認
```bash
# サーバーログ
npm run dev

# MongoDBログ
MongoDB Atlasのダッシュボードから確認
```

### バックアップ
MongoDB Atlasの自動バックアップ機能を使用

### 監視
- エラー監視: コンソールログを確認
- パフォーマンス監視: Chrome DevToolsを使用

---

このドキュメントは定期的に更新してください。
最終更新日: 2025年8月27日