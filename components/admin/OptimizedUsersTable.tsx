'use client';

import React, { memo, useCallback, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Checkbox,
  Chip,
  Button,
  Box,
  LinearProgress,
} from '@mui/material';
import { Warning } from '@mui/icons-material';

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

interface UsersTableProps {
  users: User[];
  loading: boolean;
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onRowClick: (userId: string) => void;
  onSelectionChange: (selection: string[]) => void;
  selectionModel: string[];
}

// メモ化されたテーブル行コンポーネント
const UserTableRow = memo(({
  user,
  isSelected,
  onSelectOne,
  onRowClick,
  getRoleColor,
  getStatusConfig
}: {
  user: User;
  isSelected: boolean;
  onSelectOne: (userId: string) => void;
  onRowClick: (userId: string) => void;
  getRoleColor: (role: string) => any;
  getStatusConfig: (status: string) => any;
}) => {
  const statusConfig = getStatusConfig(user.status);
  
  const handleDetailClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onRowClick(user._id);
  }, [user._id, onRowClick]);
  
  const handleCheckboxChange = useCallback(() => {
    onSelectOne(user._id);
  }, [user._id, onSelectOne]);

  return (
    <TableRow
      hover
      role="checkbox"
      aria-checked={isSelected}
      selected={isSelected}
      sx={{ cursor: 'pointer' }}
    >
      <TableCell padding="checkbox">
        <Checkbox
          checked={isSelected}
          onChange={handleCheckboxChange}
        />
      </TableCell>
      <TableCell>{user.email}</TableCell>
      <TableCell>{user.name}</TableCell>
      <TableCell>
        <Chip
          label={user.role}
          size="small"
          color={getRoleColor(user.role)}
        />
      </TableCell>
      <TableCell>
        <Chip
          label={statusConfig.label}
          size="small"
          color={statusConfig.color}
        />
      </TableCell>
      <TableCell align="center">
        {user.warningCount > 0 ? (
          <Chip
            label={user.warningCount}
            size="small"
            color={user.warningCount >= 3 ? 'error' : 'warning'}
            icon={<Warning />}
          />
        ) : (
          '-'
        )}
      </TableCell>
      <TableCell>
        {user.lastLogin
          ? new Date(user.lastLogin).toLocaleString('ja-JP')
          : '未ログイン'}
      </TableCell>
      <TableCell>
        {new Date(user.createdAt).toLocaleString('ja-JP')}
      </TableCell>
      <TableCell align="center">
        <Button
          size="small"
          onClick={handleDetailClick}
        >
          詳細
        </Button>
      </TableCell>
    </TableRow>
  );
}, (prevProps, nextProps) => {
  // カスタム比較関数: 必要なプロパティのみチェック
  return (
    prevProps.user._id === nextProps.user._id &&
    prevProps.user.status === nextProps.user.status &&
    prevProps.user.warningCount === nextProps.user.warningCount &&
    prevProps.user.lastLogin === nextProps.user.lastLogin &&
    prevProps.isSelected === nextProps.isSelected
  );
});

UserTableRow.displayName = 'UserTableRow';

const OptimizedUsersTable = memo(function OptimizedUsersTable({
  users,
  loading,
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  onSelectionChange,
  selectionModel,
}: UsersTableProps) {
  
  // メモ化された関数
  const handleSelectAll = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = users.map((user) => user._id);
      onSelectionChange(newSelected);
    } else {
      onSelectionChange([]);
    }
  }, [users, onSelectionChange]);

  const handleSelectOne = useCallback((userId: string) => {
    const selectedIndex = selectionModel.indexOf(userId);
    let newSelected: string[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selectionModel, userId);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selectionModel.slice(1));
    } else if (selectedIndex === selectionModel.length - 1) {
      newSelected = newSelected.concat(selectionModel.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selectionModel.slice(0, selectedIndex),
        selectionModel.slice(selectedIndex + 1)
      );
    }

    onSelectionChange(newSelected);
  }, [selectionModel, onSelectionChange]);

  // メモ化されたヘルパー関数
  const getRoleColor = useCallback((role: string): any => {
    const colors: Record<string, any> = {
      admin: 'error',
      moderator: 'warning',
      user: 'default',
    };
    return colors[role] || 'default';
  }, []);

  const getStatusConfig = useCallback((status: string) => {
    const configs: Record<string, any> = {
      active: { label: 'アクティブ', color: 'success' },
      suspended: { label: '停止中', color: 'warning' },
      banned: { label: 'BAN', color: 'error' },
      deleted: { label: '削除済み', color: 'default' },
    };
    return configs[status] || { label: status, color: 'default' };
  }, []);

  // 選択状態のセットをメモ化
  const selectionSet = useMemo(() => new Set(selectionModel), [selectionModel]);

  const handlePageChange = useCallback((event: unknown, newPage: number) => {
    onPageChange(newPage);
  }, [onPageChange]);

  const handleRowsPerPageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    onPageSizeChange(parseInt(event.target.value, 10));
    onPageChange(0);
  }, [onPageSizeChange, onPageChange]);

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {loading && <LinearProgress />}
      
      <TableContainer sx={{ flexGrow: 1 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectionModel.length > 0 && selectionModel.length < users.length}
                  checked={users.length > 0 && selectionModel.length === users.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>メールアドレス</TableCell>
              <TableCell>名前</TableCell>
              <TableCell>権限</TableCell>
              <TableCell>ステータス</TableCell>
              <TableCell align="center">警告</TableCell>
              <TableCell>最終ログイン</TableCell>
              <TableCell>登録日</TableCell>
              <TableCell align="center">アクション</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <UserTableRow
                key={user._id}
                user={user}
                isSelected={selectionSet.has(user._id)}
                onSelectOne={handleSelectOne}
                onRowClick={onRowClick}
                getRoleColor={getRoleColor}
                getStatusConfig={getStatusConfig}
              />
            ))}
            {users.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  データがありません
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
        onPageChange={handlePageChange}
        rowsPerPage={pageSize}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowsPerPageOptions={[20, 50, 100]}
        labelRowsPerPage="表示件数:"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} / ${count !== -1 ? count : `${to}以上`}`
        }
      />
    </Box>
  );
});

export default OptimizedUsersTable;