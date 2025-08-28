'use client';

import React, { memo, useState, useMemo, useCallback, lazy, Suspense } from 'react';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import TablePagination from '@mui/material/TablePagination';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import Person from '@mui/icons-material/Person';
import MoreVert from '@mui/icons-material/MoreVert';
import Edit from '@mui/icons-material/Edit';
import Block from '@mui/icons-material/Block';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Warning from '@mui/icons-material/Warning';
import { FixedSizeList as List } from 'react-window';

// 重いコンポーネントを遅延読み込み
const UserDetailsDialog = lazy(() => import('./UserDetailsDialog'));

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

interface OptimizedUsersTableProps {
  users: User[];
  loading?: boolean;
  totalUsers?: number;
  page?: number;
  rowsPerPage?: number;
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  onUserAction?: (userId: string, action: string) => void;
}

// テーブル行コンポーネントをメモ化
const UserTableRow = memo<{
  user: User;
  onUserAction?: (userId: string, action: string) => void;
}>(({ user, onUserAction }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleMenuClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleAction = useCallback((action: string) => {
    onUserAction?.(user._id, action);
    handleMenuClose();
  }, [user._id, onUserAction]);

  const getStatusColor = useMemo(() => {
    switch (user.status) {
      case 'active': return 'success';
      case 'suspended': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  }, [user.status]);

  const getStatusIcon = useMemo(() => {
    switch (user.status) {
      case 'active': return <CheckCircle />;
      case 'suspended': return <Block />;
      case 'pending': return <Warning />;
      default: return <Person />;
    }
  }, [user.status]);

  return (
    <>
      <TableRow hover>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
              {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight="medium">
                {user.name || 'No Name'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user.email}
              </Typography>
            </Box>
          </Box>
        </TableCell>
        
        <TableCell>
          <Chip
            icon={getStatusIcon}
            label={user.status}
            color={getStatusColor as any}
            size="small"
            variant="outlined"
          />
        </TableCell>
        
        <TableCell>
          <Chip
            label={user.role}
            color={user.role === 'admin' ? 'primary' : 'default'}
            size="small"
            variant={user.role === 'admin' ? 'filled' : 'outlined'}
          />
        </TableCell>
        
        <TableCell>
          <Typography variant="caption">
            {new Date(user.createdAt).toLocaleDateString('ja-JP')}
          </Typography>
        </TableCell>
        
        <TableCell>
          <Typography variant="caption">
            {user.lastLogin 
              ? new Date(user.lastLogin).toLocaleDateString('ja-JP')
              : '未ログイン'
            }
          </Typography>
        </TableCell>
        
        <TableCell>
          {user.warningCount && user.warningCount > 0 && (
            <Chip
              label={user.warningCount}
              color="warning"
              size="small"
              sx={{ minWidth: '24px' }}
            />
          )}
        </TableCell>
        
        <TableCell>
          <IconButton
            size="small"
            onClick={handleMenuClick}
            sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
          >
            <MoreVert fontSize="small" />
          </IconButton>
        </TableCell>
      </TableRow>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => setDialogOpen(true)}>
          <Edit fontSize="small" sx={{ mr: 1 }} />
          詳細を見る
        </MenuItem>
        {user.status === 'active' ? (
          <MenuItem onClick={() => handleAction('suspend')}>
            <Block fontSize="small" sx={{ mr: 1 }} />
            停止
          </MenuItem>
        ) : (
          <MenuItem onClick={() => handleAction('activate')}>
            <CheckCircle fontSize="small" sx={{ mr: 1 }} />
            有効化
          </MenuItem>
        )}
      </Menu>

      <Suspense fallback={
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress size={20} />
        </Box>
      }>
        {dialogOpen && (
          <UserDetailsDialog
            user={user}
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            onAction={onUserAction}
          />
        )}
      </Suspense>
    </>
  );
}, (prevProps, nextProps) => {
  return prevProps.user._id === nextProps.user._id &&
         prevProps.user.status === nextProps.user.status &&
         prevProps.user.warningCount === nextProps.user.warningCount;
});

UserTableRow.displayName = 'UserTableRow';

// テーブルローディングスケルトン
const TableSkeleton = memo(() => (
  <TableBody>
    {Array.from({ length: 10 }).map((_, index) => (
      <TableRow key={index}>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Skeleton variant="circular" width={32} height={32} />
            <Box>
              <Skeleton variant="text" width={120} height={16} />
              <Skeleton variant="text" width={160} height={12} />
            </Box>
          </Box>
        </TableCell>
        <TableCell><Skeleton variant="rectangular" width={60} height={24} /></TableCell>
        <TableCell><Skeleton variant="rectangular" width={50} height={24} /></TableCell>
        <TableCell><Skeleton variant="text" width={80} /></TableCell>
        <TableCell><Skeleton variant="text" width={80} /></TableCell>
        <TableCell><Skeleton variant="text" width={30} /></TableCell>
        <TableCell><Skeleton variant="circular" width={24} height={24} /></TableCell>
      </TableRow>
    ))}
  </TableBody>
));

TableSkeleton.displayName = 'TableSkeleton';

// メインコンポーネント
const OptimizedUsersTable = memo<OptimizedUsersTableProps>(({
  users,
  loading = false,
  totalUsers = 0,
  page = 0,
  rowsPerPage = 25,
  onPageChange,
  onRowsPerPageChange,
  onUserAction
}) => {
  // ページネーションのハンドラーをメモ化
  const handlePageChange = useCallback((event: unknown, newPage: number) => {
    onPageChange?.(newPage);
  }, [onPageChange]);

  const handleRowsPerPageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    onRowsPerPageChange?.(newRowsPerPage);
  }, [onRowsPerPageChange]);

  // テーブルヘッダーをメモ化
  const tableHeaders = useMemo(() => [
    'ユーザー',
    'ステータス', 
    'ロール',
    '登録日',
    '最終ログイン',
    '警告',
    'アクション'
  ], []);

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
        <Table stickyHeader aria-label="users table" size="small">
          <TableHead>
            <TableRow>
              {tableHeaders.map((header) => (
                <TableCell
                  key={header}
                  sx={{
                    fontWeight: 600,
                    bgcolor: 'grey.50',
                    borderBottom: '2px solid',
                    borderColor: 'divider'
                  }}
                >
                  {header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          
          {loading ? (
            <TableSkeleton />
          ) : (
            <TableBody>
              {users.map((user) => (
                <UserTableRow
                  key={user._id}
                  user={user}
                  onUserAction={onUserAction}
                />
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography color="text.secondary">
                      ユーザーが見つかりませんでした
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          )}
        </Table>
      </TableContainer>
      
      <TablePagination
        component="div"
        count={totalUsers}
        page={page}
        onPageChange={handlePageChange}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowsPerPageOptions={[10, 25, 50, 100]}
        labelRowsPerPage="表示件数:"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} / ${count !== -1 ? count : `${to}以上`}`
        }
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'grey.50'
        }}
      />
    </Paper>
  );
});

OptimizedUsersTable.displayName = 'OptimizedUsersTable';

export default OptimizedUsersTable;