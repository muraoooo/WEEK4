# 完全システム構築ガイド - ゼロから動くアプリケーションを作る

## 📚 目次

1. [システム概要と全体アーキテクチャ](#1-システム概要と全体アーキテクチャ)
2. [環境構築と初期設定](#2-環境構築と初期設定)
3. [MongoDB Atlas のセットアップ](#3-mongodb-atlas-のセットアップ)
4. [プロジェクト構造の詳細](#4-プロジェクト構造の詳細)
5. [データベース設計とスキーマ](#5-データベース設計とスキーマ)
6. [認証とセキュリティ](#6-認証とセキュリティ)
7. [ユーザー管理システムの実装](#7-ユーザー管理システムの実装)
8. [投稿管理システムの実装](#8-投稿管理システムの実装)
9. [通報システムの実装](#9-通報システムの実装)
10. [メール送信システム](#10-メール送信システム)
11. [よくあるエラーと解決方法](#11-よくあるエラーと解決方法)
12. [開発時の重要な注意点](#12-開発時の重要な注意点)

---

## 1. システム概要と全体アーキテクチャ

### システムの目的
このシステムは、SNSプラットフォーム「Survibe」の管理システムです。ユーザー管理、投稿管理、通報処理、セッション管理など、SNSプラットフォームに必要な管理機能をすべて提供します。

### 技術スタック

```
フロントエンド:
├── Next.js 14 (App Router)
├── TypeScript
├── Material-UI v5
└── React 18

バックエンド:
├── Next.js API Routes
├── MongoDB (Mongoose)
└── Node.js

データベース:
└── MongoDB Atlas (クラウドDB)

認証・セキュリティ:
├── JWT (JSON Web Tokens)
├── bcryptjs (パスワードハッシュ化)
└── 環境変数による秘密情報管理

メール送信:
└── Nodemailer (SMTP)
```

### システム構成図

```
┌─────────────────────────────────────────────────┐
│                  ブラウザ (Client)               │
│         Material-UI コンポーネント               │
└─────────────────┬───────────────────────────────┘
                  │ HTTP/HTTPS
┌─────────────────▼───────────────────────────────┐
│              Next.js Application                 │
│  ┌──────────────────────────────────────────┐   │
│  │          App Router (Pages)               │   │
│  │  /admin/users, /admin/posts, etc.        │   │
│  └──────────────────┬───────────────────────┘   │
│                     │                            │
│  ┌──────────────────▼───────────────────────┐   │
│  │         API Routes (Backend)              │   │
│  │  /api/admin/users, /api/admin/posts      │   │
│  └──────────────────┬───────────────────────┘   │
└─────────────────────┼───────────────────────────┘
                      │
         ┌────────────▼──────────┐
         │   MongoDB Atlas       │
         │  ┌────────────────┐   │
         │  │ users          │   │
         │  │ posts          │   │
         │  │ reports        │   │
         │  │ audit_logs     │   │
         │  │ user_sessions  │   │
         │  └────────────────┘   │
         └───────────────────────┘
```

---

## 2. 環境構築と初期設定

### 必要なソフトウェア

```bash
# Node.js (v18以上)
node --version  # v18.x.x 以上であることを確認

# npm または yarn
npm --version   # 9.x.x 以上であることを確認

# Git
git --version
```

### プロジェクトの作成

```bash
# 1. Next.jsプロジェクトの作成
npx create-next-app@latest secure-session-system --typescript --app --tailwind

# 2. プロジェクトディレクトリに移動
cd secure-session-system

# 3. 必要なパッケージのインストール
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material
npm install mongoose mongodb bcryptjs jsonwebtoken
npm install nodemailer @types/nodemailer
npm install dotenv
npm install --save-dev @types/bcryptjs @types/jsonwebtoken
```

### 環境変数の設定 (.env.local)

**重要**: このファイルは絶対にGitHubにアップロードしないこと！

```env
# MongoDB接続文字列（MongoDBのURIをコピー）
MONGODB_URI=mongodb+srv://ユーザー名:パスワード@cluster名.mongodb.net/データベース名?retryWrites=true&w=majority

# JWT用の秘密鍵（ランダムな文字列を生成）
JWT_SECRET=your-very-long-random-secret-key-here
JWT_ACCESS_SECRET=access-token-secret-key
JWT_REFRESH_SECRET=refresh-token-secret-key

# アプリケーションの設定
NODE_ENV=development
NEXTAUTH_URL=http://localhost:3000

# メール送信設定（SMTP）
EMAIL_SERVER_HOST=smtp.example.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_SECURE=false
EMAIL_SERVER_USER=your-email@example.com
EMAIL_SERVER_PASSWORD=your-email-password
EMAIL_FROM="Your App <noreply@example.com>"

# 管理者認証用の秘密キー
ADMIN_SECRET_KEY=admin-development-secret-key

# 管理者のメールアドレス（通知用）
ADMIN_EMAIL=admin@example.com
```

---

## 3. MongoDB Atlas のセットアップ

### アカウント作成とクラスターのセットアップ

1. **MongoDB Atlas にサインアップ**
   - https://www.mongodb.com/cloud/atlas にアクセス
   - 無料アカウントを作成

2. **クラスターの作成**
   ```
   1. "Build a Cluster" をクリック
   2. "Shared" (無料) を選択
   3. クラウドプロバイダーとリージョンを選択（AWS / Tokyo推奨）
   4. クラスター名を入力（例: Cluster0）
   5. "Create Cluster" をクリック
   ```

3. **データベースユーザーの作成**
   ```
   1. Security → Database Access
   2. "Add New Database User" をクリック
   3. 認証方法: Password
   4. ユーザー名とパスワードを設定
   5. Database User Privileges: "Read and write to any database"
   6. "Add User" をクリック
   ```

4. **IPアドレスのホワイトリスト登録**
   ```
   1. Security → Network Access
   2. "Add IP Address" をクリック
   3. "Allow Access from Anywhere" をクリック（開発時のみ）
   4. 本番環境では特定のIPのみ許可すること
   ```

5. **接続文字列の取得**
   ```
   1. Clusters → "Connect" ボタン
   2. "Connect your application" を選択
   3. Driver: Node.js, Version: 5.5 or later
   4. 接続文字列をコピー
   5. <password>を実際のパスワードに置き換え
   6. .env.local の MONGODB_URI に貼り付け
   ```

### データベースとコレクションの作成

MongoDB Atlas の管理画面で：

1. **データベースの作成**
   ```
   1. Browse Collections をクリック
   2. Create Database をクリック
   3. Database name: embrocal
   4. Collection name: users
   5. Create をクリック
   ```

2. **必要なコレクション**
   ```
   - users          # ユーザー情報
   - posts          # 投稿データ
   - reports        # 通報データ
   - audit_logs     # 監査ログ
   - user_sessions  # セッション情報
   - comments       # コメントデータ
   ```

---

## 4. プロジェクト構造の詳細

### 完全なディレクトリ構造

```
secure-session-system/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # ルートレイアウト
│   ├── page.tsx                      # ホームページ
│   ├── globals.css                   # グローバルCSS
│   │
│   ├── admin/                        # 管理画面
│   │   ├── layout.tsx                # 管理画面レイアウト
│   │   ├── dashboard/                # ダッシュボード
│   │   │   └── page.tsx
│   │   ├── users/                    # ユーザー管理
│   │   │   ├── page.tsx              # ユーザー一覧
│   │   │   ├── [id]/                 # ユーザー詳細
│   │   │   │   └── page.tsx
│   │   │   └── new/                  # 新規ユーザー作成
│   │   │       └── page.tsx
│   │   ├── posts/                    # 投稿管理
│   │   │   ├── page.tsx              # 投稿一覧
│   │   │   └── [id]/                 # 投稿詳細
│   │   │       └── page.tsx
│   │   ├── reports/                  # 通報管理
│   │   │   ├── page.tsx              # 通報一覧
│   │   │   └── [id]/                 # 通報詳細
│   │   │       └── page.tsx
│   │   └── sessions/                 # セッション管理
│   │       └── page.tsx
│   │
│   └── api/                          # API Routes
│       └── admin/
│           ├── users/
│           │   ├── route.ts          # GET/POST/PUT/DELETE
│           │   └── [id]/
│           │       └── route.ts
│           ├── posts/
│           │   ├── route.ts
│           │   └── [id]/
│           │       └── route.ts
│           └── reports/
│               ├── route.ts
│               └── [id]/
│                   └── route.ts
│
├── lib/                              # ユーティリティ関数
│   ├── db.ts                         # データベース接続
│   ├── auth.ts                       # 認証関連
│   └── email.ts                      # メール送信
│
├── models/                           # Mongooseモデル
│   ├── User.js                       # ユーザーモデル
│   ├── Post.js                       # 投稿モデル
│   └── Report.js                     # 通報モデル
│
├── components/                       # 共通コンポーネント
│   ├── Navigation.tsx                # ナビゲーション
│   ├── UserCard.tsx                  # ユーザーカード
│   └── StatusChip.tsx                # ステータス表示
│
├── scripts/                          # データ作成スクリプト
│   ├── create-test-users.js         # テストユーザー作成
│   ├── create-test-posts.js         # テスト投稿作成
│   └── create-test-reports.js       # テスト通報作成
│
├── public/                           # 静的ファイル
│   └── images/
│
├── .env.local                        # 環境変数（Gitignore対象）
├── .gitignore                        # Git除外設定
├── package.json                      # パッケージ設定
├── tsconfig.json                     # TypeScript設定
└── next.config.js                    # Next.js設定
```

---

## 5. データベース設計とスキーマ

### Users コレクション

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  email: "user@example.com",            // 必須、ユニーク
  name: "山田太郎",                      // 表示名
  password: "$2a$10$...",               // bcryptでハッシュ化
  role: "user",                          // user | moderator | admin
  status: "active",                      // active | suspended | banned | deleted
  warningCount: 0,                       // 警告回数
  createdAt: ISODate("2024-03-20T10:00:00Z"),
  updatedAt: ISODate("2024-03-20T10:00:00Z"),
  lastLoginAt: ISODate("2024-03-20T10:00:00Z"),
  emailVerified: true,                   // メール認証済み
  profilePicture: "https://...",         // プロフィール画像URL
  bio: "自己紹介文",                     // 自己紹介
  
  // インデックス設定
  // - email: unique index
  // - createdAt: -1 (降順)
  // - status: 1
}
```

### Posts コレクション

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439012"),
  authorId: "507f1f77bcf86cd799439011",   // ユーザーID
  authorName: "山田太郎",
  authorEmail: "user@example.com",
  author: ObjectId("507f1f77bcf86cd799439011"), // User参照
  content: "投稿内容...",                  // 投稿本文
  likes: ["userId1", "userId2"],          // いいねしたユーザーID配列
  comments: [                              // コメント配列
    {
      _id: ObjectId(),
      authorId: "userId",
      content: "コメント内容",
      createdAt: ISODate()
    }
  ],
  isDeleted: false,                        // 論理削除フラグ
  isHidden: false,                         // 非表示フラグ
  reported: false,                         // 通報されているか
  reportCount: 0,                          // 通報回数
  createdAt: ISODate("2024-03-20T10:00:00Z"),
  updatedAt: ISODate("2024-03-20T10:00:00Z"),
  
  // インデックス設定
  // - authorId: 1
  // - createdAt: -1
  // - isDeleted: 1, isHidden: 1
}
```

### Reports コレクション

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439013"),
  
  // 通報の基本情報
  reportType: "post",                     // post | user | comment
  targetId: ObjectId("..."),              // 通報対象のID
  targetUserId: "userId",                 // 対象ユーザーのID
  targetContent: "違反内容...",           // 対象のコンテンツ
  
  // 通報者情報
  reporterId: ObjectId("..."),            // 通報者のID
  reporterEmail: "reporter@example.com",
  reporterName: "通報者名",
  
  // 通報理由
  reason: "spam",                         // spam | harassment | inappropriate_content | hate_speech | violence | misinformation | copyright | other
  reasonDetails: "詳細な理由...",
  
  // ステータス管理
  status: "pending",                      // pending | reviewing | approved | rejected | resolved
  priority: "medium",                      // low | medium | high | critical
  
  // 処理情報
  assignedTo: ObjectId("..."),            // 担当者ID
  assignedAt: ISODate(),
  reviewedBy: ObjectId("..."),            // レビュー者ID
  reviewedAt: ISODate(),
  
  resolution: {
    action: "warning_issued",             // warning_issued | content_removed | user_suspended | user_banned | no_action | false_report
    notes: "処理メモ",
    resolvedAt: ISODate()
  },
  
  // 追加情報
  evidence: ["url1", "url2"],             // 証拠のURL
  previousReports: [                      // 過去の通報
    {
      reportId: ObjectId(),
      createdAt: ISODate()
    }
  ],
  
  internalNotes: [                        // 内部メモ
    {
      note: "メモ内容",
      addedBy: ObjectId(),
      addedAt: ISODate()
    }
  ],
  
  // メタデータ
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  createdAt: ISODate("2024-03-20T10:00:00Z"),
  updatedAt: ISODate("2024-03-20T10:00:00Z"),
  
  // インデックス設定
  // - status: 1, priority: -1, createdAt: -1
  // - targetId: 1
  // - reporterId: 1
}
```

### Audit_logs コレクション

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439014"),
  timestamp: ISODate("2024-03-20T10:00:00Z"),
  action: "ROLE_CHANGE",                  // ROLE_CHANGE | WARNING | SUSPEND | REACTIVATE | DELETE_USER | etc.
  adminId: "adminUserId",                 // 実行した管理者
  targetUserId: "targetUserId",           // 対象ユーザー
  targetUserEmail: "user@example.com",
  details: {                              // アクションの詳細
    oldRole: "user",
    newRole: "moderator",
    reason: "昇格理由"
  },
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  
  // インデックス設定
  // - timestamp: -1
  // - adminId: 1
  // - targetUserId: 1
}
```

### User_sessions コレクション

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439015"),
  sessionId: "unique-session-id",
  userId: "userId",
  token: "jwt-token",
  createdAt: ISODate("2024-03-20T10:00:00Z"),
  lastActivity: ISODate("2024-03-20T10:30:00Z"),
  expiresAt: ISODate("2024-03-21T10:00:00Z"),
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  isActive: true,
  deviceType: "desktop",                  // desktop | mobile | tablet
  location: "Tokyo, Japan",
  
  // インデックス設定
  // - userId: 1
  // - sessionId: 1
  // - expiresAt: 1
}
```

---

## 6. 認証とセキュリティ

### データベース接続の実装 (/lib/db.ts)

```typescript
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

// グローバル変数でキャッシュ（開発環境でのHot Reload対策）
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
```

### 管理者認証の実装

すべてのAPIルートで管理者権限を確認：

```typescript
// API Route の例
export async function GET(request: NextRequest) {
  // 管理者権限の確認
  const isAdmin = request.headers.get('x-admin-secret') === process.env.ADMIN_SECRET_KEY;
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 処理を続行...
}
```

クライアント側でのAPIコール：

```typescript
const response = await fetch('/api/admin/users', {
  headers: {
    'x-admin-secret': process.env.NEXT_PUBLIC_ADMIN_SECRET_KEY || 'admin-development-secret-key'
  }
});
```

### パスワードのハッシュ化

```javascript
const bcrypt = require('bcryptjs');

// パスワードのハッシュ化
const hashedPassword = await bcrypt.hash(plainPassword, 10);

// パスワードの検証
const isValid = await bcrypt.compare(plainPassword, hashedPassword);
```

---

## 7. ユーザー管理システムの実装

### ユーザー一覧画面 (/app/admin/users/page.tsx)

```typescript
'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  Chip,
  IconButton,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox
} from '@mui/material';
import { useRouter } from 'next/navigation';

interface User {
  _id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  warningCount: number;
  createdAt: string;
  lastLoginAt: string | null;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalUsers, setTotalUsers] = useState(0);
  
  // フィルター
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // 選択
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  useEffect(() => {
    fetchUsers();
  }, [page, rowsPerPage, searchTerm, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(roleFilter && { role: roleFilter }),
        ...(statusFilter && { status: statusFilter })
      });

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          'x-admin-secret': process.env.NEXT_PUBLIC_ADMIN_SECRET_KEY || 'admin-development-secret-key'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setTotalUsers(data.total);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (userId: string, action: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': process.env.NEXT_PUBLIC_ADMIN_SECRET_KEY || 'admin-development-secret-key'
        },
        body: JSON.stringify({ action })
      });

      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'suspended': return 'warning';
      case 'banned': return 'error';
      case 'deleted': return 'default';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        ユーザー管理
      </Typography>

      {/* フィルター */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            label="検索"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ minWidth: 200 }}
          />
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>権限</InputLabel>
            <Select
              value={roleFilter}
              label="権限"
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <MenuItem value="">すべて</MenuItem>
              <MenuItem value="admin">管理者</MenuItem>
              <MenuItem value="moderator">モデレーター</MenuItem>
              <MenuItem value="user">ユーザー</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>ステータス</InputLabel>
            <Select
              value={statusFilter}
              label="ステータス"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="">すべて</MenuItem>
              <MenuItem value="active">アクティブ</MenuItem>
              <MenuItem value="suspended">停止中</MenuItem>
              <MenuItem value="banned">BAN</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="contained"
            onClick={() => router.push('/admin/users/new')}
          >
            新規ユーザー作成
          </Button>
        </Box>
      </Paper>

      {/* ユーザーテーブル */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selectedUsers.length === users.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedUsers(users.map(u => u._id));
                    } else {
                      setSelectedUsers([]);
                    }
                  }}
                />
              </TableCell>
              <TableCell>名前</TableCell>
              <TableCell>メールアドレス</TableCell>
              <TableCell>権限</TableCell>
              <TableCell>ステータス</TableCell>
              <TableCell>警告</TableCell>
              <TableCell>作成日</TableCell>
              <TableCell>最終ログイン</TableCell>
              <TableCell align="center">アクション</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user._id}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedUsers.includes(user._id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers([...selectedUsers, user._id]);
                      } else {
                        setSelectedUsers(selectedUsers.filter(id => id !== user._id));
                      }
                    }}
                  />
                </TableCell>
                <TableCell>{user.name || 'Unknown'}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Chip
                    label={user.role}
                    size="small"
                    color={user.role === 'admin' ? 'error' : user.role === 'moderator' ? 'warning' : 'default'}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.status}
                    size="small"
                    color={getStatusColor(user.status) as any}
                  />
                </TableCell>
                <TableCell>{user.warningCount || 0}</TableCell>
                <TableCell>
                  {new Date(user.createdAt).toLocaleDateString('ja-JP')}
                </TableCell>
                <TableCell>
                  {user.lastLoginAt 
                    ? new Date(user.lastLoginAt).toLocaleDateString('ja-JP')
                    : '-'
                  }
                </TableCell>
                <TableCell align="center">
                  <Button
                    size="small"
                    onClick={() => router.push(`/admin/users/${user._id}`)}
                  >
                    詳細
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={totalUsers}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[25, 50, 100]}
          labelRowsPerPage="表示件数:"
        />
      </TableContainer>
    </Box>
  );
}
```

### ユーザー管理API (/app/api/admin/users/route.ts)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { connectDatabase } from '@/lib/db';

// GET: ユーザー一覧取得
export async function GET(request: NextRequest) {
  try {
    // 管理者権限確認
    const isAdmin = request.headers.get('x-admin-secret') === process.env.ADMIN_SECRET_KEY;
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDatabase();
    const mongoose = require('mongoose');
    const usersCollection = mongoose.connection.collection('users');

    // クエリパラメータ取得
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';
    const skip = (page - 1) * limit;

    // フィルタ条件構築
    const filter: any = {};
    
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) filter.role = role;
    if (status) filter.status = status;

    // ユーザーデータ取得
    const users = await usersCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .toArray();

    // 総件数取得
    const total = await usersCollection.countDocuments(filter);

    // レスポンス用にデータを整形
    const formattedUsers = users.map(user => ({
      _id: user._id.toString(),
      email: user.email,
      name: user.name || 'Unknown',
      role: user.role || 'user',
      status: user.status || 'active',
      warningCount: user.warningCount || 0,
      createdAt: user.createdAt || new Date(),
      lastLoginAt: user.lastLoginAt || null,
      emailVerified: user.emailVerified || false,
      profilePicture: user.profilePicture || null,
      bio: user.bio || ''
    }));

    return NextResponse.json({
      users: formattedUsers,
      total,
      page,
      limit
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST: 新規ユーザー作成
export async function POST(request: NextRequest) {
  try {
    // 管理者権限確認
    const isAdmin = request.headers.get('x-admin-secret') === process.env.ADMIN_SECRET_KEY;
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, name, password, role, sendWelcomeEmail } = body;

    // 必須項目チェック
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    await connectDatabase();
    const mongoose = require('mongoose');
    const bcrypt = require('bcryptjs');
    const usersCollection = mongoose.connection.collection('users');

    // 既存ユーザーチェック
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // パスワードのハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10);

    // ユーザー作成
    const newUser = {
      email,
      name: name || email.split('@')[0],
      password: hashedPassword,
      role: role || 'user',
      status: 'active',
      warningCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      emailVerified: false
    };

    const result = await usersCollection.insertOne(newUser);

    // ウェルカムメール送信
    if (sendWelcomeEmail) {
      try {
        const { sendWelcomeEmail: sendEmail } = await import('@/lib/email');
        await sendEmail(email, newUser.name, password);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }
    }

    // 監査ログ記録
    const auditLogsCollection = mongoose.connection.collection('audit_logs');
    await auditLogsCollection.insertOne({
      timestamp: new Date(),
      action: 'CREATE_USER',
      adminId: 'admin-user',
      targetUserId: result.insertedId.toString(),
      targetUserEmail: email,
      details: { role, sendWelcomeEmail },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent')
    });

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      userId: result.insertedId.toString()
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
```

