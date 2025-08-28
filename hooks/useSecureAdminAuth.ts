'use client';

import { useState, useEffect, useCallback } from 'react';

interface AdminAuthState {
  token: string | null;
  loading: boolean;
  error: string | null;
}

export function useSecureAdminAuth() {
  const [authState, setAuthState] = useState<AdminAuthState>({
    token: null,
    loading: false,
    error: null
  });

  // 管理者トークンを取得
  const getAdminToken = useCallback(async () => {
    // セッションストレージから既存のトークンを確認
    const cached = sessionStorage.getItem('admin-api-token');
    const cachedExpiry = sessionStorage.getItem('admin-api-token-expiry');
    
    if (cached && cachedExpiry) {
      const expiry = parseInt(cachedExpiry);
      if (Date.now() < expiry) {
        return cached;
      }
    }

    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // ユーザーの認証トークンを取得（セッションから）
      const userToken = localStorage.getItem('auth-token') || sessionStorage.getItem('auth-token');
      
      if (!userToken) {
        throw new Error('認証が必要です');
      }

      // 管理者API用トークンを取得
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = '管理者認証に失敗しました';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          console.error('Error parsing response:', errorText);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // トークンをセッションストレージに保存（4分30秒）
      sessionStorage.setItem('admin-api-token', data.token);
      sessionStorage.setItem('admin-api-token-expiry', String(Date.now() + 4.5 * 60 * 1000));
      
      setAuthState({
        token: data.token,
        loading: false,
        error: null
      });

      return data.token;

    } catch (error) {
      const message = error instanceof Error ? error.message : '認証エラー';
      setAuthState({
        token: null,
        loading: false,
        error: message
      });
      
      // キャッシュをクリア
      sessionStorage.removeItem('admin-api-token');
      sessionStorage.removeItem('admin-api-token-expiry');
      
      throw error;
    }
  }, []);

  // 認証ヘッダーを生成
  const getAuthHeaders = useCallback(async (): Promise<HeadersInit> => {
    const token = await getAdminToken();
    return {
      'x-admin-token': token,
      'Content-Type': 'application/json'
    };
  }, [getAdminToken]);

  // 安全なfetch関数
  const secureFetch = useCallback(async (
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    const token = await getAdminToken();
    
    const headers = {
      ...options.headers,
      'x-admin-token': token
    };

    return fetch(url, {
      ...options,
      headers
    });
  }, [getAdminToken]);

  // トークンをクリア
  const clearToken = useCallback(() => {
    sessionStorage.removeItem('admin-api-token');
    sessionStorage.removeItem('admin-api-token-expiry');
    setAuthState({
      token: null,
      loading: false,
      error: null
    });
  }, []);

  // 初回マウント時にトークンを確認
  useEffect(() => {
    const cached = sessionStorage.getItem('admin-api-token');
    const cachedExpiry = sessionStorage.getItem('admin-api-token-expiry');
    
    if (cached && cachedExpiry) {
      const expiry = parseInt(cachedExpiry);
      if (Date.now() < expiry) {
        setAuthState({
          token: cached,
          loading: false,
          error: null
        });
      } else {
        clearToken();
      }
    }
  }, [clearToken]);

  return {
    ...authState,
    getAdminToken,
    getAuthHeaders,
    secureFetch,
    clearToken
  };
}