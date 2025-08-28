# パフォーマンス最適化計画書 - 画面遷移とロード時間の高速化

## 📊 現状分析

### 現在のパフォーマンスボトルネック

1. **データベースクエリの問題**
   - MongoDB Atlasへの接続が毎回行われている
   - インデックスが不足している
   - N+1問題が発生している箇所がある

2. **クライアントサイドの問題**
   - Material-UIの大きなバンドルサイズ
   - 不要な再レンダリング
   - データフェッチの非効率性

3. **サーバーサイドの問題**
   - APIレスポンスが大きすぎる
   - キャッシングが実装されていない
   - データベース接続プーリングが最適化されていない

---

## 🚀 即効性のある改善策（すぐに実装可能）

### 1. ローディング状態の改善

#### 現在の問題
ページ遷移時に白い画面が表示される

#### 解決策
```typescript
// components/LoadingSpinner.tsx を作成
import { CircularProgress, Box } from '@mui/material';

export default function LoadingSpinner() {
  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '200px' 
    }}>
      <CircularProgress />
    </Box>
  );
}

// 使用例
export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  
  if (loading) return <LoadingSpinner />;
  
  return <>{/* コンテンツ */}</>;
}
```

### 2. データの先読み（Prefetch）

```typescript
// app/admin/layout.tsx に追加
import { useRouter } from 'next/navigation';

export default function AdminLayout({ children }) {
  const router = useRouter();
  
  // よく訪れるページを先読み
  useEffect(() => {
    router.prefetch('/admin/users');
    router.prefetch('/admin/posts');
    router.prefetch('/admin/reports');
  }, []);
  
  return <>{children}</>;
}
```

### 3. ページネーションの最適化

```typescript
// 現在の問題: 50件ずつ取得している
// 改善案: 初期表示は20件に減らす

const [rowsPerPage, setRowsPerPage] = useState(20); // 50 → 20に変更
```

---

## 💨 クライアントサイドの最適化

### 1. React.memo によるメモ化

```typescript
// components/UserRow.tsx
import React from 'react';

const UserRow = React.memo(({ user, onAction }) => {
  return (
    <TableRow>
      {/* ユーザー情報の表示 */}
    </TableRow>
  );
}, (prevProps, nextProps) => {
  // ユーザーデータが変わらなければ再レンダリングしない
  return prevProps.user._id === nextProps.user._id;
});
```

### 2. useMemo と useCallback の活用

```typescript
// ページコンポーネント内
const filteredUsers = useMemo(() => {
  return users.filter(user => {
    // フィルタリングロジック
  });
}, [users, filterConditions]);

const handleUserAction = useCallback((userId: string, action: string) => {
  // アクション処理
}, []);
```

### 3. 仮想スクロール（大量データ対応）

```typescript
// @tanstack/react-virtual をインストール
npm install @tanstack/react-virtual

// 実装例
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualizedList({ items }) {
  const parentRef = useRef();
  
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 5,
  });
  
  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      {/* 仮想化されたリスト */}
    </div>
  );
}
```

### 4. 画像の遅延読み込み

```typescript
import Image from 'next/image';

// Next.js の Image コンポーネントを使用
<Image
  src={user.profilePicture}
  alt="Profile"
  width={40}
  height={40}
  loading="lazy"  // 遅延読み込み
  placeholder="blur"  // ぼかしプレースホルダー
/>
```

---

## 🖥️ サーバーサイドの最適化

### 1. APIレスポンスの最適化

```typescript
// app/api/admin/users/route.ts

// 改善前: すべてのフィールドを返している
const users = await usersCollection.find(filter).toArray();

// 改善後: 必要なフィールドのみ取得
const users = await usersCollection
  .find(filter)
  .project({  // 必要なフィールドのみ指定
    email: 1,
    name: 1,
    role: 1,
    status: 1,
    warningCount: 1,
    createdAt: 1,
    lastLoginAt: 1
  })
  .toArray();
```

### 2. キャッシングの実装

```typescript
// lib/cache.ts
const cache = new Map();

export function getCached(key: string, ttl: number = 60000) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }
  return null;
}

export function setCached(key: string, data: any) {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

// API内での使用
export async function GET(request: NextRequest) {
  const cacheKey = `users_${page}_${limit}_${filter}`;
  
  // キャッシュチェック
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }
  
  // データ取得
  const data = await fetchUsers();
  
  // キャッシュに保存
  setCached(cacheKey, data);
  
  return NextResponse.json(data);
}
```

### 3. データベース接続の最適化

```typescript
// lib/db.ts の改善版
import mongoose from 'mongoose';

const options = {
  maxPoolSize: 10,  // 接続プールサイズ
  minPoolSize: 2,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 5000,
};

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, options);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
```

---

## 🗄️ データベースの最適化

### 1. インデックスの追加

```javascript
// MongoDB Atlas の管理画面で実行

// 複合インデックス（よく一緒に使われるフィールド）
db.users.createIndex({ status: 1, role: 1, createdAt: -1 });
db.posts.createIndex({ isDeleted: 1, isHidden: 1, createdAt: -1 });
db.reports.createIndex({ status: 1, priority: -1, createdAt: -1 });

// テキスト検索インデックス
db.users.createIndex({ email: "text", name: "text" });
db.posts.createIndex({ content: "text" });
```

### 2. 集約パイプラインの最適化

