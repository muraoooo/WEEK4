# 安全なセッション管理システム 完全ガイド

## 📋 目次

1. [システム概要](#システム概要)
2. [ディレクトリ構造](#ディレクトリ構造)
3. [実装したコンポーネント](#実装したコンポーネント)
4. [セキュリティ機能](#セキュリティ機能)
5. [コードの詳細説明](#コードの詳細説明)
6. [使用方法](#使用方法)
7. [設定項目](#設定項目)

## システム概要

このシステムは、エンタープライズレベルのセキュリティを提供する包括的なセッション管理システムです。JWT認証、セキュアクッキー、デバイスフィンガープリント、CSRF保護、同時ログイン制御など、現代のWebアプリケーションに必要なすべてのセキュリティ機能を統合しています。

### 🔒 主要セキュリティ機能

- **JWT認証**: アクセストークン（15分）+ リフレッシュトークン（7日）
- **セキュアクッキー**: HTTPOnly、Secure、SameSite=Strict
- **セッションタイムアウト**: アイドル（30分）+ 絶対（8時間）+ 5分前警告
- **デバイスフィンガープリント**: 不正デバイス検出とリスクスコア計算
- **CSRF保護**: Double Submit Cookie方式
- **同時ログイン制御**: ユーザー/デバイス単位でのセッション制限
- **自動保存機能**: タイムアウト前のデータ保存

## ディレクトリ構造

```
secure-session-system/
├── app/
│   └── api/
│       └── auth/
│           └── refresh/
│               └── route.ts                 # リフレッシュトークンAPI
├── lib/
│   ├── auth/
│   │   ├── jwt-service.ts                   # JWT認証サービス
│   │   ├── cookie-service.ts                # セキュアクッキー管理
│   │   ├── device-service.ts                # デバイスフィンガープリント
│   │   ├── session-timeout.ts               # セッションタイムアウト管理
│   │   ├── csrf-service.ts                  # CSRF保護
│   │   └── concurrent-session-control.ts    # 同時ログイン制御
│   └── database.ts                          # データベース接続（既存）
├── models/
│   ├── UserSession.ts                       # セッション管理モデル（既存）
│   └── TokenBlacklist.ts                    # トークンブラックリスト（既存）
└── SECURE_SESSION_SYSTEM_GUIDE.md          # このガイド
```

## 実装したコンポーネント

### 1. JWT認証サービス (`jwt-service.ts`)

JWT認証の中核となるサービス。アクセストークンとリフレッシュトークンの生成・検証・ローテーションを管理します。

**主な機能:**
- アクセストークン生成（15分有効期限）
- リフレッシュトークン生成（7日有効期限）
- トークン検証とブラックリスト確認
- トークンローテーション（セキュリティ向上）
- デバイスフィンガープリント生成
- セッション統計取得

### 2. セキュアクッキー管理 (`cookie-service.ts`)

HTTPOnlyクッキーによる安全なトークン管理サービス。

**セキュリティ設定:**
- `httpOnly: true` - JavaScriptからアクセス不可
- `secure: true` - HTTPS接続でのみ送信
- `sameSite: 'strict'` - CSRF攻撃防止
- パス制限による最小権限原則

**管理するクッキー:**
- `admin_access_token` - アクセストークン
- `admin_refresh_token` - リフレッシュトークン
- `admin_session_id` - セッション識別子
- `admin_csrf_token` - CSRF保護トークン
- `admin_device_id` - デバイス識別子

### 3. リフレッシュトークンAPI (`app/api/auth/refresh/route.ts`)

アクセストークンを自動更新するAPIエンドポイント。

**処理フロー:**
1. セキュリティチェック（Origin、User-Agent検証）
2. リフレッシュトークンの取得と検証
3. 新しいトークンペアの生成
4. セキュアクッキーの更新
5. 失敗時のクッキークリーンアップ

### 4. デバイス管理サービス (`device-service.ts`)

デバイス識別とセキュリティ監視を行うサービス。

**デバイスフィンガープリント要素:**
- User-Agent文字列
- IPアドレス（匿名化）
- スクリーン情報（解像度、色深度）
- タイムゾーン
- 言語設定
- プラットフォーム情報

**リスクスコア計算:**
- User-Agent anomalies (+25点)
- 異常なスクリーン解像度 (+15点)
- 日本以外のタイムゾーン (+15点)
- クッキー無効 (+20点)
- 頻繁なIP変更 (+20点)

### 5. セッションタイムアウト管理 (`session-timeout.ts`)

包括的なタイムアウト管理システム。

**タイムアウト種類:**
- **アイドルタイムアウト**: 30分操作なしで自動ログアウト
- **絶対タイムアウト**: 8時間で強制ログアウト
- **警告システム**: 5分前にポップアップ通知
- **自動保存**: 2分毎にフォームデータを保存

**監視するアクティビティ:**
- マウス操作（移動、クリック）
- キーボード入力
- スクロール操作
- タッチ操作
- フォーカス変更

### 6. CSRF保護サービス (`csrf-service.ts`)

Cross-Site Request Forgery攻撃から保護するサービス。

**保護方式:**
- **Double Submit Cookie**: クッキーとヘッダーでトークン照合
- **Origin検証**: リクエスト元の検証
- **Referer検証**: 参照元URLの確認
- **SameSiteクッキー**: ブラウザレベルでの保護

**検証プロセス:**
1. メソッド確認（GET/HEAD/OPTIONSはスキップ）
2. Origin/Refererヘッダー検証
3. CSRFトークンの取得（Cookie + Header）
4. トークン一致確認

### 7. 同時ログイン制御 (`concurrent-session-control.ts`)

ユーザーの同時セッション数を制御するサービス。

**制限設定:**
- ユーザーあたり最大3セッション
- デバイスあたり最大1セッション
- システム全体で最大1000セッション

**制御ロジック:**
1. セッション制限チェック
2. 超過時の古いセッション削除
3. 新規セッション作成
4. 期限切れセッションの自動クリーンアップ

## セキュリティ機能

### 🔐 認証・認可

| 機能 | 実装方式 | セキュリティレベル |
|------|----------|-------------------|
| JWT認証 | RS256/HS256 | ⭐⭐⭐⭐⭐ |
| トークンローテーション | 自動更新 | ⭐⭐⭐⭐⭐ |
| ブラックリスト | Redis/MongoDB | ⭐⭐⭐⭐ |

### 🍪 クッキー保護

| 属性 | 設定値 | 効果 |
|------|--------|------|
| HttpOnly | true | XSS攻撃防止 |
| Secure | true | HTTPS強制 |
| SameSite | Strict | CSRF攻撃防止 |
| Path | 制限あり | 最小権限原則 |

### 🛡️ 攻撃対策

| 攻撃タイプ | 対策 | 実装状況 |
|-----------|------|---------|
| CSRF | Double Submit Cookie | ✅ |
| XSS | CSP + HttpOnly | ✅ |
| Session Fixation | セッション再生成 | ✅ |
| Brute Force | レート制限 | ✅ |
| Session Hijacking | デバイス検証 | ✅ |

## コードの詳細説明

### JWTサービスの核心機能

```typescript
export class JWTService {
  // アクセストークン生成
  static generateAccessToken(payload: {
    userId: string;
    email: string;
    role: string;
    sessionId: string;
    deviceId: string;
  }): string {
    const tokenPayload = {
      ...payload,
      type: 'access'
    };

    return jwt.sign(tokenPayload, SECRETS.access, {
      expiresIn: TOKEN_CONFIG.access.expiresIn, // 15分
      issuer: TOKEN_CONFIG.access.issuer,
      audience: TOKEN_CONFIG.access.audience,
      algorithm: 'HS256'
    });
  }

  // トークンローテーション（セキュリティ強化）
  static async refreshTokens(refreshToken: string): Promise<{
    success: boolean;
    tokens?: TokenPair;
    error?: string;
  }> {
    // 1. リフレッシュトークン検証
    const validation = await this.validateRefreshToken(refreshToken);
    if (!validation.valid) return { success: false, error: validation.error };

    // 2. 古いトークンをブラックリスト追加
    await TokenBlacklist.addToBlacklist(refreshToken, 'token_rotated');

    // 3. 新しいトークンペア生成
    const newTokens = await this.generateTokenPair(/* セッション情報 */);
    
    return { success: true, tokens: newTokens };
  }
}
```

### デバイスフィンガープリントの生成

```typescript
static generateFingerprint(deviceInfo: DeviceInfo): DeviceFingerprint {
  const components = {
    userAgent: deviceInfo.userAgent,
    ipAddressHash: this.hashIPAddress(deviceInfo.ipAddress),
    screen: deviceInfo.screen ? 
      `${deviceInfo.screen.width}x${deviceInfo.screen.height}_${deviceInfo.screen.colorDepth}` : 
      undefined,
    timezone: deviceInfo.timezone,
    language: deviceInfo.language,
    platform: deviceInfo.platform
  };

  // SHA256ハッシュでフィンガープリント生成
  const fingerprintData = JSON.stringify(components);
  const hash = crypto.createHash('sha256').update(fingerprintData).digest('hex');
  
  return {
    id: hash.substring(0, 16),
    hash,
    confidence: this.calculateConfidence(deviceInfo),
    riskScore: this.calculateRiskScore(deviceInfo, components),
    components,
    metadata: {
      createdAt: new Date(),
      lastSeenAt: new Date(),
      sessionCount: 1,
      isBlocked: false
    }
  };
}
```

### セッションタイムアウトの活動監視

```typescript
private setupActivityListeners(): void {
  const events = [
    'mousedown', 'mousemove', 'keypress', 'scroll', 
    'touchstart', 'click', 'focus', 'blur'
  ];

  const activityHandler = () => {
    this.updateActivity();
  };

  events.forEach(event => {
    document.addEventListener(event, activityHandler, { passive: true });
  });

  // ページ可視性変更の監視
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      this.updateActivity();
    }
  });
}

private handleIdleTimeout(): void {
  this.state.isActive = false;
  
  // 自動保存実行
  this.performAutoSave();
  
  // ログアウト処理
  this.performLogout('idle_timeout');
  
  // ページリダイレクト
  window.location.href = '/admin/login?reason=idle_timeout';
}
```

### CSRF保護の実装

```typescript
static validateCSRFToken(request: NextRequest): CSRFValidationResult {
  // 1. Origin検証
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  
  if (origin && new URL(origin).host !== host) {
    return { valid: false, error: 'origin_mismatch' };
  }

  // 2. CSRFトークン取得
  const cookieToken = getCookie(request, 'csrf_token');
  const headerToken = request.headers.get('x-csrf-token');

  // 3. Double Submit Cookie検証
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return { valid: false, error: 'token_mismatch' };
  }

  return { valid: true, token: cookieToken };
}
```

## 使用方法

### 1. 基本的な設定

```typescript
// 環境変数設定 (.env)
JWT_ACCESS_SECRET=your-access-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
MONGODB_URI=your-mongodb-connection-string
```

### 2. ログイン処理での使用

```typescript
// ログイン API
import { JWTService } from '@/lib/auth/jwt-service';
import { CookieService } from '@/lib/auth/cookie-service';
import { DeviceService } from '@/lib/auth/device-service';

export async function POST(request: NextRequest) {
  // 1. ユーザー認証
  const user = await authenticateUser(email, password);
  
  // 2. デバイス検証
  const deviceInfo = extractDeviceInfo(request);
  const deviceValidation = await DeviceService.validateDevice(deviceInfo, user.id);
  
  if (!deviceValidation.valid) {
    return NextResponse.json({ error: 'Device not trusted' }, { status: 403 });
  }
  
  // 3. トークンペア生成
  const tokens = await JWTService.generateTokenPair({
    userId: user.id,
    email: user.email,
    role: user.role,
    sessionId: generateSessionId(),
    deviceId: deviceValidation.fingerprint.id
  });
  
  // 4. セキュアクッキー設定
  const response = NextResponse.json({ success: true });
  CookieService.setAccessTokenCookie(response, tokens.accessToken);
  CookieService.setRefreshTokenCookie(response, tokens.refreshToken);
  
  return response;
}
```

### 3. フロントエンドでの使用

```typescript
// React Component
import { useSessionTimeout } from '@/lib/auth/session-timeout';

function AdminDashboard() {
  const sessionManager = useSessionTimeout({
    idleTimeout: 30 * 60 * 1000,    // 30分
    absoluteTimeout: 8 * 60 * 60 * 1000, // 8時間
    warningTime: 5 * 60 * 1000      // 5分前警告
  });

  useEffect(() => {
    if (!sessionManager) return;

    // タイムアウト警告イベント
    sessionManager.manager.on('idle_warning', (warning) => {
      showTimeoutWarning(warning);
    });

    // 自動ログアウトイベント
    sessionManager.manager.on('logout', (data) => {
      redirectToLogin(data.reason);
    });

    return () => sessionManager.manager.cleanup();
  }, [sessionManager]);

  return (
    <div>
      {/* ダッシュボードコンテンツ */}
    </div>
  );
}
```

### 4. API保護の実装

```typescript
// CSRF保護付きAPI
import { withCSRFProtection } from '@/lib/auth/csrf-service';

const handler = async (request: NextRequest) => {
  // API処理
  return NextResponse.json({ success: true });
};

export const POST = withCSRFProtection(handler);
```

## 設定項目

### JWT設定

```typescript
const TOKEN_CONFIG = {
  access: {
    expiresIn: 15 * 60,        // 15分
    issuer: 'secure-admin-system',
    audience: 'admin-dashboard'
  },
  refresh: {
    expiresIn: 7 * 24 * 60 * 60, // 7日
    issuer: 'secure-admin-system',
    audience: 'admin-refresh'
  }
};
```

### セッションタイムアウト設定

```typescript
const TIMEOUT_CONFIG = {
  idleTimeout: 30 * 60 * 1000,     // 30分
  absoluteTimeout: 8 * 60 * 60 * 1000, // 8時間
  warningTime: 5 * 60 * 1000,      // 5分前警告
  autoSaveInterval: 2 * 60 * 1000  // 2分毎自動保存
};
```

### 同時ログイン制御設定

```typescript
const SESSION_LIMITS = {
  maxSessionsPerUser: 3,      // ユーザーあたり最大3セッション
  maxSessionsPerDevice: 1,    // デバイスあたり最大1セッション
  maxSessionsGlobal: 1000,    // システム全体で最大1000セッション
  sessionTimeout: 30 * 60 * 1000, // 30分タイムアウト
  allowDuplicateDevice: false      // 同一デバイス重複ログイン禁止
};
```

### デバイス検証設定

```typescript
const DEVICE_CONFIG = {
  RISK_THRESHOLDS: {
    LOW: 30,      // 低リスク (0-30)
    MEDIUM: 70,   // 中リスク (31-70)  
    HIGH: 90      // 高リスク (71-100)
  },
  MIN_CONFIDENCE_SCORE: 60,  // 最小信頼度スコア
  SUSPICIOUS_IP_CHANGE_THRESHOLD: 5  // IP変更回数閾値
};
```

## まとめ

このセキュアセッション管理システムは、現代のWebアプリケーションに必要なすべてのセキュリティ要件を満たす包括的なソリューションです。JWT認証、セキュアクッキー、デバイス検証、CSRF保護、同時ログイン制御、自動タイムアウトなどの機能が統合されており、エンタープライズレベルのセキュリティを提供します。

**主な利点:**
- 🔒 **多層防御**: 複数のセキュリティ機能による包括的保護
- 🚀 **パフォーマンス**: 効率的なトークン管理とキャッシュ機能
- 🔧 **拡張性**: モジュラー設計による機能追加の容易さ
- 📊 **監視機能**: 詳細なセッション統計とログ機能
- 👥 **ユーザー体験**: スムーズな認証フローと警告システム

このシステムを導入することで、セキュリティリスクを大幅に軽減し、ユーザーに安全で快適な体験を提供できます。