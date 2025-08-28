# 監査ログシステム設計書

## 1. システム概要

### 目的
- すべての重要操作を自動的に記録
- セキュリティインシデントの検出と追跡
- コンプライアンス要件の充足
- 改ざん防止による証跡の保全

### 主要機能
1. **自動記録**: ミドルウェアによる透過的なログ記録
2. **改ざん防止**: HMAC-SHA256による暗号化署名
3. **検索・分析**: 高度な検索とフィルタリング
4. **自動アーカイブ**: 古いログの自動圧縮と保管
5. **異常検出**: セキュリティイベントの自動検出
6. **レポート生成**: コンプライアンスレポートの自動生成

## 2. データモデル

### AuditLog スキーマ
```javascript
{
  _id: ObjectId,
  
  // 基本情報
  timestamp: Date,              // イベント発生時刻
  eventType: String,            // イベントタイプ
  eventCategory: String,        // カテゴリ（security/data/system/user）
  severity: String,             // 重要度（critical/high/medium/low/info）
  
  // アクター情報
  userId: String,               // 実行ユーザーID
  userEmail: String,            // ユーザーメール
  userName: String,             // ユーザー名
  userRole: String,             // ユーザー権限
  sessionId: String,            // セッションID
  
  // アクション詳細
  action: String,               // 実行されたアクション
  resource: String,             // 対象リソース
  resourceId: String,           // リソースID
  resourceType: String,         // リソースタイプ
  
  // リクエスト情報
  method: String,               // HTTPメソッド
  path: String,                 // リクエストパス
  query: Object,                // クエリパラメータ
  body: Object,                 // リクエストボディ（機密情報除外）
  statusCode: Number,           // レスポンスステータス
  
  // 変更情報
  changes: {
    before: Object,             // 変更前の値
    after: Object,              // 変更後の値
    fields: Array               // 変更されたフィールド
  },
  
  // 環境情報
  ipAddress: String,            // IPアドレス
  userAgent: String,            // ユーザーエージェント
  location: {                   // 地理情報（オプション）
    country: String,
    city: String,
    coordinates: Array
  },
  
  // セキュリティ
  signature: String,            // HMAC-SHA256署名
  previousHash: String,         // 前のログのハッシュ（ブロックチェーン式）
  isValid: Boolean,             // 署名検証結果
  
  // メタデータ
  tags: Array,                  // タグ
  correlationId: String,        // 相関ID（関連操作の追跡）
  duration: Number,             // 処理時間（ms）
  errorDetails: Object,         // エラー詳細
  
  // アーカイブ情報
  isArchived: Boolean,          // アーカイブ済みフラグ
  archivedAt: Date,             // アーカイブ日時
  archiveId: String             // アーカイブID
}
```

## 3. イベントタイプ

### セキュリティイベント
- `AUTH_LOGIN_SUCCESS` - ログイン成功
- `AUTH_LOGIN_FAILED` - ログイン失敗
- `AUTH_LOGOUT` - ログアウト
- `AUTH_PASSWORD_RESET` - パスワードリセット
- `AUTH_2FA_ENABLED` - 2FA有効化
- `AUTH_SESSION_EXPIRED` - セッション期限切れ
- `AUTH_UNAUTHORIZED_ACCESS` - 不正アクセス試行

### データ操作イベント
- `DATA_CREATE` - データ作成
- `DATA_READ` - データ参照
- `DATA_UPDATE` - データ更新
- `DATA_DELETE` - データ削除
- `DATA_EXPORT` - データエクスポート
- `DATA_IMPORT` - データインポート

### ユーザー管理イベント
- `USER_CREATED` - ユーザー作成
- `USER_UPDATED` - ユーザー更新
- `USER_DELETED` - ユーザー削除
- `USER_SUSPENDED` - ユーザー停止
- `USER_REACTIVATED` - ユーザー再有効化
- `ROLE_CHANGED` - 権限変更

### システムイベント
- `SYSTEM_START` - システム起動
- `SYSTEM_SHUTDOWN` - システム停止
- `SYSTEM_CONFIG_CHANGED` - 設定変更
- `SYSTEM_BACKUP` - バックアップ実行
- `SYSTEM_RESTORE` - リストア実行
- `SYSTEM_ERROR` - システムエラー

## 4. 暗号化署名の仕組み

