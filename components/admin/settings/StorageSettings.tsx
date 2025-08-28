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
  Chip,
  Box,
} from '@mui/material';

interface StorageSettingsProps {
  settings: any;
  onChange: (settings: any) => void;
}

export default function StorageSettings({ settings = {}, onChange }: StorageSettingsProps) {
  const [newFileType, setNewFileType] = React.useState('');

  const handleChange = (field: string, value: any) => {
    onChange({
      ...settings,
      [field]: value,
    });
  };

  const addFileType = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newFileType) {
      const type = newFileType.toLowerCase().replace(/^\./, '');
      if (!settings.allowedFileTypes?.includes(type)) {
        handleChange('allowedFileTypes', [...(settings.allowedFileTypes || []), type]);
      }
      setNewFileType('');
    }
  };

  const removeFileType = (type: string) => {
    handleChange('allowedFileTypes', (settings.allowedFileTypes || []).filter((t: string) => t !== type));
  };

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <Typography variant="h6" gutterBottom>
          ファイルアップロード設定
        </Typography>
      </Grid>
      
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          label="最大ファイルサイズ"
          type="number"
          value={settings.maxFileSize || 10}
          onChange={(e) => handleChange('maxFileSize', parseInt(e.target.value))}
          InputProps={{
            endAdornment: <InputAdornment position="end">MB</InputAdornment>,
            inputProps: { min: 1, max: 100 }
          }}
          helperText="アップロード可能な最大サイズ（1-100MB）"
        />
      </Grid>
      
      <Grid size={{ xs: 12, md: 6 }}>
        <FormControl fullWidth>
          <InputLabel>ストレージタイプ</InputLabel>
          <Select
            value={settings.storageType || 'local'}
            label="ストレージタイプ"
            onChange={(e) => handleChange('storageType', e.target.value)}
          >
            <MenuItem value="local">ローカルストレージ</MenuItem>
            <MenuItem value="s3">Amazon S3</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      
      <Grid size={12}>
        <Typography variant="subtitle2" gutterBottom>
          許可するファイルタイプ
        </Typography>
        <TextField
          size="small"
          placeholder="拡張子を入力してEnterキー（例: pdf）"
          value={newFileType}
          onChange={(e) => setNewFileType(e.target.value)}
          onKeyPress={addFileType}
          fullWidth
          sx={{ mb: 2 }}
        />
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {(settings.allowedFileTypes || ['jpg', 'jpeg', 'png', 'gif', 'pdf']).map((type: string) => (
            <Chip
              key={type}
              label={`.${type}`}
              onDelete={() => removeFileType(type)}
              size="small"
            />
          ))}
        </Box>
      </Grid>
      
      <Grid size={12}>
        <FormControlLabel
          control={
            <Switch
              checked={settings.imageAutoResize || false}
              onChange={(e) => handleChange('imageAutoResize', e.target.checked)}
            />
          }
          label="画像の自動リサイズ"
        />
      </Grid>
      
      {settings.imageAutoResize && (
        <>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="最大幅"
              type="number"
              value={settings.imageMaxWidth || 1920}
              onChange={(e) => handleChange('imageMaxWidth', parseInt(e.target.value))}
              InputProps={{
                endAdornment: <InputAdornment position="end">px</InputAdornment>,
                inputProps: { min: 100, max: 4000 }
              }}
            />
          </Grid>
          
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="最大高さ"
              type="number"
              value={settings.imageMaxHeight || 1080}
              onChange={(e) => handleChange('imageMaxHeight', parseInt(e.target.value))}
              InputProps={{
                endAdornment: <InputAdornment position="end">px</InputAdornment>,
                inputProps: { min: 100, max: 4000 }
              }}
            />
          </Grid>
        </>
      )}
      
      <Grid size={12}>
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" gutterBottom>
          CDN設定
        </Typography>
      </Grid>
      
      <Grid size={12}>
        <FormControlLabel
          control={
            <Switch
              checked={settings.cdnEnabled || false}
              onChange={(e) => handleChange('cdnEnabled', e.target.checked)}
            />
          }
          label="CDNを有効にする"
        />
      </Grid>
      
      {settings.cdnEnabled && (
        <>
          <Grid size={{ xs: 12, md: 8 }}>
            <TextField
              fullWidth
              label="CDN URL"
              value={settings.cdnUrl || ''}
              onChange={(e) => handleChange('cdnUrl', e.target.value)}
              placeholder="https://cdn.example.com"
              helperText="CDNのベースURL"
            />
          </Grid>
          
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              label="キャッシュ期間"
              type="number"
              value={settings.cacheExpiry || 86400}
              onChange={(e) => handleChange('cacheExpiry', parseInt(e.target.value))}
              InputProps={{
                endAdornment: <InputAdornment position="end">秒</InputAdornment>,
                inputProps: { min: 60, max: 31536000 }
              }}
            />
          </Grid>
        </>
      )}
      
      <Grid size={12}>
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" gutterBottom>
          バックアップ設定
        </Typography>
      </Grid>
      
      <Grid size={12}>
        <FormControlLabel
          control={
            <Switch
              checked={settings.autoBackup || false}
              onChange={(e) => handleChange('autoBackup', e.target.checked)}
            />
          }
          label="自動バックアップを有効にする"
        />
      </Grid>
      
      {settings.autoBackup && (
        <>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="バックアップ間隔"
              type="number"
              value={settings.backupInterval || 24}
              onChange={(e) => handleChange('backupInterval', parseInt(e.target.value))}
              InputProps={{
                endAdornment: <InputAdornment position="end">時間</InputAdornment>,
                inputProps: { min: 1, max: 168 }
              }}
              helperText="自動バックアップの実行間隔（1-168時間）"
            />
          </Grid>
          
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="バックアップ保持期間"
              type="number"
              value={settings.backupRetention || 30}
              onChange={(e) => handleChange('backupRetention', parseInt(e.target.value))}
              InputProps={{
                endAdornment: <InputAdornment position="end">日</InputAdornment>,
                inputProps: { min: 1, max: 365 }
              }}
              helperText="古いバックアップの保持日数（1-365日）"
            />
          </Grid>
        </>
      )}
    </Grid>
  );
}