---

## 8. 投稿管理システムの実装

### 投稿一覧画面の重要ポイント

```typescript
// フィルタリング機能の実装
const filter: any = {};

// 削除済みを含むかどうか
if (!includeDeleted) {
  filter.isDeleted = { $ne: true };
}

// 非表示を含むかどうか
if (!includeHidden) {
  filter.isHidden = { $ne: true };
}

// 通報済みのみ表示
if (reportedOnly) {
  filter.reported = true;
}

// 投稿データ取得時の注意点
const posts = await postsCollection
  .find(filter)
  .sort({ createdAt: -1 })  // 新しい順
  .limit(limit)
  .skip(skip)
  .toArray();

// いいね数とコメント数の計算
const formattedPosts = posts.map(post => ({
  ...post,
  likesCount: post.likes ? post.likes.length : 0,
  commentsCount: post.comments ? post.comments.length : 0
}));
```

---

## 9. 通報システムの実装

### 通報システムの完全実装

#### ObjectIdの扱い方（重要！）

MongoDBのObjectIdを扱う際の注意点：

```typescript
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

// ObjectIdの作成方法（バージョンによって異なる）
// 方法1: new ObjectId（推奨）
const id1 = new ObjectId(stringId);

// 方法2: createFromHexString（古いバージョン）
const id2 = ObjectId.createFromHexString(stringId);

// ObjectIdの妥当性チェック（必須！）
if (!ObjectId.isValid(stringId)) {
  return NextResponse.json(
    { error: 'Invalid ID format' },
    { status: 400 }
  );
}

// try-catchで囲む（重要！）
try {
  const document = await collection.findOne({
    _id: new ObjectId(id)
  });
} catch (error) {
  console.log('Invalid ObjectId:', error);
  // エラー処理
}
```

