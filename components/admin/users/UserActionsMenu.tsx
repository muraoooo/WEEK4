'use client';

import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Stack,
} from '@mui/material';
import {
  MoreVert,
  Visibility,
  Edit,
  Warning,
  Block,
  Gavel,
  RestartAlt,
  Delete,
  Email,
  Lock,
  LockOpen,
  PersonOff,
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

interface UserActionsMenuProps {
  user: User;
  onAction: (action: string, data?: any) => void;
  onView: (userId: string) => void;
}

export default function UserActionsMenu({ user, onAction, onView }: UserActionsMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState('');
  const [reason, setReason] = useState('');
  const [suspendUntil, setSuspendUntil] = useState<Dayjs | null>(null);
  const [newRole, setNewRole] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleActionClick = (action: string) => {
    setCurrentAction(action);
    setReason('');
    setSuspendUntil(null);
    setNewRole(user.role);
    setError(null);
    setDialogOpen(true);
    handleMenuClose();
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

      await onAction(currentAction, actionData);
      handleDialogClose();
    } catch (err) {
      setError('アクションの実行に失敗しました');
    }
  };

  const getActionTitle = () => {
    switch (currentAction) {
      case 'WARNING': return '警告の送信';
      case 'SUSPEND': return 'アカウント停止';
      case 'BAN': return 'アカウントBAN';
      case 'REACTIVATE': return 'アカウント復活';
      case 'DELETE': return 'アカウント削除';
      case 'UPDATE_ROLE': return '権限変更';
      case 'RESET_PASSWORD': return 'パスワードリセット';
      case 'VERIFY_EMAIL': return 'メール認証';
      case 'TOGGLE_2FA': return '2FA設定変更';
      default: return 'アクション';
    }
  };

  const isActionDisabled = (action: string) => {
    switch (action) {
      case 'SUSPEND':
        return user.status === 'suspended' || user.status === 'banned' || user.status === 'deleted';
      case 'BAN':
        return user.status === 'banned' || user.status === 'deleted';
      case 'REACTIVATE':
        return user.status === 'active';
      case 'DELETE':
        return user.status === 'deleted';
      default:
        return false;
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <IconButton
        size="small"
        onClick={handleMenuOpen}
        aria-label="user actions"
      >
        <MoreVert />
      </IconButton>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={() => onView(user._id)}>
          <ListItemIcon>
            <Visibility fontSize="small" />
          </ListItemIcon>
          <ListItemText>詳細表示</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => handleActionClick('UPDATE_ROLE')}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>権限変更</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem 
          onClick={() => handleActionClick('WARNING')}
          disabled={isActionDisabled('WARNING')}
        >
          <ListItemIcon>
            <Warning fontSize="small" />
          </ListItemIcon>
          <ListItemText>警告送信</ListItemText>
        </MenuItem>

        <MenuItem 
          onClick={() => handleActionClick('SUSPEND')}
          disabled={isActionDisabled('SUSPEND')}
        >
          <ListItemIcon>
            <Block fontSize="small" />
          </ListItemIcon>
          <ListItemText>停止</ListItemText>
        </MenuItem>

        <MenuItem 
          onClick={() => handleActionClick('BAN')}
          disabled={isActionDisabled('BAN')}
        >
          <ListItemIcon>
            <Gavel fontSize="small" />
          </ListItemIcon>
          <ListItemText>BAN</ListItemText>
        </MenuItem>

        <MenuItem 
          onClick={() => handleActionClick('REACTIVATE')}
          disabled={isActionDisabled('REACTIVATE')}
        >
          <ListItemIcon>
            <RestartAlt fontSize="small" />
          </ListItemIcon>
          <ListItemText>復活</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem onClick={() => handleActionClick('RESET_PASSWORD')}>
          <ListItemIcon>
            <Lock fontSize="small" />
          </ListItemIcon>
          <ListItemText>パスワードリセット</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => handleActionClick('VERIFY_EMAIL')}>
          <ListItemIcon>
            <Email fontSize="small" />
          </ListItemIcon>
          <ListItemText>メール認証</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => handleActionClick('TOGGLE_2FA')}>
          <ListItemIcon>
            {user.twoFactorEnabled ? <LockOpen fontSize="small" /> : <Lock fontSize="small" />}
          </ListItemIcon>
          <ListItemText>
            2FA {user.twoFactorEnabled ? '無効化' : '有効化'}
          </ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem 
          onClick={() => handleActionClick('DELETE')}
          disabled={isActionDisabled('DELETE')}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>削除</ListItemText>
        </MenuItem>
      </Menu>

      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
        maxWidth="sm"
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
            
            <div>
              <strong>対象ユーザー:</strong> {user.email}
            </div>
            
            {currentAction === 'UPDATE_ROLE' && (
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
            
            {currentAction === 'SUSPEND' && (
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
              placeholder={
                currentAction === 'WARNING' ? '警告の理由を入力してください' :
                currentAction === 'SUSPEND' ? '停止の理由を入力してください' :
                currentAction === 'BAN' ? 'BAN の理由を入力してください' :
                '理由を入力してください'
              }
              required
            />
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
              currentAction === 'DELETE' || currentAction === 'BAN' ? 'error' : 'primary'
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