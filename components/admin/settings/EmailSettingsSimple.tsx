'use client';

import React, { useState } from 'react';
import {
  Grid,
  TextField,
  Typography,
  Alert,
  Button,
  Box,
  CircularProgress,
} from '@mui/material';
import { Send, CheckCircle } from '@mui/icons-material';

interface EmailSettingsProps {
  settings: any;
  onChange: (settings: any) => void;
}

export default function EmailSettings({ settings = {}, onChange }: EmailSettingsProps) {
  const [testEmail, setTestEmail] = useState('');
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);

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
        headers: { 'Content-Type': 'application/json',
        , 'x-admin-secret': 'admin-development-secret-key' },
        body: JSON.stringify({
          action: 'test-email',
          data: { testEmail }
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        setTestEmailResult({
          success: true,
          message: 'テストメールを送信しました。'
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
          メール送信に必要な最小限の設定です。環境変数での設定を推奨します。
        </Alert>
      </Grid>
      
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          SMTP設定
        </Typography>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="SMTPホスト"
          value={settings.smtpHost || ''}
          onChange={(e) => handleChange('smtpHost', e.target.value)}
          placeholder="smtp.gmail.com"
          helperText="メールサーバーのホスト名"
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="SMTPポート"
          type="number"
          value={settings.smtpPort || 587}
          onChange={(e) => handleChange('smtpPort', parseInt(e.target.value))}
          helperText="通常は587または465"
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="送信元メールアドレス"
          type="email"
          value={settings.emailFrom || ''}
          onChange={(e) => handleChange('emailFrom', e.target.value)}
          placeholder="noreply@example.com"
          helperText="システムからのメール送信元"
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="送信者名"
          value={settings.emailFromName || ''}
          onChange={(e) => handleChange('emailFromName', e.target.value)}
          placeholder="システム名"
          helperText="メールの送信者として表示される名前"
        />
      </Grid>
      
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          テスト送信
        </Typography>
      </Grid>
      
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <TextField
            fullWidth
            label="テスト送信先"
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
            {testEmailSending ? '送信中...' : 'テスト'}
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