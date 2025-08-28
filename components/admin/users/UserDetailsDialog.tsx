'use client';

import React, { memo, useState, useCallback } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import Alert from '@mui/material/Alert';
import Close from '@mui/icons-material/Close';
import Email from '@mui/icons-material/Email';
import CalendarToday from '@mui/icons-material/CalendarToday';
import AccessTime from '@mui/icons-material/AccessTime';
import Warning from '@mui/icons-material/Warning';
import Block from '@mui/icons-material/Block';
import CheckCircle from '@mui/icons-material/CheckCircle';

interface User {
  _id: string;
  email: string;
  name?: string;
  status: 'active' | 'suspended' | 'pending';
  role: 'user' | 'admin';
  createdAt: string;
  lastLogin?: string;
  warningCount?: number;
}

interface UserDetailsDialogProps {
  user: User;
  open: boolean;
  onClose: () => void;
  onAction?: (userId: string, action: string) => void;
}

const UserDetailsDialog = memo<UserDetailsDialogProps>(({
  user,
  open,
  onClose,
  onAction
}) => {
  const [loading, setLoading] = useState(false);

  const handleAction = useCallback(async (action: string) => {
    setLoading(true);
    try {
      await onAction?.(user._id, action);
      onClose();
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setLoading(false);
    }
  }, [user._id, onAction, onClose]);

  const getStatusColor = useCallback(() => {
    switch (user.status) {
      case 'active': return 'success';
      case 'suspended': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  }, [user.status]);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="div">
            ユーザー詳細
          </Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          {/* ユーザー基本情報 */}
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar
                  sx={{ width: 64, height: 64, bgcolor: 'primary.main' }}
                >
                  {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h6">
                    {user.name || 'No Name'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user.email}
                  </Typography>
                  <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                    <Chip
                      label={user.status}
                      color={getStatusColor() as any}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={user.role}
                      color={user.role === 'admin' ? 'primary' : 'default'}
                      size="small"
                    />
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* 詳細情報 */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                詳細情報
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <Email fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="メールアドレス"
                    secondary={user.email}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CalendarToday fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="登録日時"
                    secondary={formatDate(user.createdAt)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <AccessTime fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="最終ログイン"
                    secondary={user.lastLogin ? formatDate(user.lastLogin) : '未ログイン'}
                  />
                </ListItem>
                {user.warningCount && user.warningCount > 0 && (
                  <ListItem>
                    <ListItemIcon>
                      <Warning fontSize="small" color="warning" />
                    </ListItemIcon>
                    <ListItemText
                      primary="警告回数"
                      secondary={`${user.warningCount}回`}
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>

          {/* 警告がある場合のアラート */}
          {user.warningCount && user.warningCount > 0 && (
            <Alert severity="warning" variant="outlined">
              このユーザーには{user.warningCount}回の警告履歴があります。
            </Alert>
          )}

          {/* ステータス別の注意事項 */}
          {user.status === 'suspended' && (
            <Alert severity="error" variant="outlined">
              このユーザーは現在停止状態です。
            </Alert>
          )}
          {user.status === 'pending' && (
            <Alert severity="info" variant="outlined">
              このユーザーはアカウント確認待ちです。
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} variant="outlined">
          閉じる
        </Button>
        
        {user.status === 'active' ? (
          <Button
            onClick={() => handleAction('suspend')}
            variant="contained"
            color="error"
            disabled={loading}
            startIcon={<Block />}
          >
            ユーザーを停止
          </Button>
        ) : user.status === 'suspended' ? (
          <Button
            onClick={() => handleAction('activate')}
            variant="contained"
            color="success"
            disabled={loading}
            startIcon={<CheckCircle />}
          >
            ユーザーを有効化
          </Button>
        ) : (
          <Button
            onClick={() => handleAction('approve')}
            variant="contained"
            color="primary"
            disabled={loading}
            startIcon={<CheckCircle />}
          >
            ユーザーを承認
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
});

UserDetailsDialog.displayName = 'UserDetailsDialog';

export default UserDetailsDialog;