'use client';

import React from 'react';
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

export default function UsersTable({
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
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = users.map((user) => user._id);
      onSelectionChange(newSelected);
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectOne = (userId: string) => {
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
  };

  const isSelected = (userId: string) => selectionModel.indexOf(userId) !== -1;

  const getRoleColor = (role: string): any => {
    const colors: Record<string, any> = {
      admin: 'error',
      moderator: 'warning',
      user: 'default',
    };
    return colors[role] || 'default';
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, any> = {
      active: { label: 'アクティブ', color: 'success' },
      suspended: { label: '停止中', color: 'warning' },
      banned: { label: 'BAN', color: 'error' },
      deleted: { label: '削除済み', color: 'default' },
    };
    return configs[status] || { label: status, color: 'default' };
  };

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
            {users.map((user) => {
              const isItemSelected = isSelected(user._id);
              const statusConfig = getStatusConfig(user.status);

              return (
                <TableRow
                  key={user._id}
                  hover
                  role="checkbox"
                  aria-checked={isItemSelected}
                  selected={isItemSelected}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isItemSelected}
                      onChange={() => handleSelectOne(user._id)}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        onRowClick(user._id);
                      }}
                    >
                      詳細
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
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
        onPageChange={(_, newPage) => onPageChange(newPage)}
        rowsPerPage={pageSize}
        onRowsPerPageChange={(event) => {
          onPageSizeChange(parseInt(event.target.value, 10));
          onPageChange(0);
        }}
        rowsPerPageOptions={[25, 50, 100]}
        labelRowsPerPage="表示件数:"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} / ${count !== -1 ? count : `${to}以上`}`
        }
      />
    </Box>
  );
}