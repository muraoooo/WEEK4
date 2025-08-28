'use client';

import React from 'react';
import {
  Grid,
  TextField,
  Switch,
  FormControlLabel,
  Typography,
  Divider,
  Box,
  Chip,
  InputAdornment,
  IconButton,
  Card,
  CardContent,
  FormGroup,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';

interface SecuritySettingsProps {
  settings: any;
  onChange: (settings: any) => void;
}

export default function SecuritySettings({ settings = {}, onChange }: SecuritySettingsProps) {
  const [newWhitelistIP, setNewWhitelistIP] = React.useState('');
  const [newBlacklistIP, setNewBlacklistIP] = React.useState('');

  const handleChange = (field: string, value: any) => {
    onChange({
      ...settings,
      [field]: value,
    });
  };

  const addToWhitelist = () => {
    if (newWhitelistIP && !settings.ipWhitelist?.includes(newWhitelistIP)) {
      handleChange('ipWhitelist', [...(settings.ipWhitelist || []), newWhitelistIP]);
      setNewWhitelistIP('');
    }
  };

  const removeFromWhitelist = (ip: string) => {
    handleChange('ipWhitelist', (settings.ipWhitelist || []).filter((item: string) => item !== ip));
  };

  const addToBlacklist = () => {
    if (newBlacklistIP && !settings.ipBlacklist?.includes(newBlacklistIP)) {
      handleChange('ipBlacklist', [...(settings.ipBlacklist || []), newBlacklistIP]);
      setNewBlacklistIP('');
    }
  };

  const removeFromBlacklist = (ip: string) => {
    handleChange('ipBlacklist', (settings.ipBlacklist || []).filter((item: string) => item !== ip));
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          セッション管理
        </Typography>
      </Grid>
      
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label="セッションタイムアウト"
          type="number"
          value={settings.sessionTimeout || 30}
          onChange={(e) => handleChange('sessionTimeout', parseInt(e.target.value))}
          InputProps={{
            endAdornment: <InputAdornment position="end">分</InputAdornment>,
            inputProps: { min: 1, max: 1440 }
          }}
          helperText="自動ログアウトまでの時間（1-1440分）"
        />
      </Grid>
      
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label="最大ログイン試行回数"
          type="number"
          value={settings.maxLoginAttempts || 5}
          onChange={(e) => handleChange('maxLoginAttempts', parseInt(e.target.value))}
          InputProps={{
            inputProps: { min: 1, max: 10 }
          }}
          helperText="ロックアウトまでの失敗回数（1-10回）"
        />
      </Grid>
      
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label="ロックアウト時間"
          type="number"
          value={settings.lockoutDuration || 30}
          onChange={(e) => handleChange('lockoutDuration', parseInt(e.target.value))}
          InputProps={{
            endAdornment: <InputAdornment position="end">分</InputAdornment>,
            inputProps: { min: 1, max: 1440 }
          }}
          helperText="アカウントロック継続時間（1-1440分）"
        />
      </Grid>
      
      <Grid item xs={12}>
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" gutterBottom>
          パスワードポリシー
        </Typography>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="最小文字数"
          type="number"
          value={settings.passwordMinLength || 8}
          onChange={(e) => handleChange('passwordMinLength', parseInt(e.target.value))}
          InputProps={{
            endAdornment: <InputAdornment position="end">文字</InputAdornment>,
            inputProps: { min: 8, max: 32 }
          }}
          helperText="パスワードの最小長（8-32文字）"
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="パスワード履歴"
          type="number"
          value={settings.passwordHistoryCount || 3}
          onChange={(e) => handleChange('passwordHistoryCount', parseInt(e.target.value))}
          InputProps={{
            endAdornment: <InputAdornment position="end">世代</InputAdornment>,
            inputProps: { min: 0, max: 10 }
          }}
          helperText="再利用を防ぐ過去のパスワード数（0-10）"
        />
      </Grid>
      
      <Grid item xs={12}>
        <Typography variant="subtitle2" gutterBottom>
          複雑性要件
        </Typography>
        <FormGroup row>
          <FormControlLabel
            control={
              <Switch
                checked={settings.passwordRequireUppercase || false}
                onChange={(e) => handleChange('passwordRequireUppercase', e.target.checked)}
              />
            }
            label="大文字を含む"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.passwordRequireLowercase || false}
                onChange={(e) => handleChange('passwordRequireLowercase', e.target.checked)}
              />
            }
            label="小文字を含む"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.passwordRequireNumbers || false}
                onChange={(e) => handleChange('passwordRequireNumbers', e.target.checked)}
              />
            }
            label="数字を含む"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.passwordRequireSpecialChars || false}
                onChange={(e) => handleChange('passwordRequireSpecialChars', e.target.checked)}
              />
            }
            label="特殊文字を含む"
          />
        </FormGroup>
      </Grid>
      
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="パスワード有効期限"
          type="number"
          value={settings.passwordExpiryDays || 0}
          onChange={(e) => handleChange('passwordExpiryDays', parseInt(e.target.value))}
          InputProps={{
            endAdornment: <InputAdornment position="end">日</InputAdornment>,
            inputProps: { min: 0, max: 365 }
          }}
          helperText="パスワード変更までの日数（0=無期限）"
        />
      </Grid>
      
      <Grid item xs={12}>
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" gutterBottom>
          セキュリティ機能
        </Typography>
      </Grid>
      
      <Grid item xs={12}>
        <FormGroup row>
          <FormControlLabel
            control={
              <Switch
                checked={settings.forceHttps || false}
                onChange={(e) => handleChange('forceHttps', e.target.checked)}
              />
            }
            label="HTTPSの強制"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.force2FA || false}
                onChange={(e) => handleChange('force2FA', e.target.checked)}
              />
            }
            label="2段階認証の強制"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.csrfProtection || false}
                onChange={(e) => handleChange('csrfProtection', e.target.checked)}
              />
            }
            label="CSRF保護"
          />
        </FormGroup>
      </Grid>
      
      <Grid item xs={12}>
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" gutterBottom>
          IPアクセス制限
        </Typography>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              ホワイトリスト（許可）
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="IPアドレス（例: 192.168.1.0/24）"
                value={newWhitelistIP}
                onChange={(e) => setNewWhitelistIP(e.target.value)}
              />
              <IconButton onClick={addToWhitelist} color="primary">
                <Add />
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {(settings.ipWhitelist || []).map((ip: string) => (
                <Chip
                  key={ip}
                  label={ip}
                  onDelete={() => removeFromWhitelist(ip)}
                  size="small"
                  color="success"
                />
              ))}
              {(!settings.ipWhitelist || settings.ipWhitelist.length === 0) && (
                <Typography variant="body2" color="text.secondary">
                  リストが空です（すべてのIPを許可）
                </Typography>
              )}
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              ブラックリスト（拒否）
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="IPアドレス（例: 192.168.1.100）"
                value={newBlacklistIP}
                onChange={(e) => setNewBlacklistIP(e.target.value)}
              />
              <IconButton onClick={addToBlacklist} color="primary">
                <Add />
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {(settings.ipBlacklist || []).map((ip: string) => (
                <Chip
                  key={ip}
                  label={ip}
                  onDelete={() => removeFromBlacklist(ip)}
                  size="small"
                  color="error"
                />
              ))}
              {(!settings.ipBlacklist || settings.ipBlacklist.length === 0) && (
                <Typography variant="body2" color="text.secondary">
                  リストが空です
                </Typography>
              )}
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}