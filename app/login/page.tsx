'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';
import { LockOutlined } from '@mui/icons-material';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/admin/dashboard';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('🔐 Starting login process...', { email });
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('📡 Login response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Login failed:', response.status, errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          setError(errorData.error || `ログインに失敗しました (${response.status})`);
        } catch {
          setError(`ログインに失敗しました (${response.status}): ${errorText}`);
        }
        return;
      }

      const data = await response.json();
      console.log('✅ Login successful:', { hasToken: !!data.token, userRole: data.user?.role });

      if (data.success && data.token) {
        // ログイン成功 - トークンを統一的に保存
        localStorage.setItem('token', data.token);
        localStorage.setItem('auth-token', data.token); // 認証チェック用
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        
        // クッキーにも保存（ミドルウェア用）
        const isSecure = window.location.protocol === 'https:';
        document.cookie = `access_token=${data.token}; path=/; ${isSecure ? 'secure;' : ''} samesite=lax`;
        
        console.log('🎉 Redirecting to:', from);
        // リダイレクト
        window.location.href = from;
      } else {
        setError('ログイン処理でエラーが発生しました');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      setError(`ログイン中にエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setLoading(false);
    }
  };

  // デモ用：管理者としてログイン
  const handleDemoLogin = () => {
    setEmail('admin@example.com');
    setPassword('Admin123!@#');
  };

  // ワンクリックログイン
  const handleOneClickLogin = async () => {
    setError('');
    setLoading(true);
    
    try {
      console.log('🚀 One-click login started');
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: 'admin@example.com', 
          password: 'Admin123!@#' 
        }),
      });

      console.log('📡 One-click login response:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ One-click login failed:', errorText);
        setError('ワンクリックログインに失敗しました');
        return;
      }

      const data = await response.json();
      console.log('✅ One-click login successful');

      if (data.success && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('auth-token', data.token);
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        
        const isSecure = window.location.protocol === 'https:';
        document.cookie = `access_token=${data.token}; path=/; ${isSecure ? 'secure;' : ''} samesite=lax`;
        
        console.log('🎉 One-click redirect to:', from);
        window.location.href = from;
      } else {
        setError('ワンクリックログインでエラーが発生しました');
      }
    } catch (error) {
      console.error('❌ One-click login error:', error);
      setError('ワンクリックログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                backgroundColor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2
              }}
            >
              <LockOutlined sx={{ color: 'white' }} />
            </Box>
            <Typography component="h1" variant="h5">
              ログイン
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              管理画面へアクセス
            </Typography>
          </Box>

          {/* デモ用認証情報 */}
          <Box sx={{ 
            mt: 2, 
            p: 2, 
            bgcolor: 'success.light', 
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'success.main'
          }}>
            <Typography variant="subtitle2" color="success.dark" gutterBottom>
              🎯 簡単ログイン方法:
            </Typography>
            <Typography variant="body2" color="success.dark" sx={{ mb: 1 }}>
              • 緑のボタンをクリックで即座にログイン
            </Typography>
            <Typography variant="body2" color="success.dark">
              • または認証情報を自動入力してログイン
            </Typography>
          </Box>
          
          {/* 認証情報詳細 */}
          <Box sx={{ 
            mt: 1, 
            p: 2, 
            bgcolor: 'grey.100', 
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'grey.300'
          }}>
            <Typography variant="caption" color="text.secondary" display="block">
              デモ用認証情報: admin@example.com / Admin123!@#
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="メールアドレス"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="パスワード"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin123!@#"
            />
            
            {/* ワンクリックログインボタン */}
            <Button
              type="button"
              fullWidth
              variant="contained"
              color="success"
              sx={{ mt: 2, mb: 1 }}
              onClick={handleOneClickLogin}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : '🚀 管理者として即座にログイン'}
            </Button>
            
            {/* デモ用オートフィルボタン */}
            <Button
              type="button"
              fullWidth
              variant="outlined"
              color="info"
              sx={{ mt: 1 }}
              onClick={() => {
                setEmail('admin@example.com');
                setPassword('Admin123!@#');
              }}
              disabled={loading}
            >
              デモ用認証情報を自動入力
            </Button>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'ログイン'}
            </Button>

            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" align="center">
                デモ用アカウント
              </Typography>
              <Button
                fullWidth
                variant="outlined"
                sx={{ mt: 1 }}
                onClick={handleDemoLogin}
              >
                管理者としてログイン（デモ）
              </Button>
            </Box>
          </Box>
        </Paper>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
          Secure Session System
        </Typography>
      </Box>
    </Container>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<CircularProgress />}>
      <LoginForm />
    </Suspense>
  );
}