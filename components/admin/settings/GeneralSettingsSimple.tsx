'use client';

import React from 'react';
import {
  Grid,
  TextField,
  Typography,
  Alert,
} from '@mui/material';

interface GeneralSettingsProps {
  settings: any;
  onChange: (settings: any) => void;
}

export default function GeneralSettings({ settings = {}, onChange }: GeneralSettingsProps) {
  const handleChange = (field: string, value: any) => {
    onChange({
      ...settings,
      [field]: value,
    });
  };

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <Alert severity="info">
          サイトの基本情報を設定します。
        </Alert>
      </Grid>
      
      <Grid size={12}>
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
          helperText="システムの名前"
        />
      </Grid>
      
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          label="管理者メールアドレス"
          type="email"
          value={settings.adminEmail || ''}
          onChange={(e) => handleChange('adminEmail', e.target.value)}
          helperText="システム管理者の連絡先"
        />
      </Grid>
    </Grid>
  );
}