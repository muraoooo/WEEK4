# システム設定機能 - 要件定義書

## 📋 目次
1. [概要](#概要)
2. [機能要件](#機能要件)
3. [非機能要件](#非機能要件)
4. [データベース設計](#データベース設計)
5. [API設計](#api設計)
6. [UI/UX設計](#uiux設計)
7. [実装計画](#実装計画)
8. [テスト計画](#テスト計画)

---

## 概要

### プロジェクト名
Secure Session System - システム設定機能

### 目的
管理者がシステム全体の設定を一元管理できる包括的な設定画面を実装する。

### スコープ
- 一般設定
- セキュリティ設定
- メール設定
- ストレージ設定
- 通知設定
- API設定

### 技術スタック
- **フロントエンド**: Next.js 13+ (App Router), TypeScript, Material-UI v5
- **バックエンド**: Next.js API Routes
- **データベース**: MongoDB Atlas
- **認証**: JWT + bcryptjs
- **メール**: Nodemailer

---

## 機能要件

### 1. 一般設定 (General Settings)

#### 1.1 サイト情報
- **サイト名**: システム全体の名称設定
- **サイト説明**: システムの説明文
- **管理者メールアドレス**: システム管理者の連絡先
- **タイムゾーン**: システムのデフォルトタイムゾーン
- **言語設定**: デフォルト言語（日本語/英語）

#### 1.2 メンテナンスモード
- **有効/無効切り替え**: メンテナンスモードのON/OFF
- **メンテナンスメッセージ**: ユーザーに表示するメッセージ
- **除外IPアドレス**: メンテナンス中でもアクセス可能なIPリスト

### 2. セキュリティ設定 (Security Settings)

#### 2.1 セッション管理
- **セッションタイムアウト**: 自動ログアウトまでの時間（分）
- **最大ログイン試行回数**: ロックアウトまでの失敗回数
- **ロックアウト時間**: アカウントロック継続時間（分）

#### 2.2 パスワードポリシー
- **最小文字数**: パスワードの最小長（8-32文字）
- **複雑性要件**:
  - 大文字を含む
  - 小文字を含む
  - 数字を含む
  - 特殊文字を含む
- **パスワード有効期限**: パスワード変更までの日数
- **パスワード履歴**: 再利用を防ぐ過去のパスワード数

#### 2.3 セキュリティ機能
- **HTTPSの強制**: HTTPからHTTPSへのリダイレクト
- **2段階認証の強制**: 全ユーザーへの2FA必須化
- **CSRF保護**: CSRF攻撃対策の有効化

#### 2.4 IPアクセス制限
- **ホワイトリスト**: 許可するIPアドレスリスト
- **ブラックリスト**: 拒否するIPアドレスリスト

### 3. メール設定 (Email Settings)

#### 3.1 SMTP設定
- **SMTPホスト**: メールサーバーのホスト名
- **SMTPポート**: ポート番号（25/465/587）
- **SMTPユーザー名**: 認証用ユーザー名
- **SMTPパスワード**: 認証用パスワード
- **暗号化方式**: TLS/SSL選択
- **送信者名**: デフォルトの送信者名
- **送信者メールアドレス**: デフォルトの送信元アドレス

#### 3.2 メールテンプレート
- **ウェルカムメール**: 新規登録時のメール
- **パスワードリセット**: パスワード再設定メール
- **アカウント停止通知**: アカウント停止時のメール
- **警告通知**: 警告発行時のメール

#### 3.3 送信設定
- **送信遅延**: メール送信間隔（秒）
- **最大再試行回数**: 送信失敗時の再試行回数
- **テストメール送信**: 設定確認用のテスト送信機能

### 4. ストレージ設定 (Storage Settings)

#### 4.1 ファイルアップロード
- **最大ファイルサイズ**: アップロード可能な最大サイズ（MB）
- **許可するファイルタイプ**: アップロード可能な拡張子リスト
- **画像の自動リサイズ**: 画像アップロード時の自動リサイズ設定
- **ストレージ場所**: ローカル/クラウド（S3等）の選択

#### 4.2 CDN設定
- **CDN有効化**: CDNの使用有無
- **CDN URL**: CDNのベースURL
- **キャッシュ期間**: CDNキャッシュの有効期間

#### 4.3 バックアップ設定
- **自動バックアップ**: 定期バックアップの有効化
- **バックアップ間隔**: バックアップ実行間隔（時間）
- **バックアップ保持期間**: 古いバックアップの保持日数

### 5. 通知設定 (Notification Settings)

#### 5.1 メール通知
- **新規ユーザー登録通知**: 管理者への通知
- **コンテンツ通報通知**: モデレーターへの通知
- **システムエラー通知**: システム管理者への通知

#### 5.2 ログアラート
- **エラーレベル設定**: 通知するログレベル（Error/Warning/Info）
- **アラート頻度**: 同一エラーの通知間隔
- **通知先**: アラート送信先メールアドレスリスト

### 6. API設定 (API Settings)

#### 6.1 レート制限
- **リクエスト数/分**: 1分あたりの最大リクエスト数
- **リクエスト数/時**: 1時間あたりの最大リクエスト数
- **除外IPリスト**: レート制限を適用しないIPアドレス

#### 6.2 API キー管理
- **APIキー生成**: 新規APIキーの生成
- **APIキーリスト**: 有効なAPIキーの一覧
- **権限設定**: APIキーごとのアクセス権限
- **有効期限**: APIキーの有効期限設定

#### 6.3 CORS設定
- **CORS有効化**: クロスオリジンリクエストの許可
- **許可するオリジン**: アクセスを許可するドメインリスト
- **許可するメソッド**: 使用可能なHTTPメソッド
- **許可するヘッダー**: 使用可能なHTTPヘッダー

#### 6.4 Webhook設定
- **Webhook URL**: イベント通知先URL
- **イベントタイプ**: 通知するイベントの選択
- **認証トークン**: Webhook認証用のシークレットトークン
- **再試行設定**: 失敗時の再試行回数と間隔

---

## 非機能要件

### パフォーマンス要件
- 設定の読み込み: 1秒以内
- 設定の保存: 2秒以内
- キャッシュ更新: 即座に反映

### セキュリティ要件
- 管理者権限のみアクセス可能
- 設定変更の監査ログ記録
- 機密情報（パスワード等）の暗号化保存
- CSRFトークンによる保護

### 可用性要件
- 設定のバックアップ機能
- 設定のインポート/エクスポート機能
- 設定履歴の保存（最低30日分）

### ユーザビリティ要件
- 直感的なUI設計
- 設定項目のグループ化
- リアルタイムバリデーション
- 変更内容のプレビュー機能
- 設定のリセット機能

---

## データベース設計

### system_settings コレクション

```javascript
{
  _id: ObjectId,
  category: String, // 'general', 'security', 'email', 'storage', 'notification', 'api'
  settings: {
    // General Settings
    siteName: String,
    siteDescription: String,
    adminEmail: String,
    timezone: String,
    defaultLanguage: String,
    maintenanceMode: Boolean,
    maintenanceMessage: String,
    
    // Security Settings
    sessionTimeout: Number,
    maxLoginAttempts: Number,
    lockoutDuration: Number,
    passwordMinLength: Number,
    passwordRequireUppercase: Boolean,
    passwordRequireLowercase: Boolean,
    passwordRequireNumbers: Boolean,
    passwordRequireSpecialChars: Boolean,
    passwordExpiryDays: Number,
    passwordHistoryCount: Number,
    forceHttps: Boolean,
    force2FA: Boolean,
    csrfProtection: Boolean,
    
    // Email Settings
    smtpHost: String,
    smtpPort: Number,
    smtpUser: String,
    smtpPassword: String (encrypted),
    smtpSecure: Boolean,
    emailFrom: String,
    emailFromName: String,
    
    // Storage Settings
    maxFileSize: Number,
    allowedFileTypes: Array<String>,
    imageAutoResize: Boolean,
    storageType: String,
    cdnEnabled: Boolean,
    cdnUrl: String,
    
    // Notification Settings
    notifyNewUser: Boolean,
    notifyReport: Boolean,swsさs
    wq
























    zzxz












    
    notifyError: Boolean,
    errorLogLevel: String,
    
    // API Settings
    rateLimitPerMinute: Number,
    rateLimitPerHour: Number,
    corsEnabled: Boolean,
    allowedOrigins: Array<String>,
    webhookUrl: String,
    webhookSecret: String
  },
  updatedBy: String,
  updatedAt: Date,
  version: Number
}
```

### settings_history コレクション

```javascript
{
  _id: ObjectId,
  settingId: ObjectId,
  category: String,
  previousSettings: Object,
  newSettings: Object,
  changedBy: String,
  changedAt: Date,
  changeReason: String,
  ipAddress: String
}
```

---

## API設計

### エンドポイント一覧

#### GET /api/admin/settings
全設定の取得

#### GET /api/admin/settings/:category
カテゴリ別設定の取得

#### PUT /api/admin/settings/:category
カテゴリ別設定の更新

#### POST /api/admin/settings/test-email
テストメール送信

#### POST /api/admin/settings/backup
設定のバックアップ作成

#### POST /api/admin/settings/restore
設定の復元

#### GET /api/admin/settings/history
設定変更履歴の取得

#### POST /api/admin/settings/export
設定のエクスポート

#### POST /api/admin/settings/import
設定のインポート

---

## UI/UX設計

### 画面構成

#### 1. タブ構造
- 一般設定
- セキュリティ
- メール設定
- ストレージ
- 通知設定
- API設定

#### 2. 各タブの共通要素
- 設定項目のグループ化（カード形式）
- 各項目の説明文
- リアルタイムバリデーション
- 変更箇所のハイライト
- 保存/キャンセルボタン

#### 3. 特殊機能
- テストメール送信ボタン
- 設定のインポート/エクスポート
- 変更履歴の表示
- デフォルト値へのリセット

### レスポンシブデザイン
- デスクトップ: フル機能表示
- タブレット: タブ形式維持
- モバイル: アコーディオン形式に変更

---

## 実装計画

### フェーズ1: 基本実装（1週間）
1. データベーススキーマの作成
2. APIエンドポイントの実装
3. 基本的なUIコンポーネントの作成

### フェーズ2: 機能実装（2週間）
1. 一般設定の実装
2. セキュリティ設定の実装
3. メール設定の実装
4. テスト機能の実装

### フェーズ3: 高度な機能（1週間）
1. ストレージ設定の実装
2. 通知設定の実装
3. API設定の実装

### フェーズ4: 最終調整（3日）
1. バリデーションの強化
2. エラーハンドリング
3. パフォーマンス最適化
4. セキュリティ監査

---

## テスト計画

### 単体テスト
- 各設定項目のバリデーション
- APIエンドポイントのテスト
- データベース操作のテスト

### 統合テスト
- 設定変更の反映確認
- キャッシュ更新の確認
- 権限チェックの確認

### E2Eテスト
- 設定変更フロー全体
- エラー処理の確認
- UIの動作確認

### セキュリティテスト
- 権限バイパステスト
- SQLインジェクション対策確認
- XSS対策確認
- CSRF対策確認

### パフォーマンステスト
- 大量設定データの処理
- 同時アクセステスト
- キャッシュ効果の測定

---

## リスクと対策

### リスク1: 設定ミスによるシステム停止
**対策**: 
- 設定のバリデーション強化
- 変更前の確認画面
- ロールバック機能

### リスク2: 機密情報の漏洩
**対策**: 
- 暗号化による保存
- アクセスログの記録
- 最小権限の原則

### リスク3: パフォーマンス劣化
**対策**: 
- キャッシュの実装
- 非同期処理の活用
- インデックスの最適化

---

## 成功基準

1. **機能性**: すべての設定項目が正常に動作する
2. **使いやすさ**: 管理者が迷わず設定変更できる
3. **安全性**: 不正な設定変更を防げる
4. **パフォーマンス**: 設定変更が2秒以内に完了する
5. **監査性**: すべての変更が記録される

---

## 今後の拡張計画

1. **設定テンプレート機能**: よく使う設定の組み合わせをテンプレート化
2. **設定の自動最適化**: システム負荷に応じた自動調整
3. **多言語対応**: 設定画面の多言語化
4. **設定のスケジューリング**: 時間指定での設定変更
5. **AIによる設定推奨**: 使用状況に基づく最適設定の提案

---

## ドキュメント

### 管理者向けドキュメント
- 設定画面の使い方
- 各設定項目の詳細説明
- トラブルシューティング

### 開発者向けドキュメント
- API仕様書
- データベース設計書
- コード規約

---

作成日: 2025年8月27日
作成者: Claude (AI Assistant)
バージョン: 1.0.0