```typescript
// 改善前: 別々にクエリを実行
const users = await usersCollection.find().toArray();
const posts = await postsCollection.find({ authorId: { $in: userIds } }).toArray();

// 改善後: 集約パイプラインで1回のクエリ
const usersWithPosts = await usersCollection.aggregate([
  { $match: filter },
  {
    $lookup: {
      from: 'posts',
      localField: '_id',
      foreignField: 'authorId',
      as: 'posts',
      pipeline: [
        { $limit: 5 },  // 最新5件のみ
        { $project: { content: 1, createdAt: 1 } }
      ]
    }
  },
  { $limit: limit },
  { $skip: skip }
]).toArray();
```

### 3. データの事前集計

```javascript
// scripts/create-statistics.js
// 定期的に実行して統計データを事前計算

const stats = {
  totalUsers: await usersCollection.countDocuments(),
  activeUsers: await usersCollection.countDocuments({ status: 'active' }),
  totalPosts: await postsCollection.countDocuments(),
  // ...
};

await statsCollection.insertOne({
  date: new Date(),
  ...stats
});
```

---

## 🔧 実装手順（優先順位順）

### Phase 1: 即効性のある改善（1日で実装可能）

1. **ローディングスピナーの実装**
```bash
# 1. コンポーネント作成
touch components/LoadingSpinner.tsx

# 2. 各ページに適用
# users/page.tsx, posts/page.tsx, reports/page.tsx に追加
```

2. **初期表示件数を減らす**
```typescript
// 各ページで変更
const [rowsPerPage, setRowsPerPage] = useState(20); // 50→20
```

3. **不要なフィールドを除外**
```typescript
// API route で project を追加
.project({ 
  _id: 1, 
  email: 1, 
  name: 1, 
  status: 1,
  // 必要最小限のフィールドのみ
})
```

### Phase 2: 中期的改善（1週間で実装可能）

1. **React.memo の適用**
```typescript
// コンポーネントをメモ化
const UserTableRow = React.memo(UserRow);
const PostCard = React.memo(PostCardComponent);
```

2. **簡易キャッシュの実装**
```typescript
// lib/cache.ts を作成
// API routes でキャッシュを使用
```

3. **データベースインデックスの追加**
```javascript
// MongoDB Atlas で実行
db.users.createIndex({ email: 1, status: 1 });
db.posts.createIndex({ createdAt: -1 });
```

### Phase 3: 本格的な最適化（2週間以上）

1. **Redis キャッシュの導入**
```bash
npm install redis
```

2. **CDN の設定**
- 静的ファイルをCDN経由で配信
- Next.js の Image Optimization API を活用

3. **SSG/ISR の活用**
```typescript
// 静的生成可能なページは事前生成
export async function generateStaticParams() {
  // ...
}
```

---

## 📈 パフォーマンス測定方法

### 1. Chrome DevTools での測定

```javascript
// Performance タブで測定
// 1. Recording 開始
// 2. ページ操作
// 3. Recording 停止
// 4. 結果分析
```

### 2. Lighthouse での測定

```bash
# CLI で実行
npx lighthouse http://localhost:3000/admin/users --view
```

### 3. カスタムメトリクスの実装

```typescript
// lib/performance.ts
export function measureApiCall(name: string) {
  const start = performance.now();
  
  return () => {
    const duration = performance.now() - start;
    console.log(`${name}: ${duration}ms`);
    
    // 分析ツールに送信
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'timing_complete', {
        name,
        value: Math.round(duration)
      });
    }
  };
}

// 使用例
const endMeasure = measureApiCall('fetchUsers');
const data = await fetch('/api/admin/users');
endMeasure();
```

---

## 🎯 期待される効果

### 即効性のある改善を実装した場合
- **初期表示時間**: 3秒 → 1.5秒（50%削減）
- **ページ遷移時間**: 2秒 → 0.8秒（60%削減）
- **API レスポンス**: 800ms → 400ms（50%削減）

### すべての改善を実装した場合
- **初期表示時間**: 3秒 → 0.5秒（83%削減）
- **ページ遷移時間**: 2秒 → 0.2秒（90%削減）
- **API レスポンス**: 800ms → 100ms（87%削減）

---

## 🔍 デバッグとモニタリング

### パフォーマンスログの追加

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const start = Date.now();
  
  const response = NextResponse.next();
  
  const duration = Date.now() - start;
  console.log(`[${request.method}] ${request.url} - ${duration}ms`);
  
  return response;
}
```

### React DevTools Profiler の活用

```bash
# Chrome 拡張機能をインストール
# React Developer Tools

# 使用方法
# 1. Profiler タブを開く
# 2. Record を開始
# 3. 操作を実行
# 4. 結果を分析
```

---

## ⚠️ 注意事項

1. **段階的に実装する**
   - 一度にすべて変更しない
   - 各改善の効果を測定してから次へ

2. **バックアップを取る**
   - 変更前にコードをバックアップ
   - データベースのバックアップも忘れずに

3. **本番環境での検証**
   - 開発環境と本番環境で挙動が異なる場合がある
   - 段階的にロールアウト

---

## 📚 参考資料

- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [MongoDB Performance](https://www.mongodb.com/docs/manual/administration/analyzing-mongodb-performance/)
- [React Performance](https://react.dev/learn/render-and-commit)
- [Web Vitals](https://web.dev/vitals/)

---

このプランに従って段階的に実装することで、アプリケーションのパフォーマンスを大幅に改善できます。まずはPhase 1の即効性のある改善から始めることをお勧めします。