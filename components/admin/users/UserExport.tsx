'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Typography,
  Stack,
  Alert,
  LinearProgress,
  Box,
} from '@mui/material';
import {
  FileDownload,
  TableChart,
  Description,
  DataObject,
} from '@mui/icons-material';

interface UserExportProps {
  open: boolean;
  onClose: () => void;
  selectedUserIds?: string[];
  totalCount: number;
  onExport: (config: ExportConfig) => Promise<void>;
}

interface ExportConfig {
  format: 'csv' | 'xlsx' | 'json' | 'pdf';
  fields: string[];
  includeAll: boolean;
  userIds?: string[];
}

const EXPORT_FIELDS = [
  { key: 'email', label: 'メールアドレス' },
  { key: 'name', label: '名前' },
  { key: 'role', label: '権限' },
  { key: 'status', label: 'ステータス' },
  { key: 'emailVerified', label: 'メール認証' },
  { key: 'twoFactorEnabled', label: '2FA設定' },
  { key: 'warningCount', label: '警告回数' },
  { key: 'lastLogin', label: '最終ログイン' },
  { key: 'createdAt', label: '登録日' },
  { key: 'updatedAt', label: '更新日' },
  { key: 'suspendedUntil', label: '停止期限' },
  { key: 'bannedAt', label: 'BAN日時' },
];

export default function UserExport({
  open,
  onClose,
  selectedUserIds,
  totalCount,
  onExport,
}: UserExportProps) {
  const [format, setFormat] = useState<'csv' | 'xlsx' | 'json' | 'pdf'>('csv');
  const [fields, setFields] = useState<string[]>([
    'email',
    'name',
    'role',
    'status',
    'lastLogin',
    'createdAt',
  ]);
  const [includeAll, setIncludeAll] = useState(!selectedUserIds || selectedUserIds.length === 0);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFieldToggle = (fieldKey: string) => {
    setFields(prev => 
      prev.includes(fieldKey)
        ? prev.filter(f => f !== fieldKey)
        : [...prev, fieldKey]
    );
  };

  const handleSelectAllFields = (checked: boolean) => {
    if (checked) {
      setFields(EXPORT_FIELDS.map(f => f.key));
    } else {
      setFields([]);
    }
  };

  const handleExport = async () => {
    if (fields.length === 0) {
      setError('少なくとも1つのフィールドを選択してください');
      return;
    }

    setExporting(true);
    setError(null);

    try {
      const config: ExportConfig = {
        format,
        fields,
        includeAll,
        userIds: includeAll ? undefined : selectedUserIds,
      };
      
      await onExport(config);
      onClose();
    } catch (err) {
      setError('エクスポートに失敗しました');
    } finally {
      setExporting(false);
    }
  };

  const getFormatIcon = (fmt: string) => {
    switch (fmt) {
      case 'csv': return <TableChart />;
      case 'xlsx': return <TableChart />;
      case 'json': return <DataObject />;
      case 'pdf': return <Description />;
      default: return <FileDownload />;
    }
  };

  const getExportCount = () => {
    if (includeAll) {
      return totalCount;
    }
    return selectedUserIds ? selectedUserIds.length : 0;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <FileDownload />
          <Typography>ユーザーデータのエクスポート</Typography>
        </Stack>
      </DialogTitle>
      
      <DialogContent>
        <Stack spacing={3}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Export Target */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              エクスポート対象
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                value={includeAll ? 'all' : 'selected'}
                onChange={(e) => setIncludeAll(e.target.value === 'all')}
              >
                <MenuItem value="all">
                  すべてのユーザー ({totalCount} 件)
                </MenuItem>
                <MenuItem 
                  value="selected" 
                  disabled={!selectedUserIds || selectedUserIds.length === 0}
                >
                  選択されたユーザー ({selectedUserIds ? selectedUserIds.length : 0} 件)
                </MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Export Format */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              ファイル形式
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                value={format}
                onChange={(e) => setFormat(e.target.value as any)}
                startAdornment={getFormatIcon(format)}
              >
                <MenuItem value="csv">CSV (.csv)</MenuItem>
                <MenuItem value="xlsx">Excel (.xlsx)</MenuItem>
                <MenuItem value="json">JSON (.json)</MenuItem>
                <MenuItem value="pdf">PDF (.pdf)</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Fields Selection */}
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle2">
                エクスポートフィールド
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={fields.length === EXPORT_FIELDS.length}
                    indeterminate={fields.length > 0 && fields.length < EXPORT_FIELDS.length}
                    onChange={(e) => handleSelectAllFields(e.target.checked)}
                  />
                }
                label="すべて選択"
              />
            </Stack>
            
            <FormGroup>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 1,
                  maxHeight: 200,
                  overflowY: 'auto',
                  p: 1,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                {EXPORT_FIELDS.map((field) => (
                  <FormControlLabel
                    key={field.key}
                    control={
                      <Checkbox
                        checked={fields.includes(field.key)}
                        onChange={() => handleFieldToggle(field.key)}
                        size="small"
                      />
                    }
                    label={field.label}
                  />
                ))}
              </Box>
            </FormGroup>
          </Box>

          {/* Export Summary */}
          <Alert severity="info">
            {getExportCount()} 件のユーザーデータを {format.toUpperCase()} 形式で {fields.length} 個のフィールドをエクスポートします。
          </Alert>

          {exporting && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                エクスポート中...
              </Typography>
              <LinearProgress />
            </Box>
          )}
        </Stack>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={exporting}>
          キャンセル
        </Button>
        <Button
          onClick={handleExport}
          variant="contained"
          disabled={exporting || fields.length === 0}
          startIcon={<FileDownload />}
        >
          エクスポート
        </Button>
      </DialogActions>
    </Dialog>
  );
}