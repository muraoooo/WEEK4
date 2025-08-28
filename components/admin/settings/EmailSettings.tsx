'use client';

import React, { useState } from 'react';
import {
  Grid,
  TextField,
  Switch,
  FormControlLabel,
  Typography,
  Divider,
  Button,
  InputAdornment,
  IconButton,
  Alert,
  Box,
  CircularProgress,
} from '@mui/material';
import { Visibility, VisibilityOff, Send, CheckCircle } from '@mui/icons-material';

interface EmailSettingsProps {
  settings: any;
  onChange: (settings: any) => void;
}

export default function EmailSettings({ settings = {}, onChange }: EmailSettingsProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // 環境変数の設定を表示用に使用（読み取り専用の参考情報として）
  const envConfigured = process.env.NEXT_PUBLIC_EMAIL_CONFIGURED === 'true';

  const handleChange = (field: string, value: any) => {
    onChange({
      ...settings,
      [field]: value,
    });
  };

  const handleTestEmail = async () => {
    if (!testEmail) return;
    
    setTestEmailSending(true);
    setTestEmailResult(null);
    
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': process.env.NEXT_PUBLIC_ADMIN_SECRET_KEY || 'admin-development-secret-key',
        },
        body: JSON.stringify({
          action: 'test-email',
          data: { testEmail }
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        setTestEmailResult({
          success: true,
          message: 'テストメールを送信しました。受信箱を確認してください。'
        });
        setTestEmail('');
      } else {
        setTestEmailResult({
          success: false,
          message: result.error || 'テストメールの送信に失敗しました'
        });
      }
    } catch (error) {
      setTestEmailResult({
        success: false,
        message: 'テストメールの送信中にエラーが発生しました'
      });
    } finally {
      setTestEmailSending(false);
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Alert severity="info">
          メール設定はシステムからの通知メール送信に使用されます。正しく設定されていることを確認してください。
        </Alert>
      </Grid>
      
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          SMTP設定
        </Typography>
      </Grid>
      
      <Grid item xs={12} md={8}>
        <TextField
          fullWidth
          label="SMTPホスト"
          value={settings.smtpHost || ''}
          onChange={(e) => handleChange('smtpHost', e.target.value)}
          placeholder="例: smtp.gmail.com"
          helperText="メールサーバーのホスト名"
        />
      </Grid>
      
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label="SMTPポート"
          type="number"
          value={settings.smtpPort || 587}
          onChange={(e) => handleChange('smtpPort', parseInt(e.target.value))}
          helperText="25, 465, 587 など"
          InputProps={{
            inputProps: { min: 1, max: 65535 }
          }}
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="SMTPユーザー名"
          value={settings.smtpUser || ''}
          onChange={(e) => handleChange('smtpUser', e.target.value)}
          helperText="認証用のユーザー名"
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="SMTPパスワード"
          type={showPassword ? 'text' : 'password'}
          value={settings.smtpPassword || ''}
          onChange={(e) => handleChange('smtpPassword', e.target.value)}
          helperText="認証用のパスワード（暗号化して保存されます）"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Grid>
      
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={settings.smtpSecure || false}
              onChange={(e) => handleChange('smtpSecure', e.target.checked)}
            />
          }
          label="セキュア接続（TLS/SSL）を使用"
        />
      </Grid>
      
      <Grid item xs={12}>
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" gutterBottom>
          送信設定
        </Typography>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="送信者メールアドレス"
          type="email"
          value={settings.emailFrom || ''}
          onChange={(e) => handleChange('emailFrom', e.target.value)}
          placeholder="noreply@example.com"
          helperText="デフォルトの送信元アドレス"
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="送信者名"
          value={settings.emailFromName || ''}
          onChange={(e) => handleChange('emailFromName', e.target.value)}
          placeholder="Secure Session System"
          helperText="デフォルトの送信者名"
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="送信遅延"
          type="number"
          value={settings.emailSendDelay || 1}
          onChange={(e) => handleChange('emailSendDelay', parseInt(e.target.value))}
          InputProps={{
            endAdornment: <InputAdornment position="end">秒</InputAdornment>,
            inputProps: { min: 0, max: 60 }
          }}
          helperText="メール送信間隔（0-60秒）"
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="最大再試行回数"
          type="number"
          value={settings.emailMaxRetries || 3}
          onChange={(e) => handleChange('emailMaxRetries', parseInt(e.target.value))}
          InputProps={{
            endAdornment: <InputAdornment position="end">回</InputAdornment>,
            inputProps: { min: 0, max: 10 }
          }}
          helperText="送信失敗時の再試行回数（0-10回）"
        />
      </Grid>
      
      <Grid item xs={12}>
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" gutterBottom>
          テストメール送信
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          設定が正しく機能することを確認するためにテストメールを送信します
        </Typography>
      </Grid>
      
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <TextField
            fullWidth
            label="テスト送信先メールアドレス"
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="test@example.com"
            disabled={testEmailSending}
          />
          <Button
            variant="contained"
            startIcon={testEmailSending ? <CircularProgress size={20} /> : <Send />}
            onClick={handleTestEmail}
            disabled={!testEmail || testEmailSending}
            sx={{ minWidth: 120 }}
          >
            {testEmailSending ? '送信中...' : 'テスト送信'}
          </Button>
        </Box>
      </Grid>
      
      {testEmailResult && (
        <Grid item xs={12}>
          <Alert 
            severity={testEmailResult.success ? 'success' : 'error'}
            icon={testEmailResult.success ? <CheckCircle /> : undefined}
            onClose={() => setTestEmailResult(null)}
          >
            {testEmailResult.message}
          </Alert>
        </Grid>
      )}
    </Grid>
  );
}