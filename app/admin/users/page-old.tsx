'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Alert,
  Stack,
  InputAdornment,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import type {
  GridColDef,
  GridRenderCellParams,
  GridRowSelectionModel,
  GridActionsCellItem,
} from '@mui/x-data-grid';

// DataGridと関連コンポーネントを動的インポート
const DataGrid = dynamic(
  () => import('@mui/x-data-grid').then((mod) => mod.DataGrid),
  { ssr: false, loading: () => <CircularProgress /> }
);

const GridToolbar = dynamic(
  () => import('@mui/x-data-grid').then((mod) => mod.GridToolbar),
  { ssr: false }
);
import {
  Search,
  FilterList,
  Warning,
  Block,
  CheckCircle,
  PersonAdd,
  Visibility,
  Gavel,
  RestartAlt,
  Delete,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
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

interface ActionDialogData {
  open: boolean;
  action: string;
  users: User[];
  reason?: string;
  until?: Dayjs | null;
  newRole?: string;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortModel, setSortModel] = useState<any[]>([]);
  const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>([]);
  const [actionDialog, setActionDialog] = useState<ActionDialogData>({
    open: false,
    action: '',
    users: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // ユーザーデータの取得
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        limit: pageSize.toString(),
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter }),
        ...(statusFilter && { status: statusFilter }),
        ...(sortModel.length > 0 && {
          sortBy: sortModel[0].field,
          sortOrder: sortModel[0].sort,
        }),
      });

      const response = await fetch(`/api/admin/users?${params}`, { headers: { 'x-admin-secret': 'admin-development-secret-key' } });
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      console.log('API Response:', data); // デバッグ用
      
      // データが正しい形式であることを確認
      const fetchedUsers = Array.isArray(data.users) ? data.users : [];
      setUsers(fetchedUsers);
      setTotalCount(data.pagination?.totalCount || 0);
      setError(null);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('ユーザーデータの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, roleFilter, statusFilter, sortModel]);

  // クライアント側でのマウントを確認
  useEffect(() => {
    setMounted(true);
  }, []);

  // 初回読み込みとデータ更新
  useEffect(() => {
    // 初期化の確認
    if (users === undefined) {
      setUsers([]);
    }
    fetchUsers();
  }, [fetchUsers]);

  // アクションの実行
  const executeAction = async () => {
    const { action, users, reason, until, newRole } = actionDialog;
    
    try {
      const userIds = users.map(u => u._id);
      
      if (userIds.length === 1) {
        // 単一ユーザーへのアクション
        const response = await fetch(`/api/admin/users/${userIds[0]}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' , 'x-admin-secret': 'admin-development-secret-key' },
          body: JSON.stringify({
            action,
            data: {
              role: newRole,
              until: until?.toISOString(),
            },
            reason,
            adminId: 'current-admin', // TODO: 実際の管理者IDを取得
          }),
        });
        
        if (!response.ok) throw new Error('Action failed');
        
        setSuccess(`${action} を実行しました`);
      } else {
        // 複数ユーザーへの一括アクション
        const bulkAction = `BULK_${action}`;
        const response = await fetch('/api/admin/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' , 'x-admin-secret': 'admin-development-secret-key' },
          body: JSON.stringify({
            userIds,
            action: bulkAction,
            data: {
              role: newRole,
              until: until?.toISOString(),
            },
            reason,
            adminId: 'current-admin', // TODO: 実際の管理者IDを取得
          }),
        });
        
        if (!response.ok) throw new Error('Bulk action failed');
        
        const result = await response.json();
        setSuccess(`${result.modifiedCount} 件のユーザーに対して ${action} を実行しました`);
      }
      
      fetchUsers();
      setActionDialog({ open: false, action: '', users: [] });
      setSelectionModel([]);
    } catch (err) {
      console.error('Action error:', err);
      setError('アクションの実行に失敗しました');
    }
  };

  // カラム定義
  const columns: GridColDef[] = [
    {
      field: 'email',
      headerName: 'メールアドレス',
      width: 250,
      renderCell: (params: GridRenderCellParams) => (
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="body2">{params.value}</Typography>
          {params.row.emailVerified && (
            <Tooltip title="メール認証済み">
              <CheckCircle fontSize="small" color="success" />
            </Tooltip>
          )}
        </Box>
      ),
    },
    {
      field: 'name',
      headerName: '名前',
      width: 150,
    },
    {
      field: 'role',
      headerName: '権限',
      width: 120,
      renderCell: (params: GridRenderCellParams) => {
        const roleColors: Record<string, any> = {
          admin: 'error',
          moderator: 'warning',
          user: 'default',
        };
        return (
          <Chip
            label={params.value}
            size="small"
            color={roleColors[params.value] || 'default'}
          />
        );
      },
    },
    {
      field: 'status',
      headerName: 'ステータス',
      width: 130,
      renderCell: (params: GridRenderCellParams) => {
        const statusConfig: Record<string, any> = {
          active: { label: 'アクティブ', color: 'success' },
          suspended: { label: '停止中', color: 'warning' },
          banned: { label: 'BAN', color: 'error' },
          deleted: { label: '削除済み', color: 'default' },
        };
        const config = statusConfig[params.value] || { label: params.value, color: 'default' };
        return (
          <Chip
            label={config.label}
            size="small"
            color={config.color}
          />
        );
      },
    },
    {
      field: 'warningCount',
      headerName: '警告',
      width: 80,
      renderCell: (params: GridRenderCellParams) => {
        if (params.value === 0) return '-';
        return (
          <Chip
            label={params.value}
            size="small"
            color={params.value >= 3 ? 'error' : 'warning'}
            icon={<Warning />}
          />
        );
      },
    },
    {
      field: 'lastLogin',
      headerName: '最終ログイン',
      width: 180,
      valueFormatter: (params) => {
        if (!params.value) return '未ログイン';
        return new Date(params.value).toLocaleString('ja-JP');
      },
    },
    {
      field: 'createdAt',
      headerName: '登録日',
      width: 180,
      valueFormatter: (params) => {
        return new Date(params.value).toLocaleString('ja-JP');
      },
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'アクション',
      width: 150,
      getActions: (params) => {
        const user = params.row as User;
        return [
          <GridActionsCellItem
            key="view"
            icon={<Visibility />}
            label="詳細"
            onClick={() => router.push(`/admin/users/${user._id}`)}
          />,
          <GridActionsCellItem
            key="warning"
            icon={<Warning />}
            label="警告"
            onClick={() => setActionDialog({
              open: true,
              action: 'WARNING',
              users: [user],
            })}
            disabled={user.status === 'banned' || user.status === 'deleted'}
          />,
          <GridActionsCellItem
            key="suspend"
            icon={<Block />}
            label="停止"
            onClick={() => setActionDialog({
              open: true,
              action: 'SUSPEND',
              users: [user],
            })}
            disabled={user.status === 'suspended' || user.status === 'banned' || user.status === 'deleted'}
          />,
          <GridActionsCellItem
            key="ban"
            icon={<Gavel />}
            label="BAN"
            onClick={() => setActionDialog({
              open: true,
              action: 'BAN',
              users: [user],
            })}
            disabled={user.status === 'banned' || user.status === 'deleted'}
          />,
        ];
      },
    },
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {/* ヘッダー */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">ユーザー管理</Typography>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => router.push('/admin/users/new')}
          >
            新規ユーザー作成
          </Button>
        </Box>

        {/* エラー・成功メッセージ */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {/* フィルター */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              label="検索"
              variant="outlined"
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 250 }}
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>権限</InputLabel>
              <Select
                value={roleFilter}
                label="権限"
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <MenuItem value="">すべて</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="moderator">Moderator</MenuItem>
                <MenuItem value="user">User</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>ステータス</InputLabel>
              <Select
                value={statusFilter}
                label="ステータス"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">すべて</MenuItem>
                <MenuItem value="active">アクティブ</MenuItem>
                <MenuItem value="suspended">停止中</MenuItem>
                <MenuItem value="banned">BAN</MenuItem>
                <MenuItem value="deleted">削除済み</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => {
                setSearch('');
                setRoleFilter('');
                setStatusFilter('');
              }}
            >
              リセット
            </Button>
          </Stack>
        </Paper>

        {/* 一括アクション */}
        {selectionModel.length > 0 && (
          <Paper sx={{ p: 2, mb: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="body2">
                {selectionModel.length} 件選択中
              </Typography>
              <Button
                size="small"
                startIcon={<Warning />}
                onClick={() => {
                  const selectedUsers = users.filter(u => selectionModel.includes(u._id));
                  setActionDialog({
                    open: true,
                    action: 'WARNING',
                    users: selectedUsers,
                  });
                }}
              >
                警告
              </Button>
              <Button
                size="small"
                startIcon={<Block />}
                onClick={() => {
                  const selectedUsers = users.filter(u => selectionModel.includes(u._id));
                  setActionDialog({
                    open: true,
                    action: 'SUSPEND',
                    users: selectedUsers,
                  });
                }}
              >
                停止
              </Button>
              <Button
                size="small"
                startIcon={<RestartAlt />}
                onClick={() => {
                  const selectedUsers = users.filter(u => selectionModel.includes(u._id));
                  setActionDialog({
                    open: true,
                    action: 'REACTIVATE',
                    users: selectedUsers,
                  });
                }}
              >
                復活
              </Button>
              <Button
                size="small"
                color="error"
                startIcon={<Delete />}
                onClick={() => {
                  const selectedUsers = users.filter(u => selectionModel.includes(u._id));
                  setActionDialog({
                    open: true,
                    action: 'DELETE',
                    users: selectedUsers,
                  });
                }}
              >
                削除
              </Button>
            </Stack>
          </Paper>
        )}

        {/* データグリッド */}
        <Paper sx={{ height: 600 }}>
          {!mounted || (loading && users.length === 0) ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
              <CircularProgress />
            </Box>
          ) : (
            mounted && DataGrid && (
              <DataGrid
                rows={users || []}
                columns={columns || []}
                getRowId={(row) => row?._id || Math.random().toString()}
                loading={loading}
                paginationModel={{
                  page: page || 0,
                  pageSize: pageSize || 50,
                }}
                onPaginationModelChange={(model) => {
                  if (model.page !== undefined) setPage(model.page);
                  if (model.pageSize !== undefined) setPageSize(model.pageSize);
                }}
                pageSizeOptions={[25, 50, 100]}
                rowCount={totalCount || 0}
                paginationMode="server"
                sortingMode="server"
                onSortModelChange={(model) => setSortModel(model || [])}
                checkboxSelection
                rowSelectionModel={selectionModel || []}
                onRowSelectionModelChange={(model) => setSelectionModel(model || [])}
                disableRowSelectionOnClick
                slots={{
                  toolbar: GridToolbar,
                }}
                slotProps={{
                  toolbar: {
                    showQuickFilter: true,
                    quickFilterProps: { debounceMs: 500 },
                  },
                }}
                initialState={{
                  pagination: {
                    paginationModel: { pageSize: 50, page: 0 },
                  },
                }}
              />
            )
          )}
        </Paper>

        {/* アクションダイアログ */}
        <Dialog
          open={actionDialog.open}
          onClose={() => setActionDialog({ open: false, action: '', users: [] })}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {actionDialog.action === 'WARNING' && '警告の送信'}
            {actionDialog.action === 'SUSPEND' && 'アカウント停止'}
            {actionDialog.action === 'BAN' && 'アカウントBAN'}
            {actionDialog.action === 'REACTIVATE' && 'アカウント復活'}
            {actionDialog.action === 'DELETE' && 'アカウント削除'}
            {actionDialog.action === 'UPDATE_ROLE' && '権限変更'}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <DialogContentText>
                {actionDialog.users.length === 1 ? (
                  <>対象ユーザー: {actionDialog.users[0].email}</>
                ) : (
                  <>{actionDialog.users.length} 件のユーザーに対して操作を実行します</>
                )}
              </DialogContentText>
              
              {actionDialog.action === 'UPDATE_ROLE' && (
                <FormControl fullWidth>
                  <InputLabel>新しい権限</InputLabel>
                  <Select
                    value={actionDialog.newRole || ''}
                    label="新しい権限"
                    onChange={(e) => setActionDialog({
                      ...actionDialog,
                      newRole: e.target.value,
                    })}
                  >
                    <MenuItem value="admin">Admin</MenuItem>
                    <MenuItem value="moderator">Moderator</MenuItem>
                    <MenuItem value="user">User</MenuItem>
                  </Select>
                </FormControl>
              )}
              
              {actionDialog.action === 'SUSPEND' && (
                <DatePicker
                  label="停止期限"
                  value={actionDialog.until || null}
                  onChange={(date) => setActionDialog({
                    ...actionDialog,
                    until: date,
                  })}
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
                value={actionDialog.reason || ''}
                onChange={(e) => setActionDialog({
                  ...actionDialog,
                  reason: e.target.value,
                })}
                required
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setActionDialog({ open: false, action: '', users: [] })}>
              キャンセル
            </Button>
            <Button
              onClick={executeAction}
              variant="contained"
              color={actionDialog.action === 'DELETE' || actionDialog.action === 'BAN' ? 'error' : 'primary'}
              disabled={!actionDialog.reason}
            >
              実行
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </LocalizationProvider>
  );
}