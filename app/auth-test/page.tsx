'use client';

import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Paper, 
  Typography, 
  Button, 
  Box, 
  Alert,
  Stack,
  Chip,
  Divider,
  TextField,
  Card,
  CardContent
} from '@mui/material';
import { 
  Lock, 
  LockOpen, 
  Refresh, 
  Cookie,
  Security,
  CheckCircle,
  Warning
} from '@mui/icons-material';

export default function AuthTestPage() {
  const [authStatus, setAuthStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loginData, setLoginData] = useState({
    email: 'test@example.com',
    password: 'password123'
  });

  // 認証状態をチェック
  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/verify', {
        credentials: 'include'
      });
      const data = await response.json();
      setAuthStatus(data);
    } catch (err) {
      setError('認証状態の確認に失敗しました');
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // ログイン
  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(loginData)
      });

      const data = await response.json();

      if (data.success) {
        setMessage('ログインに成功しました！トークンがCookieに保存されました。');
        await checkAuthStatus();
      } else {
        setError(data.error?.message || 'ログインに失敗しました');
      }
    } catch (err) {
      setError('ログイン処理でエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // トークンリフレッシュ
  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        setMessage('トークンが正常に更新されました！');
        await checkAuthStatus();
      } else {
        setError(data.error?.message || 'トークンの更新に失敗しました');
      }
    } catch (err) {
      setError('リフレッシュ処理でエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // ログアウト
  const handleLogout = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        setMessage('ログアウトしました。トークンが削除されました。');
        setAuthStatus(null);
        await checkAuthStatus();
      } else {
        setError('ログアウトに失敗しました');
      }
    } catch (err) {
      setError('ログアウト処理でエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // 管理画面にアクセス（テスト）
  const handleAccessAdmin = () => {
    window.location.href = '/admin/dashboard';
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 300 }}>
        🔐 認証システムテストページ
      </Typography>

      {message && (
        <Alert severity="success" onClose={() => setMessage(null)} sx={{ mb: 3 }}>
          {message}
        </Alert>
      )}

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* 現在の認証状態 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Security color="primary" />
            <Typography variant="h6">現在の認証状態</Typography>
          </Box>
          <Divider sx={{ mb: 2 }} />
          
          {authStatus ? (
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {authStatus.authenticated ? (
                  <>
                    <CheckCircle color="success" />
                    <Chip label="認証済み" color="success" size="small" />
                  </>
                ) : (
                  <>
                    <Warning color="warning" />
                    <Chip label="未認証" color="warning" size="small" />
                  </>
                )}
              </Box>

              {authStatus.user && (
                <Box sx={{ pl: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    ユーザーID: {authStatus.user.userId}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    メール: {authStatus.user.email}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ロール: {authStatus.user.role}
                  </Typography>
                </Box>
              )}

              {authStatus.tokenInfo && (
                <Box sx={{ pl: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    アクセストークン有効期限: {authStatus.tokenInfo.accessTokenExpiry}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    リフレッシュトークン有効期限: {authStatus.tokenInfo.refreshTokenExpiry}
                  </Typography>
                </Box>
              )}
            </Stack>
          ) : (
            <Typography color="text.secondary">
              認証情報を取得中...
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* ログインフォーム */}
      {!authStatus?.authenticated && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Lock color="primary" />
              <Typography variant="h6">ログイン</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <Stack spacing={2}>
              <TextField
                label="メールアドレス"
                type="email"
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                fullWidth
                size="small"
              />
              <TextField
                label="パスワード"
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                fullWidth
                size="small"
              />
              <Button
                variant="contained"
                onClick={handleLogin}
                disabled={loading}
                startIcon={<LockOpen />}
              >
                ログイン
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* アクション */}
      {authStatus?.authenticated && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Cookie color="primary" />
              <Typography variant="h6">トークン操作</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <Stack spacing={2}>
              <Button
                variant="outlined"
                onClick={handleRefresh}
                disabled={loading}
                startIcon={<Refresh />}
              >
                トークンをリフレッシュ
              </Button>
              
              <Button
                variant="contained"
                color="secondary"
                onClick={handleAccessAdmin}
              >
                管理画面にアクセス（認証テスト）
              </Button>
              
              <Button
                variant="outlined"
                color="error"
                onClick={handleLogout}
                disabled={loading}
                startIcon={<Lock />}
              >
                ログアウト
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* 説明 */}
      <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
        <Typography variant="h6" gutterBottom>
          💡 トークンシステムの仕組み
        </Typography>
        <Typography variant="body2" paragraph>
          1. <strong>ログイン</strong>: メールとパスワードでログインすると、アクセストークンとリフレッシュトークンが自動的にCookieに保存されます。
        </Typography>
        <Typography variant="body2" paragraph>
          2. <strong>自動認証</strong>: 管理画面にアクセスすると、Cookieに保存されたトークンが自動的に送信され、認証が行われます。
        </Typography>
        <Typography variant="body2" paragraph>
          3. <strong>トークン更新</strong>: アクセストークンの有効期限が切れそうになったら、リフレッシュトークンを使って自動的に更新されます。
        </Typography>
        <Typography variant="body2" paragraph>
          4. <strong>セキュリティ</strong>: トークンはHTTPOnly Cookieとして保存されるため、JavaScriptから直接アクセスできず、XSS攻撃から保護されます。
        </Typography>
      </Paper>
    </Container>
  );
}