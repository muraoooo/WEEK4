'use client';

import React, { useState, useEffect, useCallback } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Alert,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  Stack,
  Tooltip,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  CircularProgress,
} from '@mui/material';
import {
  Search,
  Refresh,
  Delete,
  Visibility,
  VisibilityOff,
  Report,
  ThumbUp,
  Comment,
  Warning,
  Download,
  Category,
  AutoAwesome,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';
import PostModeration from '@/components/admin/PostModeration';

interface Post {
  id: string;
  _id: string;
  authorName: string;
  authorEmail: string;
  content: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  status: 'active' | 'hidden' | 'deleted';
  reported: boolean;
  reportCount: number;
  category?: string;
  aiModerationScore?: number;
  aiModerationFlags?: string[];
}

export default function AdminPosts() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [reportFilter, setReportFilter] = useState<string>('all');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<string>('');
  const [moderationOpen, setModerationOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [newCategory, setNewCategory] = useState<string>('');

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (dateFilter !== 'all') params.append('dateFilter', dateFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (reportFilter !== 'all') params.append('reportFilter', reportFilter);

      const response = await fetch(`/api/admin/posts?${params.toString()}`, { headers: { 'x-admin-secret': 'admin-development-secret-key' } });
      
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      
      const data = await response.json();
      const formattedPosts = data.posts.map((post: any) => ({
        ...post,
        id: post._id
      }));
      setPosts(formattedPosts);
      setError(null);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('投稿データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, dateFilter, categoryFilter, reportFilter]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleBulkAction = async () => {
    if (!bulkAction || selectedRows.length === 0) return;

    try {
      const body: any = {
        action: bulkAction,
        postIds: selectedRows
      };

      if (bulkAction === 'categorize' && newCategory) {
        body.category = newCategory;
      }

      const response = await fetch('/api/admin/posts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' , 'x-admin-secret': 'admin-development-secret-key' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Failed to perform bulk action');
      }

      await fetchPosts();
      setSelectedRows([]);
      setBulkActionOpen(false);
      setBulkAction('');
      setNewCategory('');
    } catch (err) {
      console.error('Error performing bulk action:', err);
      setError('一括操作に失敗しました');
    }
  };

  const handleAIModeration = async (postId: string) => {
    try {
      const response = await fetch('/api/admin/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' , 'x-admin-secret': 'admin-development-secret-key' },
        body: JSON.stringify({ postId }),
      });

      if (!response.ok) {
        throw new Error('Failed to moderate post');
      }

      const result = await response.json();
      
      setSelectedPost(posts.find(p => p._id === postId) || null);
      setModerationOpen(true);
      
      await fetchPosts();
    } catch (err) {
      console.error('Error moderating post:', err);
      setError('モデレーションに失敗しました');
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/admin/posts/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' , 'x-admin-secret': 'admin-development-secret-key' },
        body: JSON.stringify({ 
          filters: {
            status: statusFilter,
            dateFilter,
            category: categoryFilter,
            reportFilter
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `posts-export-${new Date().toISOString()}.csv`;
      a.click();
    } catch (err) {
      console.error('Error exporting data:', err);
      setError('エクスポートに失敗しました');
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelecteds = posts.map((post) => post._id);
      setSelectedRows(newSelecteds);
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectOne = (id: string) => {
    const selectedIndex = selectedRows.indexOf(id);
    let newSelected: string[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selectedRows, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selectedRows.slice(1));
    } else if (selectedIndex === selectedRows.length - 1) {
      newSelected = newSelected.concat(selectedRows.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selectedRows.slice(0, selectedIndex),
        selectedRows.slice(selectedIndex + 1)
      );
    }

    setSelectedRows(newSelected);
  };

  const isSelected = (id: string) => selectedRows.indexOf(id) !== -1;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'hidden':
        return 'warning';
      case 'deleted':
        return 'error';
      default:
        return 'default';
    }
  };

  // ページネーション計算
  const paginatedPosts = posts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  if (loading && posts.length === 0) {
    return <LoadingSpinner message="投稿データを読み込んでいます..." fullHeight />;
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">投稿管理</Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExport}
          >
            エクスポート
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchPosts}
            disabled={loading}
          >
            更新
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 2, p: 2 }}>
        <Stack spacing={2}>
          <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
            <TextField
              placeholder="検索（コンテンツ、投稿者）"
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
              <InputLabel>ステータス</InputLabel>
              <Select
                value={statusFilter}
                label="ステータス"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">すべて</MenuItem>
                <MenuItem value="active">アクティブ</MenuItem>
                <MenuItem value="hidden">非表示</MenuItem>
                <MenuItem value="deleted">削除済み</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>期間</InputLabel>
              <Select
                value={dateFilter}
                label="期間"
                onChange={(e) => setDateFilter(e.target.value)}
              >
                <MenuItem value="all">すべて</MenuItem>
                <MenuItem value="today">今日</MenuItem>
                <MenuItem value="week">今週</MenuItem>
                <MenuItem value="month">今月</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>カテゴリ</InputLabel>
              <Select
                value={categoryFilter}
                label="カテゴリ"
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <MenuItem value="all">すべて</MenuItem>
                <MenuItem value="general">一般</MenuItem>
                <MenuItem value="news">ニュース</MenuItem>
                <MenuItem value="discussion">議論</MenuItem>
                <MenuItem value="question">質問</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>通報</InputLabel>
              <Select
                value={reportFilter}
                label="通報"
                onChange={(e) => setReportFilter(e.target.value)}
              >
                <MenuItem value="all">すべて</MenuItem>
                <MenuItem value="reported">通報あり</MenuItem>
                <MenuItem value="highRisk">高リスク</MenuItem>
                <MenuItem value="resolved">解決済み</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {selectedRows.length > 0 && (
            <Box display="flex" alignItems="center" gap={2}>
              <Typography variant="body2">
                {selectedRows.length}件選択中
              </Typography>
              <Button
                variant="contained"
                color="error"
                size="small"
                startIcon={<Delete />}
                onClick={() => {
                  setBulkAction('delete');
                  setBulkActionOpen(true);
                }}
              >
                一括削除
              </Button>
              <Button
                variant="contained"
                color="warning"
                size="small"
                startIcon={<VisibilityOff />}
                onClick={() => {
                  setBulkAction('hide');
                  setBulkActionOpen(true);
                }}
              >
                一括非表示
              </Button>
              <Button
                variant="contained"
                color="info"
                size="small"
                startIcon={<Category />}
                onClick={() => {
                  setBulkAction('categorize');
                  setBulkActionOpen(true);
                }}
              >
                カテゴリ変更
              </Button>
            </Box>
          )}
        </Stack>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedRows.length > 0 && selectedRows.length < posts.length}
                  checked={posts.length > 0 && selectedRows.length === posts.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>投稿者</TableCell>
              <TableCell>コンテンツ</TableCell>
              <TableCell>カテゴリ</TableCell>
              <TableCell align="center">エンゲージメント</TableCell>
              <TableCell align="center">通報</TableCell>
              <TableCell>ステータス</TableCell>
              <TableCell>投稿日</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedPosts.map((post) => {
              const isItemSelected = isSelected(post._id);
              
              return (
                <TableRow
                  key={post._id}
                  hover
                  selected={isItemSelected}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isItemSelected}
                      onChange={() => handleSelectOne(post._id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">{post.authorName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {post.authorEmail}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box 
                      sx={{ 
                        maxWidth: 300,
                        cursor: 'pointer'
                      }} 
                      onClick={() => router.push(`/admin/posts/${post._id}`)}
                    >
                      <Typography variant="body2" sx={{ 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {post.content}
                      </Typography>
                      {post.aiModerationScore && post.aiModerationScore > 0.7 && (
                        <Chip 
                          size="small"
                          icon={<Warning />}
                          label={`リスク: ${Math.round(post.aiModerationScore * 100)}%`}
                          color="warning"
                          sx={{ mt: 0.5 }}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={post.category || '未分類'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" justifyContent="center" gap={1}>
                      <Chip
                        icon={<ThumbUp />}
                        label={post.likeCount}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        icon={<Comment />}
                        label={post.commentCount}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    {post.reported ? (
                      <Badge badgeContent={post.reportCount} color="error">
                        <Report color="error" />
                      </Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={
                        post.status === 'active' ? 'アクティブ' :
                        post.status === 'hidden' ? '非表示' : '削除済み'
                      }
                      color={getStatusColor(post.status) as any}
                      size="small"
                      icon={
                        post.status === 'active' ? <CheckCircle /> :
                        post.status === 'hidden' ? <VisibilityOff /> : <Cancel />
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(post.createdAt).toLocaleDateString('ja-JP')}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="AIモデレーション">
                      <IconButton
                        size="small"
                        onClick={() => handleAIModeration(post._id)}
                        color="primary"
                      >
                        <AutoAwesome />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="詳細">
                      <IconButton
                        size="small"
                        onClick={() => router.push(`/admin/posts/${post._id}`)}
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
            {paginatedPosts.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    投稿が見つかりません
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={posts.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="表示件数:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} / ${count !== -1 ? count : `${to}以上`}`
          }
        />
      </TableContainer>

      <Dialog
        open={bulkActionOpen}
        onClose={() => setBulkActionOpen(false)}
      >
        <DialogTitle>
          一括操作の確認
        </DialogTitle>
        <DialogContent>
          {bulkAction === 'delete' && (
            <Typography>
              選択した{selectedRows.length}件の投稿を削除しますか？
            </Typography>
          )}
          {bulkAction === 'hide' && (
            <Typography>
              選択した{selectedRows.length}件の投稿を非表示にしますか？
            </Typography>
          )}
          {bulkAction === 'categorize' && (
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>新しいカテゴリ</InputLabel>
              <Select 
                label="新しいカテゴリ"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              >
                <MenuItem value="general">一般</MenuItem>
                <MenuItem value="news">ニュース</MenuItem>
                <MenuItem value="discussion">議論</MenuItem>
                <MenuItem value="question">質問</MenuItem>
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkActionOpen(false)}>キャンセル</Button>
          <Button onClick={handleBulkAction} color="primary" variant="contained">
            実行
          </Button>
        </DialogActions>
      </Dialog>

      <PostModeration
        open={moderationOpen}
        onClose={() => setModerationOpen(false)}
        post={selectedPost}
        onAction={fetchPosts}
      />
    </Container>
  );
}