#### パラメータの取得方法（Next.js 15の変更点）

```typescript
// Next.js 15では params が Promise になった
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }  // Promise型に注意！
) {
  // params を await で取得する必要がある
  const params = await context.params;
  const id = params.id;
  
  // 処理を続行...
}
```

---

## 10. メール送信システム

### Nodemailerの設定と実装

```typescript
const nodemailer = require('nodemailer');

// トランスポーター作成
export const createEmailTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_SERVER_HOST,
    port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
    secure: process.env.EMAIL_SERVER_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false  // 自己署名証明書を許可
    }
  });
};

// メール送信関数
export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<boolean> => {
  try {
    const transporter = createEmailTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: to,
      subject: subject,
      html: html,
      text: text
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};
```

---

## 11. よくあるエラーと解決方法

### 1. MongoDB接続エラー

**エラー:**
```
MongoNetworkError: connect ECONNREFUSED
```

**解決方法:**
1. MongoDB Atlas のNetwork Access でIPアドレスを確認
2. 接続文字列の<password>を実際のパスワードに置き換え
3. データベース名が正しいか確認

### 2. ObjectId エラー

**エラー:**
```
TypeError: Cannot read properties of undefined (reading 'createFromHexString')
BSONError: Argument passed in must be a string of 12 bytes or a string of 24 hex characters
```

