'use client';

import React from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  Avatar,
  IconButton,
  Checkbox,
  Tooltip,
  Stack,
  Typography,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
} from '@mui/material';
import {
  Block,
  Security,
  Computer,
  Smartphone,
  Tablet,
  LocationOn,
  AccessTime,
  Warning,
  CheckCircle,
  ErrorOutline,
} from '@mui/icons-material';

interface Session {
  _id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  deviceInfo: {
    userAgent: string;
    ip: string;
    deviceType: string;
    browser?: string;
    os?: string;
  };
  createdAt: string;
  lastActivity: string;
  expiresAt: string;
  isActive: boolean;
  location?: string;
  country?: string;
  city?: string;
  isSuspicious?: boolean;
  loginCount?: number;
}

interface SimpleSessionsTableProps {
  sessions: Session[];
  loading: boolean;
  page: number;
  pageSize: number;
  totalCount: number;
  selectionModel: string[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSelectionChange: (selection: string[]) => void;
  onTerminateSession: (sessionId: string) => void;
  onTerminateAllUserSessions: (userId: string) => void;
}

export default function SimpleSessionsTable({
  sessions,
  loading,
  page,
  pageSize,
  totalCount,
  selectionModel,
  onPageChange,
  onPageSizeChange,
  onSelectionChange,
  onTerminateSession,
  onTerminateAllUserSessions,
}: SimpleSessionsTableProps) {
  const [terminateDialogOpen, setTerminateDialogOpen] = React.useState(false);
  const [selectedSession, setSelectedSession] = React.useState<Session | null>(null);
  const [terminateAllDialogOpen, setTerminateAllDialogOpen] = React.useState(false);

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      onSelectionChange(sessions.map(session => session._id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectOne = (sessionId: string) => {
    const selectedIndex = selectionModel.indexOf(sessionId);
    let newSelected: string[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selectionModel, sessionId);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selectionModel.slice(1));
    } else if (selectedIndex === selectionModel.length - 1) {
      newSelected = newSelected.concat(selectionModel.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selectionModel.slice(0, selectedIndex),
        selectionModel.slice(selectedIndex + 1),
      );
    }

    onSelectionChange(newSelected);
  };

  const getStatusColor = (session: Session) => {
    const now = new Date();
    const expiresAt = new Date(session.expiresAt);
    const lastActivity = new Date(session.lastActivity);
    const inactiveTime = (now.getTime() - lastActivity.getTime()) / 1000 / 60; // minutes

    if (!session.isActive) return 'default';
    if (expiresAt < now) return 'error';
    if (session.isSuspicious) return 'warning';
    if (inactiveTime > 30) return 'warning';
    return 'success';
  };

  const getStatusLabel = (session: Session) => {
    const now = new Date();
    const expiresAt = new Date(session.expiresAt);

    if (!session.isActive) return '終了済み';
    if (expiresAt < now) return '期限切れ';
    if (session.isSuspicious) return '疑わしい';
    return 'アクティブ';
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile':
        return <Smartphone fontSize="small" />;
      case 'tablet':
        return <Tablet fontSize="small" />;
      case 'desktop':
      default:
        return <Computer fontSize="small" />;
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days > 0) return `${days}日前`;
    if (hours > 0) return `${hours}時間前`;
    if (minutes > 0) return `${minutes}分前`;
    return '今';
  };

  const handleTerminateClick = (session: Session) => {
    setSelectedSession(session);
    setTerminateDialogOpen(true);
  };

  const handleTerminateAllClick = (session: Session) => {
    setSelectedSession(session);
    setTerminateAllDialogOpen(true);
  };

  const handleTerminateConfirm = () => {
    if (selectedSession) {
      onTerminateSession(selectedSession._id);
    }
    setTerminateDialogOpen(false);
    setSelectedSession(null);
  };

  const handleTerminateAllConfirm = () => {
    if (selectedSession) {
      onTerminateAllUserSessions(selectedSession.userId);
    }
    setTerminateAllDialogOpen(false);
    setSelectedSession(null);
  };

  const getUserSessionCount = (userId: string) => {
    return sessions.filter(s => s.userId === userId && s.isActive).length;
  };

