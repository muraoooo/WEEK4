'use client';

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Grid,
  InputAdornment,
  IconButton,
  Breadcrumbs,
  Link,
  FormHelperText,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Divider,
  Stack,
} from '@mui/material';
import {
  Email,
  Lock,
  Person,
  Visibility,
  VisibilityOff,
  ArrowBack,
  Save,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

export default function NewUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
    role: 'user',
    emailVerified: true,
    sendWelcomeEmail: false,
    generateRandomPassword: false,
  });

  const [errors, setErrors] = useState<any>({});

  // メールアドレスの重複チェック（デバウンス付き）
  React.useEffect(() => {
    const checkEmail = async () => {
      if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        setEmailAvailable(null);
        return;
      }

      setCheckingEmail(true);
      try {
        const response = await fetch('/api/admin/users/check-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' , 'x-admin-secret': 'admin-development-secret-key' },
          body: JSON.stringify({ email: formData.email }),
        });
        const data = await response.json();
        setEmailAvailable(!data.exists);
        if (data.exists) {
          setErrors((prev: any) => ({ ...prev, email: data.message }));
        }
      } catch (err) {
        console.error('Email check error:', err);
      } finally {
        setCheckingEmail(false);
      }
    };

    const timer = setTimeout(checkEmail, 500); // 500ms デバウンス
    return () => clearTimeout(timer);
  }, [formData.email]);

  const validateForm = () => {
    const newErrors: any = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'メールアドレスは必須です';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '有効なメールアドレスを入力してください';
    } else {
      // メールアドレスを小文字に統一してチェック
      formData.email = formData.email.toLowerCase().trim();
    }

    // Name validation
    if (!formData.name) {
      newErrors.name = '名前は必須です';
    }

    // Password validation (only if not generating random password)
    if (!formData.generateRandomPassword) {
      if (!formData.password) {
        newErrors.password = 'パスワードは必須です';
      } else if (formData.password.length < 8) {
        newErrors.password = 'パスワードは8文字以上である必要があります';
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'パスワードの確認は必須です';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'パスワードが一致しません';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: any) => {
    const { name, value, checked, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
    // Clear error for this field
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const generateRandomPassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleGeneratePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    if (checked) {
      const newPassword = generateRandomPassword();
      setFormData({
        ...formData,
        generateRandomPassword: checked,
        password: newPassword,
        confirmPassword: newPassword,
      });
    } else {
      setFormData({
        ...formData,
        generateRandomPassword: checked,
        password: '',
        confirmPassword: '',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-secret': 'admin-development-secret-key' 
        },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          password: formData.password, // サーバー側でハッシュ化
          role: formData.role,
          emailVerified: formData.emailVerified,
          adminId: 'current-admin', // This should come from the session
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        // より具体的なエラーメッセージ
        if (data.error?.includes('already exists')) {
          throw new Error(`このメールアドレス（${formData.email}）は既に登録されています`);
        }
        throw new Error(data.error || 'ユーザーの作成に失敗しました');
      }

      const data = await response.json();
      
      // ウェルカムメールを送信
      if (formData.sendWelcomeEmail) {
        try {
          const emailResponse = await fetch('/api/admin/users/welcome-email', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-admin-secret': 'admin-development-secret-key' 
            },
            body: JSON.stringify({
              email: formData.email,
              name: formData.name,
              password: formData.password, // 初期パスワードをメールで送信
              userId: data.user._id,
            }),
          });
          
          if (emailResponse.ok) {
            setSuccess(`ユーザーが正常に作成され、ウェルカムメールを${formData.email}に送信しました`);
          } else {
            setSuccess('ユーザーが正常に作成されました（メール送信は失敗しました）');
          }
        } catch (emailError) {
          console.error('Welcome email error:', emailError);
          setSuccess('ユーザーが正常に作成されました（メール送信は失敗しました）');
        }
      } else {
        setSuccess('ユーザーが正常に作成されました');
      }

      // フォームをリセット
      setFormData({
        email: '',
        name: '',
        password: '',
        confirmPassword: '',
        role: 'user',
        emailVerified: true,
        sendWelcomeEmail: false,
        generateRandomPassword: false,
      });

      // 成功メッセージを表示してからリダイレクト
      setTimeout(() => {
        router.push('/admin/users');
      }, 3000);
    } catch (err: any) {
      console.error('User creation error:', err);
      setError(err.message || 'ユーザーの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link
          underline="hover"
          color="inherit"
          href="/admin"
          onClick={(e) => {
            e.preventDefault();
            router.push('/admin');
          }}
        >
          ホーム
        </Link>
        <Link
          underline="hover"
          color="inherit"
          href="/admin/users"
          onClick={(e) => {
            e.preventDefault();
            router.push('/admin/users');
          }}
        >
          ユーザー管理
        </Link>
        <Typography color="text.primary">新規ユーザー作成</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">新規ユーザー作成</Typography>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => router.push('/admin/users')}
        >
          戻る
        </Button>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Form */}
      <Paper sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
        <form onSubmit={handleSubmit}>
          <Stack spacing={4}>
            {/* 基本情報セクション */}
            <Box>
              <Typography variant="h6" sx={{ mb: 3, color: 'primary.main', fontWeight: 600 }}>
                基本情報
              </Typography>
              <Stack spacing={3}>
                {/* Email */}
                <TextField
                  fullWidth
                  label="メールアドレス"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  error={!!errors.email || (emailAvailable === false)}
                  helperText={
                    checkingEmail ? '確認中...' :
                    errors.email ? errors.email :
                    emailAvailable === true ? '✓ 使用可能です' :
                    emailAvailable === false ? '✗ このメールアドレスは既に使用されています' :
                    '例: user@example.com'
                  }
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: checkingEmail && (
                      <InputAdornment position="end">
                        <CircularProgress size={20} />
                      </InputAdornment>
                    ),
                  }}
                />

                {/* Name */}
                <TextField
                  fullWidth
                  label="名前"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  error={!!errors.name}
                  helperText={errors.name || 'ユーザーの表示名を入力してください'}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Stack>
            </Box>

            <Divider />

            {/* パスワードセクション */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 600 }}>
                パスワード設定
              </Typography>
              
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.generateRandomPassword}
                    onChange={handleGeneratePasswordChange}
                    name="generateRandomPassword"
                    color="primary"
                  />
                }
                label="ランダムパスワードを生成"
                sx={{ mb: 2 }}
              />
              
              <Stack spacing={3}>
                {/* Password */}
                <TextField
                  fullWidth
                  label="パスワード"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  error={!!errors.password}
                  helperText={errors.password || (formData.generateRandomPassword ? '自動生成されました' : '8文字以上のパスワードを入力してください')}
                  required={!formData.generateRandomPassword}
                  disabled={formData.generateRandomPassword}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                {/* Confirm Password */}
                <TextField
                  fullWidth
                  label="パスワード（確認）"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword || '同じパスワードをもう一度入力してください'}
                  required={!formData.generateRandomPassword}
                  disabled={formData.generateRandomPassword}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Stack>
            </Box>

            <Divider />

            {/* 権限とオプションセクション */}
            <Box>
              <Typography variant="h6" sx={{ mb: 3, color: 'primary.main', fontWeight: 600 }}>
                権限とオプション
              </Typography>
              
              <Stack spacing={3}>
                {/* Role */}
                <FormControl fullWidth>
                  <InputLabel>権限</InputLabel>
                  <Select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    label="権限"
                  >
                    <MenuItem value="user">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Person fontSize="small" />
                        <Box>
                          <Typography variant="body1">ユーザー</Typography>
                          <Typography variant="caption" color="text.secondary">基本的な機能のみアクセス可能</Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                    <MenuItem value="moderator">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Person fontSize="small" color="warning" />
                        <Box>
                          <Typography variant="body1">モデレーター</Typography>
                          <Typography variant="caption" color="text.secondary">コンテンツ管理権限付き</Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                    <MenuItem value="admin">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Person fontSize="small" color="error" />
                        <Box>
                          <Typography variant="body1">管理者</Typography>
                          <Typography variant="caption" color="text.secondary">すべての権限を持つ</Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  </Select>
                  <FormHelperText>ユーザーの権限レベルを選択してください</FormHelperText>
                </FormControl>

                {/* Options */}
                <Paper variant="outlined" sx={{ p: 3, bgcolor: 'background.default' }}>
                  <Stack spacing={2}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.emailVerified}
                          onChange={handleChange}
                          name="emailVerified"
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body1">メール確認済みとして設定</Typography>
                          <Typography variant="caption" color="text.secondary">
                            ユーザーのメールアドレスが確認済みとして登録されます
                          </Typography>
                        </Box>
                      }
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.sendWelcomeEmail}
                          onChange={handleChange}
                          name="sendWelcomeEmail"
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body1">ウェルカムメールを送信</Typography>
                          <Typography variant="caption" color="text.secondary">
                            新規ユーザーにログイン情報を含むメールを送信します
                          </Typography>
                        </Box>
                      }
                    />
                  </Stack>
                </Paper>
              </Stack>
            </Box>

            {/* Submit Buttons */}
            <Box display="flex" gap={2} justifyContent="flex-end" sx={{ mt: 2 }}>
              <Button
                  variant="outlined"
                  onClick={() => router.push('/admin/users')}
                  disabled={loading}
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<Save />}
                  disabled={loading || checkingEmail || emailAvailable === false}
                >
                  {loading ? '作成中...' : 'ユーザーを作成'}
                </Button>
            </Box>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}