**解決方法:**
```typescript
// 正しい実装
const ObjectId = mongoose.Types.ObjectId;

// IDの妥当性を必ずチェック
if (!ObjectId.isValid(id)) {
  return { error: 'Invalid ID' };
}

// try-catchで囲む
try {
  const result = await collection.findOne({
    _id: new ObjectId(id)  // new を使用
  });
} catch (error) {
  console.error('ObjectId error:', error);
}
```

### 3. Next.js 15 の params エラー

**エラー:**
```
TypeError: Cannot destructure property 'id' of 'params' as it is undefined
```

**解決方法:**
```typescript
// 間違い
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;  // エラー！
}

// 正しい実装
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;  // await が必要！
  const id = params.id;
}
```

### 4. MUI DataGrid SSRエラー

**エラー:**
```
Runtime TypeError: Cannot read properties of undefined (reading 'size')
```

**解決方法:**
DataGridの代わりにシンプルなTableを使用：

```typescript
// ❌ DataGrid（SSRでエラー）
import { DataGrid } from '@mui/x-data-grid';

// ✅ Table（SSR対応）
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
```

### 5. フィルターが動作しない

**問題:**
フィルター変更しても結果が変わらない

**解決方法:**
```typescript
// useEffectの依存配列に含める
useEffect(() => {
  fetchData();
}, [page, rowsPerPage, filter1, filter2]);  // すべてのフィルターを含める

// URLパラメータに正しく追加
const params = new URLSearchParams({
  page: page.toString(),
  limit: limit.toString(),
  ...(filter1 && { filter1 }),  // 条件付きで追加
  ...(filter2 && { filter2 })
});
```

