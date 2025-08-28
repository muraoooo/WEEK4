'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useRouter } from 'next/navigation';

interface User {
  _id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  createdAt: string;
  emailVerified: boolean;
}

export default function SimpleUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/admin/users?page=${page + 1}&limit=${rowsPerPage}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        
        const data = await response.json();
        setUsers(data.users || []);
        setTotalCount(data.pagination?.totalCount || 0);
        setError(null);
      } catch (err) {
        console.error('Error:', err);
        setError('ユーザーデータの取得に失敗しました');
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [page, rowsPerPage]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading && users.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        ユーザー管理（シンプル版）
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>メールアドレス</TableCell>
              <TableCell>名前</TableCell>
              <TableCell>権限</TableCell>
              <TableCell>ステータス</TableCell>
              <TableCell>メール認証</TableCell>
              <TableCell>登録日</TableCell>
              <TableCell>アクション</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user._id}>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.name || 'Unknown'}</TableCell>
                <TableCell>
                  <Chip
                    label={user.role}
                    size="small"
                    color={
                      user.role === 'admin' ? 'error' :
                      user.role === 'moderator' ? 'warning' :
                      'default'
                    }
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.status}
                    size="small"
                    color={
                      user.status === 'active' ? 'success' :
                      user.status === 'suspended' ? 'warning' :
                      user.status === 'banned' ? 'error' :
                      'default'
                    }
                  />
                </TableCell>
                <TableCell>
                  {user.emailVerified ? '✓' : '✗'}
                </TableCell>
                <TableCell>
                  {new Date(user.createdAt).toLocaleDateString('ja-JP')}
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    onClick={() => router.push(`/admin/users/${user._id}`)}
                  >
                    詳細
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[25, 50, 100]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="表示件数:"
        />
      </TableContainer>
    </Container>
  );
}