'use client';

import React, { useState } from 'react';
import {
  Paper,
  Stack,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  Box,
} from '@mui/material';
import {
  Warning,
  Block,
  Gavel,
  RestartAlt,
  Delete,
  Email,
  FileDownload,
  PersonOff,
  Edit,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';

interface User {
  _id: string;
  email: string;
  name: string;
  role: 'admin' | 'moderator' | 'user';
  status: 'active' | 'suspended' | 'banned' | 'deleted';
  createdAt: string;
  updatedAt: string;
  lastLogin: string | null;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  warningCount: number;
  suspendedUntil: string | null;
  bannedAt: string | null;
}

interface BulkActionsBarProps {
  selectedUsers: User[];
  onBulkAction: (action: string, data?: any) => void;
  onExport: (format: string) => void;
  onClearSelection: () => void;
}

export default function BulkActionsBar({
  selectedUsers,
  onBulkAction,
  onExport,
  onClearSelection,
}: BulkActionsBarProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState('');
  const [reason, setReason] = useState('');
  const [suspendUntil, setSuspendUntil] = useState<Dayjs | null>(null);
  const [newRole, setNewRole] = useState('');
  const [exportFormat, setExportFormat] = useState('csv');
  const [error, setError] = useState<string | null>(null);

  const handleActionClick = (action: string) => {
    setCurrentAction(action);
    setReason('');
    setSuspendUntil(null);
    setNewRole('user');
    setError(null);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setCurrentAction('');
    setReason('');
    setSuspendUntil(null);
    setNewRole('');
    setError(null);
  };

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError('理由を入力してください');
      return;
    }

    try {
      const actionData = {
        reason: reason.trim(),
        ...(suspendUntil && { until: suspendUntil.toISOString() }),
        ...(newRole && { newRole }),
      };

      await onBulkAction(currentAction, actionData);
      handleDialogClose();
      onClearSelection();
    } catch (err) {
      setError('一括操作の実行に失敗しました');
    }
  };

  const handleExport = () => {
    onExport(exportFormat);
  };

  const getActionTitle = () => {
    switch (currentAction) {
      case 'BULK_WARNING': return '一括警告送信';
      case 'BULK_SUSPEND': return '一括アカウント停止';
      case 'BULK_BAN': return '一括アカウントBAN';
      case 'BULK_REACTIVATE': return '一括アカウント復活';
      case 'BULK_DELETE': return '一括アカウント削除';
      case 'BULK_UPDATE_ROLE': return '一括権限変更';
      case 'BULK_VERIFY_EMAIL': return '一括メール認証';
      default: return '一括操作';
    }
  };

  const canExecuteAction = (action: string) => {
    return selectedUsers.some(user => {
      switch (action) {
        case 'BULK_SUSPEND':
          return user.status === 'active';
        case 'BULK_BAN':
          return user.status !== 'banned' && user.status !== 'deleted';
        case 'BULK_REACTIVATE':
          return user.status === 'suspended' || user.status === 'banned';
        case 'BULK_DELETE':
          return user.status !== 'deleted';
        default:
          return true;
      }
    });
  };

  const getStatusSummary = () => {
    const statusCount = selectedUsers.reduce((acc, user) => {
      acc[user.status] = (acc[user.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCount).map(([status, count]) => (
      <Chip
        key={status}
        label={`${status}: ${count}`}
        size="small"
        color={
          status === 'active' ? 'success' :
          status === 'suspended' ? 'warning' :
          status === 'banned' ? 'error' : 'default'
        }
      />
    ));
  };

  if (selectedUsers.length === 0) {
    return null;
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Paper sx={{ p: 2, mb: 2, bgcolor: 'primary.50' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="body1" fontWeight="medium">
              {selectedUsers.length} 件選択中
            </Typography>
            <Stack direction="row" spacing={1}>
              {getStatusSummary()}
            </Stack>
          </Stack>
          
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              startIcon={<Warning />}
              onClick={() => handleActionClick('BULK_WARNING')}
              disabled={selectedUsers.length === 0}
            >
              警告
            </Button>
            
            <Button
              size="small"
              startIcon={<Block />}
              onClick={() => handleActionClick('BULK_SUSPEND')}
              disabled={!canExecuteAction('BULK_SUSPEND')}
            >
              停止
            </Button>
            
            <Button
              size="small"
              startIcon={<Gavel />}
              onClick={() => handleActionClick('BULK_BAN')}
              disabled={!canExecuteAction('BULK_BAN')}
            >
              BAN
            </Button>
            
            <Button
              size="small"
              startIcon={<RestartAlt />}
              onClick={() => handleActionClick('BULK_REACTIVATE')}
              disabled={!canExecuteAction('BULK_REACTIVATE')}
            >
              復活
            </Button>
            
            <Button
              size="small"
              startIcon={<Edit />}
              onClick={() => handleActionClick('BULK_UPDATE_ROLE')}
              disabled={selectedUsers.length === 0}
            >
              権限変更
            </Button>
            
            <Button
              size="small"
              startIcon={<Email />}
              onClick={() => handleActionClick('BULK_VERIFY_EMAIL')}
              disabled={selectedUsers.length === 0}
            >
              メール認証
            </Button>
            
            <Button
              size="small"
              startIcon={<FileDownload />}
              onClick={handleExport}
              variant="outlined"
            >
              エクスポート
            </Button>
            
            <Button
              size="small"
              color="error"
              startIcon={<Delete />}
              onClick={() => handleActionClick('BULK_DELETE')}
              disabled={!canExecuteAction('BULK_DELETE')}
            >
              削除
            </Button>
            
            <Button
              size="small"
              onClick={onClearSelection}
            >
              選択解除
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{getActionTitle()}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            
            <Box>
              <Typography variant="body1" gutterBottom>
                <strong>対象ユーザー数:</strong> {selectedUsers.length} 件
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {getStatusSummary()}
              </Stack>
            </Box>
            
            {currentAction === 'BULK_UPDATE_ROLE' && (
              <FormControl fullWidth>
                <InputLabel>新しい権限</InputLabel>
                <Select
                  value={newRole}
                  label="新しい権限"
                  onChange={(e) => setNewRole(e.target.value)}
                >
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="moderator">Moderator</MenuItem>
                  <MenuItem value="user">User</MenuItem>
                </Select>
              </FormControl>
            )}
            
            {currentAction === 'BULK_SUSPEND' && (
              <DatePicker
                label="停止期限"
                value={suspendUntil}
                onChange={(date) => setSuspendUntil(date)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    helperText: '未設定の場合は7日間',
                  },
                }}
              />
            )}
            
            <TextField
              label="理由"
              multiline
              rows={3}
              fullWidth
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="一括操作の理由を入力してください"
              required
            />
            
            <Alert severity="warning">
              この操作は選択された {selectedUsers.length} 件のユーザーすべてに適用されます。
              この操作は取り消すことができません。慎重に実行してください。
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>
            キャンセル
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            color={
              currentAction === 'BULK_DELETE' || currentAction === 'BULK_BAN' 
                ? 'error' 
                : 'primary'
            }
            disabled={!reason.trim()}
          >
            実行
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}