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
} from '@mui/material';
import {
  Visibility,
  Edit,
  Block,
  Warning,
  Delete,
  CheckCircle,
  Cancel,
  Security,
  VerifiedUser,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

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
  avatar?: string;
}

interface SimpleUsersTableProps {
  users: User[];
  loading: boolean;
  page: number;
  pageSize: number;
  totalCount: number;
  selectionModel: string[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSelectionChange: (selection: string[]) => void;
  onUserAction: (userId: string, action: string) => void;
}

export default function SimpleUsersTable({
  users,
  loading,
  page,
  pageSize,
  totalCount,
  selectionModel,
  onPageChange,
  onPageSizeChange,
  onSelectionChange,
  onUserAction,
}: SimpleUsersTableProps) {
  const router = useRouter();

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      onSelectionChange(users.map(user => user._id));
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
        selectionModel.slice(selectedIndex + 1),
      );
    }

    onSelectionChange(newSelected);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'error';
      case 'moderator': return 'warning';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'suspended': return 'warning';
      case 'banned': return 'error';
      case 'deleted': return 'default';
      default: return 'default';
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('ja-JP');
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
                  indeterminate={selectionModel.length > 0 && selectionModel.length < users.length}
                  checked={users.length > 0 && selectionModel.length === users.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>ユーザー</TableCell>
              <TableCell>メール</TableCell>
              <TableCell>権限</TableCell>
              <TableCell>ステータス</TableCell>
              <TableCell>認証</TableCell>
              <TableCell align="center">警告</TableCell>
              <TableCell>作成日</TableCell>
              <TableCell>最終ログイン</TableCell>
              <TableCell align="center">アクション</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => {
              const isSelected = selectionModel.indexOf(user._id) !== -1;
              
              return (
                <TableRow
                  key={user._id}
                  hover
                  selected={isSelected}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isSelected}
                      onChange={() => handleSelectOne(user._id)}
                    />
                  </TableCell>
                  
                  <TableCell>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar 
                        src={user.avatar} 
                        sx={{ width: 32, height: 32 }}
                      >
                        {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                      </Avatar>
                      <Typography variant="body2">
                        {user.name || 'Unknown'}
                      </Typography>
                    </Stack>
                  </TableCell>
                  
                  <TableCell>{user.email}</TableCell>
                  
                  <TableCell>
                    <Chip
                      label={user.role}
                      size="small"
                      color={getRoleColor(user.role) as any}
                      icon={user.role === 'admin' ? <Security /> : undefined}
                    />
                  </TableCell>
                  
                  <TableCell>
                    <Chip
                      label={user.status}
                      size="small"
                      color={getStatusColor(user.status) as any}
                    />
                  </TableCell>
                  
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Tooltip title={user.emailVerified ? 'メール認証済み' : 'メール未認証'}>
                        {user.emailVerified ? 
                          <CheckCircle color="success" fontSize="small" /> :
                          <Cancel color="disabled" fontSize="small" />
                        }
                      </Tooltip>
                      {user.twoFactorEnabled && (
                        <Tooltip title="2FA有効">
                          <VerifiedUser color="primary" fontSize="small" />
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                  
                  <TableCell align="center">
                    {user.warningCount > 0 && (
                      <Chip
                        label={user.warningCount}
                        size="small"
                        color="warning"
                        icon={<Warning />}
                      />
                    )}
                  </TableCell>
                  
                  <TableCell>{formatDate(user.createdAt)}</TableCell>
                  <TableCell>{formatDate(user.lastLogin)}</TableCell>
                  
                  <TableCell align="center">
                    <Stack direction="row" spacing={0}>
                      <Tooltip title="詳細">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/admin/users/${user._id}`);
                          }}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="編集">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUserAction(user._id, 'edit');
                          }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      {user.status === 'active' ? (
                        <>
                          <Tooltip title="警告">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                onUserAction(user._id, 'warning');
                              }}
                              color="warning"
                            >
                              <Warning fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="停止">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                onUserAction(user._id, 'suspend');
                              }}
                              color="warning"
                            >
                              <Block fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      ) : user.status === 'suspended' ? (
                        <>
                          <Tooltip title="再有効化">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                onUserAction(user._id, 'reactivate');
                              }}
                              color="success"
                            >
                              <CheckCircle fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="BAN">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                onUserAction(user._id, 'ban');
                              }}
                              color="error"
                            >
                              <Block fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      ) : user.status === 'banned' ? (
                        <>
                          <Tooltip title="再有効化">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                onUserAction(user._id, 'reactivate');
                              }}
                              color="success"
                            >
                              <CheckCircle fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="削除">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                onUserAction(user._id, 'delete');
                              }}
                              color="error"
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      ) : (
                        <Tooltip title="再有効化">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUserAction(user._id, 'reactivate');
                            }}
                            color="success"
                          >
                            <CheckCircle fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
            
            {users.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  <Typography variant="body2" color="text.secondary">
                    ユーザーが見つかりませんでした
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
    </Box>
  );
}