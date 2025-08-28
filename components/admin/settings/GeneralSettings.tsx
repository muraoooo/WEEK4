'use client';

import React from 'react';
import Grid from '@mui/material/Grid';
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Typography,
  Divider,
  Chip,
  Box,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';

interface GeneralSettingsProps {
  settings: any;
  onChange: (settings: any) => void;
}

export default function GeneralSettings({ settings = {}, onChange }: GeneralSettingsProps) {
  const [newExcludedIP, setNewExcludedIP] = React.useState('');

  const handleChange = (field: string, value: any) => {
    onChange({
      ...settings,
      [field]: value,
    });
  };

  const addExcludedIP = () => {
    if (newExcludedIP && !settings.maintenanceExcludedIPs?.includes(newExcludedIP)) {
      handleChange('maintenanceExcludedIPs', [...(settings.maintenanceExcludedIPs || []), newExcludedIP]);
      setNewExcludedIP('');
    }
  };

  const removeExcludedIP = (ip: string) => {
    handleChange('maintenanceExcludedIPs', (settings.maintenanceExcludedIPs || []).filter((item: string) => item !== ip));
  };

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12 }}>
        <Typography variant="h6" gutterBottom>
          サイト情報
        </Typography>
      </Grid>
      
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          label="サイト名"
          value={settings.siteName || ''}
          onChange={(e) => handleChange('siteName', e.target.value)}
          helperText="システム全体で表示される名称"
        />
      </Grid>
      
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          label="管理者メールアドレス"
          type="email"
          value={settings.adminEmail || ''}
          onChange={(e) => handleChange('adminEmail', e.target.value)}
          helperText="システム管理者への連絡先"
        />
      </Grid>
      
      <Grid size={{ xs: 12 }}>
        <TextField
          fullWidth
          label="サイト説明"
          multiline
          rows={3}
          value={settings.siteDescription || ''}
          onChange={(e) => handleChange('siteDescription', e.target.value)}
          helperText="システムの概要説明"
        />
      </Grid>
      
      <Grid size={{ xs: 12, md: 6 }}>
        <FormControl fullWidth>
          <InputLabel>タイムゾーン</InputLabel>
          <Select
            value={settings.timezone || 'Asia/Tokyo'}
            label="タイムゾーン"
            onChange={(e) => handleChange('timezone', e.target.value)}
          >
            <MenuItem value="Asia/Tokyo">Asia/Tokyo (JST)</MenuItem>
            <MenuItem value="UTC">UTC</MenuItem>
            <MenuItem value="America/New_York">America/New_York (EST)</MenuItem>
            <MenuItem value="America/Los_Angeles">America/Los_Angeles (PST)</MenuItem>
            <MenuItem value="Europe/London">Europe/London (GMT)</MenuItem>
            <MenuItem value="Europe/Paris">Europe/Paris (CET)</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      
      <Grid size={{ xs: 12, md: 6 }}>
        <FormControl fullWidth>
          <InputLabel>デフォルト言語</InputLabel>
          <Select
            value={settings.defaultLanguage || 'ja'}
            label="デフォルト言語"
            onChange={(e) => handleChange('defaultLanguage', e.target.value)}
          >
            <MenuItem value="ja">日本語</MenuItem>
            <MenuItem value="en">English</MenuItem>
            <MenuItem value="zh">中文</MenuItem>
            <MenuItem value="ko">한국어</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      
      <Grid size={{ xs: 12 }}>
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" gutterBottom>
          メンテナンスモード
        </Typography>
      </Grid>
      
      <Grid size={{ xs: 12 }}>
        <FormControlLabel
          control={
            <Switch
              checked={settings.maintenanceMode || false}
              onChange={(e) => handleChange('maintenanceMode', e.target.checked)}
            />
          }
          label="メンテナンスモードを有効にする"
        />
        {settings.maintenanceMode && (
          <Typography variant="caption" color="warning.main" display="block" sx={{ mt: 1 }}>
            ⚠️ メンテナンスモードが有効な間、一般ユーザーはシステムにアクセスできません
          </Typography>
        )}
      </Grid>
      
      {settings.maintenanceMode && (
        <>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="メンテナンスメッセージ"
              multiline
              rows={3}
              value={settings.maintenanceMessage || ''}
              onChange={(e) => handleChange('maintenanceMessage', e.target.value)}
              helperText="メンテナンス中にユーザーに表示されるメッセージ"
            />
          </Grid>
          
          <Grid size={{ xs: 12 }}>
            <Typography variant="subtitle2" gutterBottom>
              除外IPアドレス（メンテナンス中でもアクセス可能）
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                size="small"
                placeholder="例: 192.168.1.1"
                value={newExcludedIP}
                onChange={(e) => setNewExcludedIP(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={addExcludedIP}>
                        <Add />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {(settings.maintenanceExcludedIPs || []).map((ip: string) => (
                <Chip
                  key={ip}
                  label={ip}
                  onDelete={() => removeExcludedIP(ip)}
                  size="small"
                />
              ))}
            </Box>
          </Grid>
        </>
      )}
    </Grid>
  );
}