### 署名生成
```javascript
signature = HMAC-SHA256(
  secret_key,
  timestamp + eventType + userId + action + JSON.stringify(changes)
)
```

### ブロックチェーン式連鎖
- 各ログに前のログのハッシュを含める
- 連鎖により過去ログの改ざんを検出可能

### 検証プロセス
1. 個別ログの署名検証
2. ハッシュチェーンの連続性検証
3. タイムスタンプの順序性検証

## 5. API設計

### エンドポイント

#### GET /api/admin/audit-logs
監査ログ一覧取得
- フィルタリング: 期間、ユーザー、イベントタイプ、重要度
- ページネーション対応
- ソート: 時刻、重要度、ユーザー

#### GET /api/admin/audit-logs/:id
特定ログの詳細取得

#### GET /api/admin/audit-logs/verify
ログの整合性検証

#### GET /api/admin/audit-logs/export
ログのエクスポート（CSV/JSON）

#### POST /api/admin/audit-logs/archive
古いログのアーカイブ

#### GET /api/admin/audit-logs/stats
統計情報取得

#### GET /api/admin/audit-logs/report
コンプライアンスレポート生成

## 6. ミドルウェア設計

### 自動記録の仕組み
1. リクエスト受信時に基本情報を記録
2. データベース操作をフック
3. レスポンス送信時に結果を記録
4. 非同期でログをデータベースに保存

### 記録対象の判定
- URLパターンマッチング
- HTTPメソッドによる判定
- ユーザー権限による判定
- 設定による除外リスト

## 7. UI設計

### 監査ログ管理画面
- リアルタイムログビュー
- 高度な検索フォーム
- タイムラインビュー
- 統計ダッシュボード
- アラート設定
- レポート生成

### 主要機能
1. **検索・フィルタ**
   - 日付範囲
   - ユーザー
   - イベントタイプ
   - 重要度
   - IPアドレス
   - フリーテキスト検索

2. **可視化**
   - イベント頻度グラフ
   - ユーザー別アクティビティ
   - エラー率推移
   - 地理的分布

3. **アラート**
   - 異常アクセス検出
   - 大量データ操作
   - 認証失敗の連続
   - 権限昇格

## 8. セキュリティ考慮事項

### アクセス制御
- 監査ログは管理者のみ閲覧可能
- ログの削除は不可（アーカイブのみ）
- 読み取り専用モード

### 機密情報の扱い
- パスワードは記録しない
- クレジットカード番号はマスキング
- 個人情報は最小限に
- トークンは部分的にマスキング

### 改ざん防止
- HMAC-SHA256署名
- ブロックチェーン式連鎖
- 定期的な整合性チェック
- 外部バックアップ

## 9. パフォーマンス最適化

### インデックス
- timestamp（降順）
- userId + timestamp
- eventType + timestamp
- severity + timestamp

### アーカイブ戦略
- 90日以上経過したログを自動アーカイブ
- アーカイブは圧縮して別コレクションに保存
- 必要時にオンデマンドで復元

### キャッシュ
- 統計情報は1時間キャッシュ
- よく使うフィルタ結果をキャッシュ

## 10. コンプライアンス対応

### 対応規格
- GDPR（EU一般データ保護規則）
- PCI-DSS（クレジットカード業界）
- HIPAA（医療情報）
- SOC2（サービス組織管理）

### レポート機能
- アクセスレポート
- 変更履歴レポート
- セキュリティインシデントレポート
- ユーザーアクティビティレポート
- システム可用性レポート

## 11. 実装優先順位

### フェーズ1（必須）
1. データモデル作成
2. 基本的な自動記録
3. 暗号化署名
4. 基本的な検索機能

### フェーズ2（重要）
1. 高度な検索・フィルタ
2. 管理画面UI
3. 整合性検証
4. エクスポート機能

### フェーズ3（拡張）
1. 自動アーカイブ
2. 異常検出
3. レポート生成
4. 可視化機能

## 12. テスト計画

### 単体テスト
- 署名生成・検証
- データモデル操作
- ミドルウェア動作

### 統合テスト
- エンドツーエンドログ記録
- 検索・フィルタリング
- アーカイブ処理

### セキュリティテスト
- 改ざん検出
- アクセス制御
- 機密情報マスキング

### パフォーマンステスト
- 大量ログ記録
- 検索速度
- アーカイブ処理時間