  return (
    <Box sx={{ width: '100%' }}>
      {loading && <LinearProgress />}
      
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectionModel.length > 0 && selectionModel.length < sessions.length}
                  checked={sessions.length > 0 && selectionModel.length === sessions.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>ユーザー</TableCell>
              <TableCell>デバイス</TableCell>
              <TableCell>IPアドレス</TableCell>
              <TableCell>場所</TableCell>
              <TableCell>開始時刻</TableCell>
              <TableCell>最終活動</TableCell>
              <TableCell>ステータス</TableCell>
              <TableCell align="center">アクション</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sessions.map((session) => {
              const isSelected = selectionModel.indexOf(session._id) !== -1;
              const userSessionCount = getUserSessionCount(session.userId);
              
              return (
                <TableRow
                  key={session._id}
                  hover
                  selected={isSelected}
                  sx={{
                    backgroundColor: session.isSuspicious ? 'warning.light' : undefined,
                  }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isSelected}
                      onChange={() => handleSelectOne(session._id)}
                    />
                  </TableCell>
                  
                  <TableCell>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar 
                        sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}
                      >
                        {session.userName?.charAt(0).toUpperCase() || session.userEmail?.charAt(0).toUpperCase() || '?'}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {session.userName || 'Unknown User'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {session.userEmail}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          ID: {session.userId.slice(-8)}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {getDeviceIcon(session.deviceInfo?.deviceType)}
                      <Box>
                        <Typography variant="body2">
                          {session.deviceInfo?.deviceType || 'Unknown'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {session.deviceInfo?.browser} / {session.deviceInfo?.os}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {session.deviceInfo?.ip || 'N/A'}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <LocationOn fontSize="small" color="action" />
                      <Typography variant="body2">
                        {session.city && session.country 
                          ? `${session.city}, ${session.country}`
                          : session.location || '不明'}
                      </Typography>
                    </Stack>
                  </TableCell>
                  
                  <TableCell>
                    <Tooltip title={formatDate(session.createdAt)}>
                      <Typography variant="body2">
                        {getTimeAgo(session.createdAt)}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  
                  <TableCell>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <AccessTime fontSize="small" color="action" />
                      <Tooltip title={formatDate(session.lastActivity)}>
                        <Typography variant="body2">
                          {getTimeAgo(session.lastActivity)}
                        </Typography>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                  
                  <TableCell>
                    <Chip
                      label={getStatusLabel(session)}
                      size="small"
                      color={getStatusColor(session) as any}
                      icon={
                        session.isSuspicious ? <Warning /> :
                        !session.isActive ? <ErrorOutline /> :
                        <CheckCircle />
                      }
                    />
                  </TableCell>
                  
                  <TableCell align="center">
                    <Stack direction="row" spacing={0} justifyContent="center">
                      {session.isActive && (
                        <Tooltip title="セッションを終了">
                          <IconButton
                            size="small"
                            onClick={() => handleTerminateClick(session)}
                            color="warning"
                          >
                            <Block fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      
                      {userSessionCount > 1 && (
                        <Tooltip title={`このユーザーの全セッション終了 (${userSessionCount}件)`}>
                          <IconButton
                            size="small"
                            onClick={() => handleTerminateAllClick(session)}
                            color="error"
                          >
                            <Security fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
            
            {sessions.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography variant="body2" color="text.secondary">
                    セッションが見つかりませんでした
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      <TablePagination
        component="div"
        count={totalCount}
        page={page}
        onPageChange={(e, newPage) => onPageChange(newPage)}
        rowsPerPage={pageSize}
        onRowsPerPageChange={(e) => {
          onPageSizeChange(parseInt(e.target.value, 10));
          onPageChange(0);
        }}
        rowsPerPageOptions={[25, 50, 100, 200]}
        labelRowsPerPage="表示件数:"
      />

      {/* Terminate Session Dialog */}
      <Dialog
        open={terminateDialogOpen}
        onClose={() => setTerminateDialogOpen(false)}
      >
        <DialogTitle>セッションの終了</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            このセッションを終了します。ユーザーは再度ログインする必要があります。
          </Alert>
          {selectedSession && (
            <Box>
              <Typography variant="body2">
                <strong>ユーザー名:</strong> {selectedSession.userName || 'Unknown'}
              </Typography>
              <Typography variant="body2">
                <strong>メール:</strong> {selectedSession.userEmail}
              </Typography>
              <Typography variant="body2">
                <strong>デバイス:</strong> {selectedSession.deviceInfo?.deviceType}
              </Typography>
              <Typography variant="body2">
                <strong>IP:</strong> {selectedSession.deviceInfo?.ip}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTerminateDialogOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={handleTerminateConfirm} color="error" variant="contained">
            終了
          </Button>
        </DialogActions>
      </Dialog>

      {/* Terminate All Sessions Dialog */}
      <Dialog
        open={terminateAllDialogOpen}
        onClose={() => setTerminateAllDialogOpen(false)}
      >
        <DialogTitle>全セッションの終了</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            このユーザーのすべてのアクティブなセッションを終了します。
          </Alert>
          {selectedSession && (
            <Box>
              <Typography variant="body2">
                <strong>ユーザー名:</strong> {selectedSession.userName || 'Unknown'}
              </Typography>
              <Typography variant="body2">
                <strong>メール:</strong> {selectedSession.userEmail}
              </Typography>
              <Typography variant="body2">
                <strong>アクティブセッション数:</strong> {getUserSessionCount(selectedSession.userId)} 件
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTerminateAllDialogOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={handleTerminateAllConfirm} color="error" variant="contained">
            全終了
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}