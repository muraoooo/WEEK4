# MongoDBデータベース仕様書

## データベース情報

- **データベース名**: embrocal
- **接続URI**: MongoDB Atlas Cluster
- **更新日時**: 2025-08-27T05:58:07.912Z

## コレクション一覧と統計

### reports コレクション

**総ドキュメント数**: 488件

#### フィールド定義

| フィールド名 | データ型 | 説明 |
|-------------|---------|------|
| _id | object | ドキュメントの一意識別子 |
| targetId | object | 通報対象ID |
| targetType | string | - |
| reporterId | string | 通報者ID |
| reporterName | string | - |
| reporterEmail | string | - |
| reason | string | 通報理由 |
| description | string | - |
| status | string | ステータス（active/suspended/banned等） |
| createdAt | object | 作成日時 |
| updatedAt | object | 更新日時 |

#### 統計情報

**ステータス別件数:**
- approved: 3件
- pending: 232件
- reviewed: 127件
- under_review: 3件
- rejected: 2件
- resolved: 121件

**優先度別件数:**
- medium: 2件
- high: 4件
- low: 8件
- urgent: 4件

**通報タイプ別件数:**
- null: 1件
- post: 11件
- comment: 3件
- user: 3件

**カテゴリ別件数:**
- underage: 1件
- harassment: 1件
- inappropriate_content: 1件
- impersonation: 1件
- hate_speech: 1件
- spam: 1件
- copyright: 1件
- privacy_violation: 1件
- misinformation: 1件
- other: 1件

### users コレクション

**総ドキュメント数**: 58件

#### フィールド定義

| フィールド名 | データ型 | 説明 |
|-------------|---------|------|
| _id | object | ドキュメントの一意識別子 |
| email | string | ユーザーのメールアドレス |
| password | string | ハッシュ化されたパスワード |
| name | string | ユーザー名/名前 |
| emailVerified | object | - |
| createdAt | object | 作成日時 |
| updatedAt | object | 更新日時 |
| bio | string | - |
| resetToken | string | - |
| resetTokenExpiry | object | - |
| searchHistory | Array | - |
| following | Array | - |
| followers | Array | - |
| bannedAt | object | - |
| lastLogin | object | - |
| status | string | ステータス（active/suspended/banned等） |
| suspendedUntil | object | - |
| twoFactorEnabled | boolean | - |
| warningCount | number | 警告回数 |
| role | string | ユーザーの権限（admin/moderator/user） |

#### 統計情報

**ステータス別件数:**
- suspended: 3件
- active: 53件
- deleted: 1件
- banned: 1件

**権限別件数:**
- admin: 1件
- moderator: 4件
- user: 53件

### adminUsers コレクション

**総ドキュメント数**: 0件

### user_sessions コレクション

**総ドキュメント数**: 30件

#### フィールド定義

| フィールド名 | データ型 | 説明 |
|-------------|---------|------|
| _id | object | ドキュメントの一意識別子 |
| sessionId | string | - |
| userId | string | - |
| token | string | - |
| createdAt | object | 作成日時 |
| lastActivity | object | - |
| expiresAt | object | - |
| ipAddress | string | IPアドレス |
| userAgent | string | ユーザーエージェント |
| isActive | boolean | - |

### audit_logs コレクション

**総ドキュメント数**: 68件

#### フィールド定義

| フィールド名 | データ型 | 説明 |
|-------------|---------|------|
| _id | object | ドキュメントの一意識別子 |
| timestamp | object | タイムスタンプ |
| action | string | アクション種別 |
| adminId | string | 管理者ID |
| targetUserId | string | - |
| targetUserEmail | string | - |
| details | object | - |
| ipAddress | string | IPアドレス |
| userAgent | string | ユーザーエージェント |

### token_blacklist コレクション

**総ドキュメント数**: 0件

### privacysettings コレクション

**総ドキュメント数**: 0件

### comments コレクション

**総ドキュメント数**: 2070件

#### フィールド定義

| フィールド名 | データ型 | 説明 |
|-------------|---------|------|
| _id | object | ドキュメントの一意識別子 |
| postId | object | - |
| userId | object | - |
| content | string | コンテンツ内容 |
| likes | Array | いいね数/リスト |
| createdAt | object | 作成日時 |
| updatedAt | object | 更新日時 |

### notifications コレクション

**総ドキュメント数**: 1件

#### フィールド定義

| フィールド名 | データ型 | 説明 |
|-------------|---------|------|
| _id | object | ドキュメントの一意識別子 |
| userId | string | - |
| type | string | - |
| title | string | - |
| message | string | - |
| data | object | - |
| read | boolean | - |
| createdAt | object | 作成日時 |
| updatedAt | object | 更新日時 |

### posts コレクション

**総ドキュメント数**: 366件

#### フィールド定義

| フィールド名 | データ型 | 説明 |
|-------------|---------|------|
| _id | object | ドキュメントの一意識別子 |
| title | string | - |
| content | string | コンテンツ内容 |
| authorId | string | 投稿者ID |
| authorName | string | - |
| authorEmail | string | - |
| createdAt | object | 作成日時 |
| updatedAt | object | 更新日時 |
| author | object | - |
| views | number | - |
| comments | Array | コメントリスト |
| likes | Array | いいね数/リスト |
| commentCount | number | - |

#### 統計情報

**カテゴリ別件数:**
- discussion: 14件
- news: 12件
- question: 24件
- null: 32件
- general: 30件
- spam: 26件

### followrequests コレクション

**総ドキュメント数**: 0件

### login_attempts コレクション

**総ドキュメント数**: 8件

#### フィールド定義

| フィールド名 | データ型 | 説明 |
|-------------|---------|------|
| _id | object | ドキュメントの一意識別子 |
| userId | object | - |
| email | string | ユーザーのメールアドレス |
| ipAddress | string | IPアドレス |
| userAgent | string | ユーザーエージェント |
| success | boolean | - |
| timestamp | object | タイムスタンプ |

### moderation_logs コレクション

**総ドキュメント数**: 6件

#### フィールド定義

| フィールド名 | データ型 | 説明 |
|-------------|---------|------|
| _id | object | ドキュメントの一意識別子 |
| postId | string | - |
| score | number | - |
| flags | Array | - |
| categories | object | - |
| recommendations | Array | - |
| confidence | number | - |
| summary | string | - |
| timestamp | object | タイムスタンプ |
| reviewedBy | string | - |

