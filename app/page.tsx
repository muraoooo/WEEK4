/**
 * メインページ
 */

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center">
      <div className="max-w-md mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Secure Session System
          </h1>
          <p className="text-gray-600 mb-8">
            エンタープライズレベルのセキュリティを提供する包括的なセッション管理システム
          </p>
          
          <div className="space-y-4">
            <a
              href="/api/auth/refresh"
              className="block w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              リフレッシュトークンAPI
            </a>
            
            <div className="text-sm text-gray-500">
              <p>セキュリティ機能:</p>
              <ul className="text-left mt-2 space-y-1">
                <li>✓ JWT認証 (Access + Refresh Token)</li>
                <li>✓ セキュアクッキー (HttpOnly, Secure, SameSite)</li>
                <li>✓ デバイスフィンガープリント</li>
                <li>✓ セッションタイムアウト (30分/8時間)</li>
                <li>✓ CSRF保護</li>
                <li>✓ 同時ログイン制御</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}