### 6. Nodemailer エラー

**エラー:**
```
Error: Invalid login: 535 Authentication failed
```

**解決方法:**
1. SMTP設定を確認
2. アプリパスワードを使用（Gmailの場合）
3. ポート設定を確認（587 for TLS, 465 for SSL）

---

## 12. 開発時の重要な注意点

### 1. 環境変数の管理

```bash
# .gitignore に必ず含める
.env.local
.env.production
```

### 2. データベースインデックスの設定

パフォーマンス向上のため、必ずインデックスを設定：

```javascript
// MongoDB Atlasの管理画面で設定
// またはMongooseスキーマで設定

// users コレクション
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ createdAt: -1 });
db.users.createIndex({ status: 1 });

// posts コレクション
db.posts.createIndex({ authorId: 1 });
db.posts.createIndex({ createdAt: -1 });
db.posts.createIndex({ isDeleted: 1, isHidden: 1 });

// reports コレクション
db.reports.createIndex({ status: 1, priority: -1, createdAt: -1 });
db.reports.createIndex({ targetId: 1 });
db.reports.createIndex({ reporterId: 1 });
```

### 3. TypeScriptの型定義

必ず型を定義してから実装：

```typescript
// インターフェースを定義
interface User {
  _id: string;
  email: string;
  name: string;
  role: 'admin' | 'moderator' | 'user';
  status: 'active' | 'suspended' | 'banned' | 'deleted';
  warningCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// APIレスポンスの型
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

### 4. エラーハンドリングの徹底

すべての非同期処理でtry-catchを使用：

```typescript
export async function handler(request: NextRequest) {
  try {
    // データベース接続
    await connectDatabase();
    
    // 処理
    const result = await someAsyncOperation();
    
    // 成功レスポンス
    return NextResponse.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    // エラーログ
    console.error('Error in handler:', error);
    
    // エラーレスポンス
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error'
      },
      { status: 500 }
    );
  }
}
```

### 5. コンポーネントの分割

大きなコンポーネントは必ず分割：

```typescript
// ❌ 1つの巨大なコンポーネント
export default function HugePage() {
  // 1000行のコード...
}

