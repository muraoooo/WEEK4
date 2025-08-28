'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Alert,
  Stack,
  CircularProgress,
} from '@mui/material';
import {
  PersonAdd,
  FileDownload,
  Refresh,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';

// Advanced user management components
import UserFilters from '@/components/admin/users/UserFilters';
import BulkActionsBar from '@/components/admin/users/BulkActionsBar';
import UserExport from '@/components/admin/users/UserExport';
import SimpleUsersTable from '@/components/admin/users/SimpleUsersTable';

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

interface FilterState {
  search: string;
  role: string;
  status: string;
  emailVerified: boolean | null;
  twoFactorEnabled: boolean | null;
  createdAfter: Dayjs | null;
  createdBefore: Dayjs | null;
  lastLoginAfter: Dayjs | null;
  lastLoginBefore: Dayjs | null;
  warningCountMin: number | null;
  warningCountMax: number | null;
  hasNeverLoggedIn: boolean;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [selectionModel, setSelectionModel] = useState<string[]>([]);
  const [sortModel, setSortModel] = useState<any[]>([]);
  const [filterModel, setFilterModel] = useState<any>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Advanced filtering state
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    role: '',
    status: '',
    emailVerified: null,
    twoFactorEnabled: null,
    createdAfter: null,
    createdBefore: null,
    lastLoginAfter: null,
    lastLoginBefore: null,
    warningCountMin: null,
    warningCountMax: null,
    hasNeverLoggedIn: false,
  });

  // ユーザーデータの取得
  const fetchUsers = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        limit: pageSize.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.role && { role: filters.role }),
        ...(filters.status && { status: filters.status }),
        ...(filters.emailVerified !== null && { emailVerified: filters.emailVerified.toString() }),
        ...(filters.twoFactorEnabled !== null && { twoFactorEnabled: filters.twoFactorEnabled.toString() }),
        ...(filters.createdAfter && { createdAfter: filters.createdAfter.toISOString() }),
        ...(filters.createdBefore && { createdBefore: filters.createdBefore.toISOString() }),
        ...(filters.lastLoginAfter && { lastLoginAfter: filters.lastLoginAfter.toISOString() }),
        ...(filters.lastLoginBefore && { lastLoginBefore: filters.lastLoginBefore.toISOString() }),
        ...(filters.warningCountMin !== null && { warningCountMin: filters.warningCountMin.toString() }),
        ...(filters.warningCountMax !== null && { warningCountMax: filters.warningCountMax.toString() }),
        ...(filters.hasNeverLoggedIn && { hasNeverLoggedIn: 'true' }),
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
      setUsers(data.users || []);
      setTotalCount(data.pagination?.totalCount || 0);
      setFilteredCount(data.pagination?.totalCount || 0);
      setError(null);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('ユーザーデータの取得に失敗しました');
      setUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, pageSize, filters, sortModel]);

  // 初回読み込みとデータ更新
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handlers
  const handleRefresh = () => {
    fetchUsers(true);
  };

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setPage(0); // Reset to first page when filters change
  };

  const handleFiltersReset = () => {
    const emptyFilters: FilterState = {
      search: '',
      role: '',
      status: '',
      emailVerified: null,
      twoFactorEnabled: null,
      createdAfter: null,
      createdBefore: null,
      lastLoginAfter: null,
      lastLoginBefore: null,
      warningCountMin: null,
      warningCountMax: null,
      hasNeverLoggedIn: false,
    };
    setFilters(emptyFilters);
    setPage(0);
  };

  const handleRowClick = (userId: string) => {
    router.push(`/admin/users/${userId}`);
  };

  const handleSelectionChange = (newSelection: any) => {
    setSelectionModel(newSelection);
  };

  const handleUserAction = async (userId: string, action: string, data?: any) => {
    try {
      console.log('HandleUserAction called:', { userId, action, data });
      
      // アクション名を適切にマッピング
      let apiAction = action;
      let apiData = data || {};
      let method = 'PUT';
      
      switch (action) {
        case 'view':
          // 詳細表示のみリダイレクト
          router.push(`/admin/users/${userId}`);
          return;
        case 'edit':
          // 編集ページへリダイレクト
          router.push(`/admin/users/${userId}/edit`);
          return;
        case 'suspend':
          // 停止アクションの確認ダイアログ
          if (!window.confirm('このユーザーを停止しますか？\n\nこの操作により、ユーザーは一時的にログインできなくなります。')) {
            return;
          }
          apiAction = 'SUSPEND';
          apiData.duration = '7 days';
          break;
        case 'ban':
          apiAction = 'BAN';
          break;
        case 'reactivate':
          apiAction = 'REACTIVATE';
          break;
        case 'warning':
          // 警告アクションの確認ダイアログ
          if (!window.confirm('このユーザーに警告を送信しますか？\n\n警告が蓄積されると、自動的にアカウントが制限される場合があります。')) {
            return;
          }
          apiAction = 'WARNING';
          break;
        case 'delete':
          // DELETEメソッドを使用
          method = 'DELETE';
          break;
      }
      
      console.log('API call params:', { apiAction, apiData, method });
      
      if (action === 'delete') {
        // 削除確認
        if (!window.confirm('このユーザーを削除してもよろしいですか？\n\nこの操作は取り消せません。')) {
          return;
        }
        const response = await fetch(`/api/admin/users/${userId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', 'x-admin-secret': 'admin-development-secret-key' },
          body: JSON.stringify({
            reason: 'Admin deletion',
            adminId: 'current-admin',
          }),
        });
        
        if (!response.ok) {
          throw new Error('Delete failed');
        }
        
        setSuccess('ユーザーを削除しました');
      } else {
        // その他のアクション
        const response = await fetch(`/api/admin/users/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-admin-secret': 'admin-development-secret-key' },
          body: JSON.stringify({
            action: apiAction,
            data: apiData,
            reason: 'Admin action',
            adminId: 'current-admin',
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Action failed:', errorData);
          throw new Error(errorData.error || 'Action failed');
        }
        
        const actionMessages: { [key: string]: string } = {
          suspend: 'ユーザーを停止しました',
          ban: 'ユーザーをBANしました',
          reactivate: 'ユーザーを再有効化しました',
          warning: '警告を送信しました',
        };
        
        setSuccess(actionMessages[action] || `${action}を実行しました`);
      }
      
      fetchUsers();
    } catch (err) {
      console.error('Action error:', err);
      setError('アクションの実行に失敗しました');
    }
  };

  const handleBulkAction = async (action: string, data?: any) => {
    try {
      const userIds = selectionModel.map(id => id.toString());
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' , 'x-admin-secret': 'admin-development-secret-key' },
        body: JSON.stringify({
          userIds,
          action,
          data,
          adminId: 'current-admin', // TODO: Get actual admin ID
        }),
      });

      if (!response.ok) {
        throw new Error('Bulk action failed');
      }

      const result = await response.json();
      setSuccess(`${result.modifiedCount || selectionModel.length} 件のユーザーに対して操作を実行しました`);
      fetchUsers();
      setSelectionModel([]);
    } catch (err) {
      console.error('Bulk action error:', err);
      setError('一括操作の実行に失敗しました');
    }
  };

  const handleExport = async (config: any) => {
    try {
      const params = new URLSearchParams({
        format: config.format,
        fields: config.fields.join(','),
        ...(config.includeAll ? {} : { userIds: config.userIds.join(',') }),
      });

      const response = await fetch(`/api/admin/users/export?${params}`, { headers: { 'x-admin-secret': 'admin-development-secret-key' } });
      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `users-export-${new Date().toISOString().split('T')[0]}.${config.format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess('エクスポートが完了しました');
    } catch (err) {
      console.error('Export error:', err);
      setError('エクスポートに失敗しました');
    }
  };

  const selectedUsers = users.filter(user => selectionModel.includes(user._id));


  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {/* ヘッダー */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">ユーザー管理</Typography>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? '更新中...' : '更新'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<FileDownload />}
              onClick={() => setExportOpen(true)}
            >
              エクスポート
            </Button>
            <Button
              variant="contained"
              startIcon={<PersonAdd />}
              onClick={() => router.push('/admin/users/new')}
            >
              新規ユーザー作成
            </Button>
          </Stack>
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

        {/* 高度なフィルター */}
        <UserFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onReset={handleFiltersReset}
          totalCount={totalCount}
          filteredCount={filteredCount}
        />

        {/* 一括アクションバー */}
        <BulkActionsBar
          selectedUsers={selectedUsers}
          onBulkAction={handleBulkAction}
          onExport={() => setExportOpen(true)}
          onClearSelection={() => setSelectionModel([])}
        />

        {/* ユーザーテーブル */}
        <Paper>
          <SimpleUsersTable
            users={users}
            loading={loading}
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            selectionModel={selectionModel}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onSelectionChange={handleSelectionChange}
            onUserAction={handleUserAction}
          />
        </Paper>

        {/* エクスポートダイアログ */}
        <UserExport
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          selectedUserIds={selectionModel.map(id => id.toString())}
          totalCount={totalCount}
          onExport={handleExport}
        />
      </Container>
    </LocalizationProvider>
  );
}