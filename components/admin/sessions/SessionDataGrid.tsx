'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Avatar,
  Chip,
  Typography,
  Stack,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridRowSelectionModel,
  GridToolbar,
  GridActionsCellItem,
} from '@mui/x-data-grid';
import {
  Person,
  DeviceHub,
  LocationOn,
  AccessTime,
  Security,
  Block,
  Warning,
  ErrorOutline,
  CheckCircle,
  Computer,
  Smartphone,
  Tablet,
} from '@mui/icons-material';

interface Session {
  _id: string;
  userId: string;
  userEmail: string;
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

interface SessionDataGridProps {
  sessions: Session[];
  loading: boolean;
  page: number;
  pageSize: number;
  totalCount: number;
  sortModel: any[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSortChange: (model: any[]) => void;
  onSelectionChange: (selection: GridRowSelectionModel) => void;
  selectionModel: GridRowSelectionModel;
  onTerminateSession: (sessionId: string) => void;
  onTerminateAllUserSessions: (userId: string) => void;
}

export default function SessionDataGrid({
  sessions,
  loading,
  page,
  pageSize,
  totalCount,
  sortModel,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onSelectionChange,
  selectionModel,
  onTerminateSession,
  onTerminateAllUserSessions,
}: SessionDataGridProps) {
  const [terminateDialogOpen, setTerminateDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [terminateAllDialogOpen, setTerminateAllDialogOpen] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
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

  const getStatusColor = (session: Session) => {
    const now = new Date();
    const expiresAt = new Date(session.expiresAt);
    const lastActivity = new Date(session.lastActivity);
    const inactiveTime = (now.getTime() - lastActivity.getTime()) / 1000 / 60; // 分

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

  const handleTerminateClick = (session: Session) => {
    setSelectedSession(session);
    setTerminateDialogOpen(true);
  };

  const handleTerminateAllClick = (userId: string) => {
    const userSessions = sessions.filter(s => s.userId === userId);
    if (userSessions.length > 0) {
      setSelectedSession(userSessions[0]);
      setTerminateAllDialogOpen(true);
    }
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

  const columns: GridColDef[] = [
    {
      field: 'user',
      headerName: 'ユーザー',
      width: 280,
      renderCell: (params: GridRenderCellParams) => (
        <Stack direction="row" spacing={2} alignItems="center" sx={{ py: 1 }}>
          <Avatar
            sx={{
              width: 32,
              height: 32,
              bgcolor: 'primary.main',
              fontSize: '14px',
            }}
          >
            {params.row.userEmail ? params.row.userEmail.charAt(0).toUpperCase() : '?'}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {params.row.userEmail}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ID: {params.row.userId.slice(-8)}
            </Typography>
          </Box>
        </Stack>
      ),
      sortable: false,
    },
    {
      field: 'device',
      headerName: 'デバイス',
      width: 200,
      renderCell: (params: GridRenderCellParams) => (
        <Stack direction="row" spacing={1} alignItems="center">
          {getDeviceIcon(params.row.deviceInfo?.deviceType)}
          <Box>
            <Typography variant="body2">
              {params.row.deviceInfo?.deviceType || 'Unknown'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {params.row.deviceInfo?.browser} / {params.row.deviceInfo?.os}
            </Typography>
          </Box>
        </Stack>
      ),
      sortable: false,
    },
    {
      field: 'ip',
      headerName: 'IPアドレス',
      width: 140,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" fontFamily="monospace">
          {params.row.deviceInfo?.ip || 'N/A'}
        </Typography>
      ),
    },
    {
      field: 'location',
      headerName: '場所',
      width: 160,
      renderCell: (params: GridRenderCellParams) => (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <LocationOn fontSize="small" color="action" />
          <Typography variant="body2">
            {params.row.city && params.row.country 
              ? `${params.row.city}, ${params.row.country}`
              : params.row.location || '不明'}
          </Typography>
        </Stack>
      ),
      sortable: false,
    },
    {
      field: 'createdAt',
      headerName: '開始時刻',
      width: 140,
      renderCell: (params: GridRenderCellParams) => (
        <Tooltip title={formatDate(params.value)}>
          <Typography variant="body2">
            {getTimeAgo(params.value)}
          </Typography>
        </Tooltip>
      ),
      type: 'dateTime',
      valueGetter: (params) => new Date(params.value),
    },
    {
      field: 'lastActivity',
      headerName: '最終活動',
      width: 140,
      renderCell: (params: GridRenderCellParams) => (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <AccessTime fontSize="small" color="action" />
          <Tooltip title={formatDate(params.value)}>
            <Typography variant="body2">
              {getTimeAgo(params.value)}
            </Typography>
          </Tooltip>
        </Stack>
      ),
      type: 'dateTime',
      valueGetter: (params) => new Date(params.value),
    },
    {
      field: 'status',
      headerName: 'ステータス',
      width: 120,
      renderCell: (params: GridRenderCellParams) => {
        const session = params.row as Session;
        const color = getStatusColor(session);
        const label = getStatusLabel(session);
        
        return (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Chip
              label={label}
              size="small"
              color={color as any}
              icon={
                session.isSuspicious ? <Warning /> :
                !session.isActive ? <ErrorOutline /> :
                <CheckCircle />
              }
            />
          </Stack>
        );
      },
      sortable: false,
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'アクション',
      width: 100,
      getActions: (params) => {
        const session = params.row as Session;
        const actions = [];
        
        if (session.isActive) {
          actions.push(
            <GridActionsCellItem
              key="terminate"
              icon={
                <Tooltip title="セッションを終了">
                  <Block />
                </Tooltip>
              }
              label="終了"
              onClick={() => handleTerminateClick(session)}
            />
          );
        }
        
        // Show terminate all sessions for this user
        const userSessionCount = sessions.filter(s => 
          s.userId === session.userId && s.isActive
        ).length;
        
        if (userSessionCount > 1) {
          actions.push(
            <GridActionsCellItem
              key="terminateAll"
              icon={
                <Tooltip title={`このユーザーの全セッション終了 (${userSessionCount}件)`}>
                  <Security />
                </Tooltip>
              }
              label="全終了"
              onClick={() => handleTerminateAllClick(session.userId)}
            />
          );
        }
        
        return actions;
      },
    },
  ];

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Box sx={{ 
        height: '100%', 
        width: '100%', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: 400
      }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      <DataGrid
        rows={sessions}
        columns={columns}
        getRowId={(row) => row._id}
        loading={loading}
        
        // Pagination
        paginationModel={{ page, pageSize }}
        onPaginationModelChange={(model) => {
          onPageChange(model.page);
          onPageSizeChange(model.pageSize);
        }}
        pageSizeOptions={[25, 50, 100, 200]}
        rowCount={totalCount}
        paginationMode="server"
        
        // Sorting
        sortModel={sortModel}
        onSortModelChange={onSortChange}
        sortingMode="server"
        
        // Selection
        checkboxSelection
        rowSelectionModel={selectionModel}
        onRowSelectionModelChange={onSelectionChange}
        disableRowSelectionOnClick
        
        // Toolbar
        slots={{ toolbar: GridToolbar }}
        slotProps={{
          toolbar: {
            showQuickFilter: true,
            quickFilterProps: { debounceMs: 500 },
          },
        }}
        
        // Styling
        sx={{
          '& .MuiDataGrid-row': {
            '&.suspicious': {
              backgroundColor: 'warning.light',
              '&:hover': {
                backgroundColor: 'warning.main',
              },
            },
          },
        }}
        getRowClassName={(params) => {
          if (params.row.isSuspicious) return 'suspicious';
          return '';
        }}
        
        // Performance
        rowHeight={72}
        headerHeight={56}
        
        // Localization
        localeText={{
          // 必要に応じて日本語化
          noRowsLabel: 'セッションがありません',
          noResultsOverlayLabel: '結果が見つかりません',
          checkboxSelectionHeaderName: 'チェックボックス',
        }}
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
                <strong>ユーザー:</strong> {selectedSession.userEmail}
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
                <strong>ユーザー:</strong> {selectedSession.userEmail}
              </Typography>
              <Typography variant="body2">
                <strong>アクティブセッション数:</strong> {
                  sessions.filter(s => 
                    s.userId === selectedSession.userId && s.isActive
                  ).length
                } 件
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