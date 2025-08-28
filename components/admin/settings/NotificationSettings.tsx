'use client';

import React from 'react';
import {
  Grid,
  TextField,
  Switch,
  FormControlLabel,
  Typography,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Slider,
  Box,
  Chip,
  IconButton,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';

interface NotificationSettingsProps {
  settings: any;
  onChange: (settings: any) => void;
}

export default function NotificationSettings({ settings = {}, onChange }: NotificationSettingsProps) {
  const [newEmail, setNewEmail] = React.useState('');

  const handleChange = (field: string, value: any) => {
    onChange({
      ...settings,
      [field]: value,
    });
  };

  const addNotificationEmail = () => {
    if (newEmail && !settings.notificationEmails?.includes(newEmail)) {
      handleChange('notificationEmails', [...(settings.notificationEmails || []), newEmail]);
      setNewEmail('');
    }
  };

  const removeNotificationEmail = (email: string) => {
    handleChange('notificationEmails', (settings.notificationEmails || []).filter((e: string) => e !== email));
  };

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <Typography variant="h6" gutterBottom>
          メール通知設定
        </Typography>
      </Grid>
      
      <Grid size={12}>
        <FormControlLabel
          control={
            <Switch
              checked={settings.notifyNewUser || false}
              onChange={(e) => handleChange('notifyNewUser', e.target.checked)}
            />
          }
          label="新規ユーザー登録通知"
        />
        <Typography variant="body2" color="text.secondary">
          新しいユーザーが登録された際に管理者に通知します
        </Typography>
      </Grid>
      
      <Grid size={12}>
        <FormControlLabel
          control={
            <Switch
              checked={settings.notifyReport || false}
              onChange={(e) => handleChange('notifyReport', e.target.checked)}
            />
          }
          label="コンテンツ通報通知"
        />
        <Typography variant="body2" color="text.secondary">
          コンテンツが通報された際にモデレーターに通知します
        </Typography>
      </Grid>
      
      <Grid size={12}>
        <FormControlLabel
          control={
            <Switch
              checked={settings.notifyError || false}
              onChange={(e) => handleChange('notifyError', e.target.checked)}
            />
          }
          label="システムエラー通知"
        />
        <Typography variant="body2" color="text.secondary">
          重大なシステムエラーが発生した際に通知します
        </Typography>
      </Grid>
      
      <Grid size={12}>
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" gutterBottom>
          ログアラート設定
        </Typography>
      </Grid>
      
      <Grid size={{ xs: 12, md: 6 }}>
        <FormControl fullWidth>
          <InputLabel>エラーレベル設定</InputLabel>
          <Select
            value={settings.errorLogLevel || 'error'}
            label="エラーレベル設定"
            onChange={(e) => handleChange('errorLogLevel', e.target.value)}
          >
            <MenuItem value="error">Error（エラーのみ）</MenuItem>
            <MenuItem value="warning">Warning（警告以上）</MenuItem>
            <MenuItem value="info">Info（情報以上）</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          label="アラート頻度"
          type="number"
          value={settings.alertFrequency || 60}
          onChange={(e) => handleChange('alertFrequency', parseInt(e.target.value))}
          InputProps={{
            endAdornment: <InputAdornment position="end">分</InputAdornment>,
            inputProps: { min: 1, max: 1440 }
          }}
          helperText="同一エラーの通知間隔（1-1440分）"
        />
      </Grid>
      
      <Grid size={12}>
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" gutterBottom>
          通知先メールアドレス
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          アラートやシステム通知の送信先メールアドレスを設定します
        </Typography>
      </Grid>
      
      <Grid size={12}>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="メールアドレスを入力"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                addNotificationEmail();
              }
            }}
          />
          <IconButton onClick={addNotificationEmail} color="primary">
            <Add />
          </IconButton>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {(settings.notificationEmails || []).map((email: string) => (
            <Chip
              key={email}
              label={email}
              onDelete={() => removeNotificationEmail(email)}
              size="small"
            />
          ))}
          {(!settings.notificationEmails || settings.notificationEmails.length === 0) && (
            <Typography variant="body2" color="text.secondary">
              通知先メールアドレスが設定されていません
            </Typography>
          )}
        </Box>
      </Grid>
      
      <Grid size={12}>
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" gutterBottom>
          パフォーマンスアラート
        </Typography>
      </Grid>
      
      <Grid size={12}>
        <Typography variant="subtitle2" gutterBottom>
          CPU使用率アラート閾値: {settings.cpuAlertThreshold || 80}%
        </Typography>
        <Slider
          value={settings.cpuAlertThreshold || 80}
          onChange={(e, value) => handleChange('cpuAlertThreshold', value)}
          min={50}
          max={100}
          step={5}
          marks={[
            { value: 50, label: '50%' },
            { value: 75, label: '75%' },
            { value: 100, label: '100%' },
          ]}
          valueLabelDisplay="auto"
        />
      </Grid>
      
      <Grid size={12}>
        <Typography variant="subtitle2" gutterBottom>
          メモリ使用率アラート閾値: {settings.memoryAlertThreshold || 80}%
        </Typography>
        <Slider
          value={settings.memoryAlertThreshold || 80}
          onChange={(e, value) => handleChange('memoryAlertThreshold', value)}
          min={50}
          max={100}
          step={5}
          marks={[
            { value: 50, label: '50%' },
            { value: 75, label: '75%' },
            { value: 100, label: '100%' },
          ]}
          valueLabelDisplay="auto"
        />
      </Grid>
      
      <Grid size={12}>
        <Typography variant="subtitle2" gutterBottom>
          ディスク使用率アラート閾値: {settings.diskAlertThreshold || 90}%
        </Typography>
        <Slider
          value={settings.diskAlertThreshold || 90}
          onChange={(e, value) => handleChange('diskAlertThreshold', value)}
          min={50}
          max={100}
          step={5}
          marks={[
            { value: 50, label: '50%' },
            { value: 75, label: '75%' },
            { value: 100, label: '100%' },
          ]}
          valueLabelDisplay="auto"
        />
      </Grid>
    </Grid>
  );
}