// ✅ 機能ごとに分割
export default function Page() {
  return (
    <>
      <Header />
      <Filters onFilterChange={handleFilterChange} />
      <DataTable data={data} />
      <Pagination />
    </>
  );
}
```

### 6. デバッグのコツ

```typescript
// 開発時のデバッグログ
if (process.env.NODE_ENV === 'development') {
  console.log('Debug data:', {
    filter,
    params,
    result
  });
}

// MongoDBクエリのログ
mongoose.set('debug', true);  // すべてのクエリをログに出力
```

### 7. パフォーマンス最適化

```typescript
// ❌ N+1問題
const posts = await postsCollection.find().toArray();
for (const post of posts) {
  const author = await usersCollection.findOne({ _id: post.authorId });
  post.authorDetails = author;
}

// ✅ 集約パイプライン使用
const posts = await postsCollection.aggregate([
  {
    $lookup: {
      from: 'users',
      localField: 'authorId',
      foreignField: '_id',
      as: 'authorDetails'
    }
  }
]).toArray();
```

---

## テストデータの作成

### スクリプトの実行方法

```bash
# テストユーザー作成
node scripts/create-test-users.js

# テスト投稿作成
node scripts/create-test-posts.js

# テスト通報作成
node scripts/create-test-reports.js

# データをクリアして再作成
node scripts/create-test-reports.js --clear
```

---

## 本番環境へのデプロイ

### Vercelへのデプロイ

```bash
# Vercel CLIインストール
npm i -g vercel

