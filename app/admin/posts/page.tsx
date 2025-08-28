'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Button,
  Tooltip,
  CircularProgress,
  Alert,
  Stack
} from '@mui/material';
import {
  Edit,
  Delete,
  Visibility,
  VisibilityOff,
  Warning,
  CheckCircle,
  Block,
  Search,
  FilterList,
  Download,
  Refresh
} from '@mui/icons-material';

interface Post {
  _id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  createdAt: string;
  updatedAt: string;
  views: number;
  likes: any[];
  comments: any[];
  commentCount: number;
  isDeleted?: boolean;
  isHidden?: boolean;
  reported?: boolean;
  aiModerationScore?: number;
}

export default function PostsManagementPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  
  // フィルター
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [reportFilter, setReportFilter] = useState('all');

  const fetchPosts = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        search,
        status: statusFilter,
        dateFilter,
        category: categoryFilter,
        reportFilter,
        page: (page + 1).toString(),
        limit: rowsPerPage.toString()
      });

      const response = await fetch(`/api/admin/posts?${params}`, {
        headers: {
          'x-admin-secret': 'admin-development-secret-key'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }

      const data = await response.json();
      setPosts(data.posts || []);
      setTotalCount(data.total || 0);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('投稿データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [page, rowsPerPage, search, statusFilter, dateFilter, categoryFilter, reportFilter]);

  const handleAction = async (postId: string, action: string) => {
    try {
      const response = await fetch('/api/admin/posts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': 'admin-development-secret-key'
        },
        body: JSON.stringify({ postId, action })
      });

      if (!response.ok) {
        throw new Error('Failed to perform action');
      }

      fetchPosts(); // データを再取得
    } catch (err) {
      console.error('Error performing action:', err);
    }
  };

  const getStatusChip = (post: Post) => {
    if (post.isDeleted) {
      return <Chip label="削除済み" color="error" size="small" />;
    }
    if (post.isHidden) {
      return <Chip label="非表示" color="warning" size="small" />;
    }
    if (post.reported) {
      return <Chip label="通報あり" color="error" size="small" icon={<Warning />} />;
    }
    return <Chip label="公開中" color="success" size="small" icon={<CheckCircle />} />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  if (loading && posts.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        投稿管理
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* フィルター */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                size="small"
                placeholder="検索..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />
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
                  <MenuItem value="active">公開中</MenuItem>
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
                  <MenuItem value="week">過去7日</MenuItem>
                  <MenuItem value="month">過去30日</MenuItem>
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

              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={fetchPosts}
              >
                更新
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* 投稿テーブル */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>タイトル</TableCell>
              <TableCell>投稿者</TableCell>
              <TableCell>ステータス</TableCell>
              <TableCell>投稿日</TableCell>
              <TableCell align="center">閲覧数</TableCell>
              <TableCell align="center">コメント</TableCell>
              <TableCell>アクション</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {posts.map((post) => (
              <TableRow key={post._id}>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight={500}>
                      {post.title || 'タイトルなし'}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ 
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {post.content}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2">{post.authorName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {post.authorEmail}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{getStatusChip(post)}</TableCell>
                <TableCell>
                  <Typography variant="caption">
                    {formatDate(post.createdAt)}
                  </Typography>
                </TableCell>
                <TableCell align="center">{post.views || 0}</TableCell>
                <TableCell align="center">{post.commentCount || 0}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5}>
                    {!post.isHidden && (
                      <Tooltip title="非表示にする">
                        <IconButton
                          size="small"
                          onClick={() => handleAction(post._id, 'hide')}
                        >
                          <VisibilityOff fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {post.isHidden && (
                      <Tooltip title="公開する">
                        <IconButton
                          size="small"
                          onClick={() => handleAction(post._id, 'unhide')}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {!post.isDeleted && (
                      <Tooltip title="削除">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleAction(post._id, 'delete')}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(event, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="表示件数:"
        />
      </TableContainer>
    </Box>
  );
}