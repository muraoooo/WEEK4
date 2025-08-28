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
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // ログイン成功
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        // リダイレクト
        window.location.replace(from);
      } else {
        setError(data.error || 'ログインに失敗しました');
      }
    } catch (error) {
      setError('ログイン中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // デモ用：管理者としてログイン
  const handleDemoLogin = () => {
    setEmail('admin@example.com');
    setPassword('admin123');
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
            />
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