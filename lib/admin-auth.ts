'use client';

/**
 * 管理者認証用ユーティリティ関数
 * APIコールで一貫した認証ヘッダーを使用するため
 */

// 管理者APIコール用の統一認証ヘッダーを取得
export function getAdminHeaders(): HeadersInit {
  return {
    'x-admin-secret': process.env.ADMIN_SECRET_KEY || 'admin-development-secret-key',
    'Content-Type': 'application/json'
  };
}

// ユーザー認証トークンを取得
export function getUserToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  return localStorage.getItem('token') || 
         localStorage.getItem('auth-token') || 
         sessionStorage.getItem('auth-token');
}

// 管理者権限を持つユーザーの認証ヘッダーを取得
export function getAuthenticatedAdminHeaders(): HeadersInit {
  const userToken = getUserToken();
  const headers: HeadersInit = getAdminHeaders();
  
  if (userToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${userToken}`;
  }
  
  return headers;
}

// 管理者認証状態をチェック
export async function checkAdminAuth(): Promise<{
  isAuthenticated: boolean;
  isAdmin: boolean;
  error?: string;
}> {
  const token = getUserToken();
  
  if (!token) {
    return {
      isAuthenticated: false,
      isAdmin: false,
      error: '認証トークンが見つかりません'
    };
  }
  
  try {
    const response = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      const isAdmin = data.user && (data.user.role === 'admin' || data.user.role === 'moderator');
      
      return {
        isAuthenticated: true,
        isAdmin,
        error: isAdmin ? undefined : '管理者権限が必要です'
      };
    } else {
      return {
        isAuthenticated: false,
        isAdmin: false,
        error: '認証の確認に失敗しました'
      };
    }
  } catch (error) {
    return {
      isAuthenticated: false,
      isAdmin: false,
      error: '認証チェック中にエラーが発生しました'
    };
  }
}

// ログアウト処理
export function logout(): void {
  if (typeof window === 'undefined') return;
  
  // LocalStorageをクリア
  localStorage.removeItem('token');
  localStorage.removeItem('auth-token');
  localStorage.removeItem('refreshToken');
  
  // SessionStorageをクリア
  sessionStorage.removeItem('auth-token');
  sessionStorage.removeItem('admin-api-token');
  sessionStorage.removeItem('admin-api-token-expiry');
  
  // クッキーをクリア
  document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}