# デプロイ
vercel

# 環境変数の設定
# Vercelダッシュボードで設定するか、CLIで設定
vercel env add MONGODB_URI
vercel env add JWT_SECRET
# ... 他の環境変数も同様に
```

### 本番環境のチェックリスト

- [ ] すべての環境変数が設定されている
- [ ] MongoDB Atlas のIPホワイトリストが設定されている
- [ ] HTTPSが有効になっている
- [ ] エラーログの監視が設定されている
- [ ] バックアップが設定されている
- [ ] Rate limitingが実装されている
- [ ] セキュリティヘッダーが設定されている

---

## まとめ

このガイドに従って実装すれば、確実に動作するSNS管理システムが構築できます。

### 重要なポイント

1. **MongoDB ObjectId** の扱いに注意（必ずvalidチェック）
2. **Next.js 15** の params は Promise（必ずawait）
3. **環境変数** は必ず設定（特にMONGODB_URI）
4. **エラーハンドリング** は必ずtry-catch
5. **型定義** を最初に作成してから実装
6. **インデックス** を設定してパフォーマンス向上
7. **MUI DataGrid** は使わずTableを使用（SSR対応）

### 困ったときは

1. エラーメッセージを正確に読む
2. console.logでデータの中身を確認
3. MongoDB Atlasの管理画面でデータを確認
4. ブラウザの開発者ツールでネットワークタブを確認
5. サーバーログを確認（npm run devのターミナル）

このドキュメントを参照しながら開発を進めれば、必ず完成させることができます！