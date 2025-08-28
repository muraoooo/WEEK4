'use client';

import React from 'react';
import {
  Grid,
  TextField,
  Switch,
  FormControlLabel,
  Typography,
  Divider,
  InputAdornment,
  Box,
  Chip,
  IconButton,
  Button,
  Card,
  CardContent,
  Alert,
} from '@mui/material';
import { Add, Delete, ContentCopy, Refresh } from '@mui/icons-material';

interface ApiSettingsProps {
  settings: any;
  onChange: (settings: any) => void;
}

export default function ApiSettings({ settings = {}, onChange }: ApiSettingsProps) {
  const [newOrigin, setNewOrigin] = React.useState('');
  const [newMethod, setNewMethod] = React.useState('');
  const [newHeader, setNewHeader] = React.useState('');
  const [newExcludedIP, setNewExcludedIP] = React.useState('');
  const [newWebhookEvent, setNewWebhookEvent] = React.useState('');
  const [showApiKey, setShowApiKey] = React.useState(false);

  const handleChange = (field: string, value: any) => {
    onChange({
      ...settings,
      [field]: value,
    });
  };

  const generateApiKey = () => {
    const key = `sk_${Math.random().toString(36).substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}`;
    handleChange('apiKey', key);
    setShowApiKey(true);
  };

  const copyApiKey = () => {
    if (settings.apiKey) {
      navigator.clipboard.writeText(settings.apiKey);
    }
  };

  const addOrigin = () => {
    if (newOrigin && !settings.allowedOrigins?.includes(newOrigin)) {
      handleChange('allowedOrigins', [...(settings.allowedOrigins || []), newOrigin]);
      setNewOrigin('');
    }
  };

  const removeOrigin = (origin: string) => {
    handleChange('allowedOrigins', (settings.allowedOrigins || []).filter((o: string) => o !== origin));
  };

  const addMethod = () => {
    if (newMethod && !settings.allowedMethods?.includes(newMethod)) {
      handleChange('allowedMethods', [...(settings.allowedMethods || []), newMethod]);
      setNewMethod('');
    }
  };

  const removeMethod = (method: string) => {
    handleChange('allowedMethods', (settings.allowedMethods || []).filter((m: string) => m !== method));
  };

  const addHeader = () => {
    if (newHeader && !settings.allowedHeaders?.includes(newHeader)) {
      handleChange('allowedHeaders', [...(settings.allowedHeaders || []), newHeader]);
      setNewHeader('');
    }
  };

  const removeHeader = (header: string) => {
    handleChange('allowedHeaders', (settings.allowedHeaders || []).filter((h: string) => h !== header));
  };

  const addExcludedIP = () => {
    if (newExcludedIP && !settings.rateLimitExcludedIPs?.includes(newExcludedIP)) {
      handleChange('rateLimitExcludedIPs', [...(settings.rateLimitExcludedIPs || []), newExcludedIP]);
      setNewExcludedIP('');
    }
  };

  const removeExcludedIP = (ip: string) => {
    handleChange('rateLimitExcludedIPs', (settings.rateLimitExcludedIPs || []).filter((i: string) => i !== ip));
  };

  const addWebhookEvent = () => {
    if (newWebhookEvent && !settings.webhookEvents?.includes(newWebhookEvent)) {
      handleChange('webhookEvents', [...(settings.webhookEvents || []), newWebhookEvent]);
      setNewWebhookEvent('');
    }
  };

  const removeWebhookEvent = (event: string) => {
    handleChange('webhookEvents', (settings.webhookEvents || []).filter((e: string) => e !== event));
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          レート制限
        </Typography>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="リクエスト数/分"
          type="number"
          value={settings.rateLimitPerMinute || 60}
          onChange={(e) => handleChange('rateLimitPerMinute', parseInt(e.target.value))}
          InputProps={{
            endAdornment: <InputAdornment position="end">リクエスト/分</InputAdornment>,
            inputProps: { min: 1, max: 1000 }
          }}
          helperText="1分あたりの最大リクエスト数"
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="リクエスト数/時"
          type="number"
          value={settings.rateLimitPerHour || 1000}
          onChange={(e) => handleChange('rateLimitPerHour', parseInt(e.target.value))}
          InputProps={{
            endAdornment: <InputAdornment position="end">リクエスト/時</InputAdornment>,
            inputProps: { min: 1, max: 10000 }
          }}
          helperText="1時間あたりの最大リクエスト数"
        />
      </Grid>
      
      <Grid item xs={12}>
        <Typography variant="subtitle2" gutterBottom>
          レート制限除外IPアドレス
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="IPアドレスを入力"
            value={newExcludedIP}
            onChange={(e) => setNewExcludedIP(e.target.value)}
          />
          <IconButton onClick={addExcludedIP} color="primary">
            <Add />
          </IconButton>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {(settings.rateLimitExcludedIPs || []).map((ip: string) => (
            <Chip
              key={ip}
              label={ip}
              onDelete={() => removeExcludedIP(ip)}
              size="small"
              color="primary"
            />
          ))}
        </Box>
      </Grid>
      
      <Grid item xs={12}>
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" gutterBottom>
          APIキー管理
        </Typography>
      </Grid>
      
      <Grid item xs={12}>
        <Card>
          <CardContent>
            {settings.apiKey ? (
              <>
                <Typography variant="subtitle2" gutterBottom>
                  現在のAPIキー
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    fullWidth
                    value={showApiKey ? settings.apiKey : '••••••••••••••••••••••••'}
                    InputProps={{
                      readOnly: true,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={copyApiKey} size="small">
                            <ContentCopy />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={generateApiKey}
                  >
                    再生成
                  </Button>
                </Box>
              </>
            ) : (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  APIキーがまだ生成されていません
                </Typography>
                <Button
                  variant="contained"
                  onClick={generateApiKey}
                  sx={{ mt: 1 }}
                >
                  APIキーを生成
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12}>
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" gutterBottom>
          CORS設定
        </Typography>
      </Grid>
      
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={settings.corsEnabled || false}
              onChange={(e) => handleChange('corsEnabled', e.target.checked)}
            />
          }
          label="CORSを有効にする"
        />
      </Grid>
      
      {settings.corsEnabled && (
        <>
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              許可するオリジン
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="https://example.com"
                value={newOrigin}
                onChange={(e) => setNewOrigin(e.target.value)}
              />
              <IconButton onClick={addOrigin} color="primary">
                <Add />
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {(settings.allowedOrigins || ['http://localhost:3000']).map((origin: string) => (
                <Chip
                  key={origin}
                  label={origin}
                  onDelete={() => removeOrigin(origin)}
                  size="small"
                />
              ))}
            </Box>
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              許可するメソッド
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'].map((method) => (
                <Chip
                  key={method}
                  label={method}
                  color={(settings.allowedMethods || ['GET', 'POST', 'PUT', 'DELETE']).includes(method) ? 'primary' : 'default'}
                  onClick={() => {
                    if ((settings.allowedMethods || []).includes(method)) {
                      removeMethod(method);
                    } else {
                      handleChange('allowedMethods', [...(settings.allowedMethods || []), method]);
                    }
                  }}
                />
              ))}
            </Box>
          </Grid>
        </>
      )}
      
      <Grid item xs={12}>
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" gutterBottom>
          Webhook設定
        </Typography>
      </Grid>
      
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Webhook URL"
          value={settings.webhookUrl || ''}
          onChange={(e) => handleChange('webhookUrl', e.target.value)}
          placeholder="https://example.com/webhook"
          helperText="イベント通知を送信するURL"
        />
      </Grid>
      
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Webhook シークレット"
          value={settings.webhookSecret || ''}
          onChange={(e) => handleChange('webhookSecret', e.target.value)}
          helperText="Webhook認証用のシークレットトークン"
        />
      </Grid>
      
      <Grid item xs={12}>
        <Typography variant="subtitle2" gutterBottom>
          通知するイベント
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {['user.created', 'user.updated', 'user.deleted', 'post.created', 'post.deleted', 'report.created'].map((event) => (
            <Chip
              key={event}
              label={event}
              color={(settings.webhookEvents || []).includes(event) ? 'primary' : 'default'}
              onClick={() => {
                if ((settings.webhookEvents || []).includes(event)) {
                  removeWebhookEvent(event);
                } else {
                  handleChange('webhookEvents', [...(settings.webhookEvents || []), event]);
                }
              }}
            />
          ))}
        </Box>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Webhook再試行回数"
          type="number"
          value={settings.webhookRetries || 3}
          onChange={(e) => handleChange('webhookRetries', parseInt(e.target.value))}
          InputProps={{
            endAdornment: <InputAdornment position="end">回</InputAdornment>,
            inputProps: { min: 0, max: 10 }
          }}
          helperText="失敗時の再試行回数"
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Webhookタイムアウト"
          type="number"
          value={settings.webhookTimeout || 10}
          onChange={(e) => handleChange('webhookTimeout', parseInt(e.target.value))}
          InputProps={{
            endAdornment: <InputAdornment position="end">秒</InputAdornment>,
            inputProps: { min: 1, max: 60 }
          }}
          helperText="応答待機時間"
        />
      </Grid>
    </Grid>
  );
}