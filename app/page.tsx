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
              href="/login"
              className="block w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition-colors font-semibold"
            >
              ログイン画面へ
            </a>
            
            <a
              href="/admin/dashboard"
              className="block w-full bg-green-600 text-white py-3 px-6 rounded-md hover:bg-green-700 transition-colors font-semibold"
            >
              管理ダッシュボードへ
            </a>
            
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">APIエンドポイント</h3>
              <a
                href="/api/auth/refresh"
                className="block w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors text-sm"
              >
                リフレッシュトークンAPI
              </a>
            </div>
            
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