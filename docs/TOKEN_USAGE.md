# トークンシステムの使い方ガイド

## 🔑 トークンの基本概念

### トークンとは？
- **アクセストークン**: APIにアクセスするための短期間（30分）有効な認証キー
- **リフレッシュトークン**: アクセストークンを更新するための長期間（8時間）有効なキー

## 🚀 実際の使い方

### 1. ログイン時の流れ

```javascript
// ユーザーがログイン
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

// レスポンス
{
  "success": true,
  "message": "Login successful"
}
// → トークンは自動的にCookieに保存されます
```

### 2. トークンの自動更新

```javascript
// 30分後、アクセストークンの期限が切れそうになったら
POST /api/auth/refresh
// → リフレッシュトークンを使って新しいアクセストークンを取得
// → 自動的にCookieが更新されます
```

### 3. 管理画面へのアクセス

```javascript
// /admin/dashboard にアクセス
// → middlewareが自動的にトークンをチェック
// → 有効なら表示、無効ならログインページへリダイレクト
```

## 🔧 開発者向け：トークンの確認方法

### ブラウザでCookieを確認

1. Chrome DevTools を開く（F12）
2. Application タブを選択
3. Storage → Cookies を確認

以下のCookieが設定されているはずです：
- `access_token`: アクセストークン（JWT形式）
- `refresh_token`: リフレッシュトークン（JWT形式）
- `device_id`: デバイス識別子

### プログラムでトークンを使用

```typescript
// APIリクエスト時（自動的にCookieが送信される）
const response = await fetch('/api/admin/users', {
  credentials: 'include' // Cookieを含める
});

// 手動でトークンを取得したい場合
import { cookies } from 'next/headers';

const cookieStore = cookies();
const accessToken = cookieStore.get('access_token');
```

## 🛡️ セキュリティ機能

### HTTPOnly Cookie
- JavaScriptから直接アクセスできない
- XSS攻撃を防ぐ

### Secure Cookie（本番環境）
- HTTPS通信でのみ送信
- 中間者攻撃を防ぐ

### SameSite Cookie
- CSRF攻撃を防ぐ
- 同一サイトからのリクエストのみ許可

## 📊 管理画面での認証状態確認

管理画面（/admin/dashboard）にアクセスすると：

1. **認証成功時**
   - ダッシュボードが表示される
   - ユーザー情報がヘッダーに表示される

2. **認証失敗時**
   - ログインページにリダイレクト
   - エラーメッセージが表示される

## 🔄 トークンのライフサイクル

```
ログイン
  ↓
アクセストークン発行（30分）
リフレッシュトークン発行（8時間）
  ↓
[29分後]
  ↓
自動更新チェック
  ↓
リフレッシュAPI呼び出し
  ↓
新しいアクセストークン取得
  ↓
[8時間後]
  ↓
リフレッシュトークンも期限切れ
  ↓
再ログインが必要
```

## 💡 よくある質問

### Q: トークンを手動でコピー＆ペーストする必要はありますか？
A: いいえ、トークンは自動的にCookieに保存され、リクエスト時に自動的に送信されます。

### Q: トークンはどこに保存されますか？
A: ブラウザのCookie（HTTPOnly）に安全に保存されます。LocalStorageやSessionStorageには保存しません。

### Q: トークンの有効期限が切れたらどうなりますか？
A: 自動的にリフレッシュトークンを使って更新を試みます。失敗した場合はログインページにリダイレクトされます。

### Q: 管理画面にアクセスできない場合は？
A: 以下を確認してください：
1. ログインしているか
2. Cookieが有効になっているか
3. トークンの有効期限が切れていないか
4. ブラウザのDevToolsでエラーを確認

## 📱 実装例：管理画面でのトークン活用

```typescript
// app/admin/dashboard/page.tsx
export default async function DashboardPage() {
  // middlewareが認証をチェック済み
  // 認証されていない場合は、ここに到達しない
  
  const response = await fetch('/api/admin/stats', {
    // Cookieは自動的に送信される
    credentials: 'include'
  });
  
  const data = await response.json();
  
  return (
    <Dashboard stats={data} />
  );
}
```

## 🔐 セキュリティのベストプラクティス

1. **トークンを画面に表示しない**
2. **LocalStorageに保存しない**
3. **URLパラメータに含めない**
4. **定期的にリフレッシュする**
5. **ログアウト時は必ずトークンを削除する**