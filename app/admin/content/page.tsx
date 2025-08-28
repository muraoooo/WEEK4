'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Badge,
  Stack,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Report as ReportIcon,
  Warning,
  CheckCircle,
  Block,
  Visibility,
  Delete,
  Refresh,
  Assessment,
  TrendingUp,
  Security,
  Flag
} from '@mui/icons-material';

interface Report {
  _id: string;
  postId: string;
  reporterId: string;
  reporterName: string;
  reporterEmail: string;
  reason: string;
  description: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  createdAt: string;
  postTitle?: string;
  postContent?: string;
  postAuthor?: string;
}

interface Statistics {
  totalReports: number;
  pendingReports: number;
  resolvedReports: number;
  highRiskPosts: number;
  reportsByCategory: { [key: string]: number };
  recentTrend: 'increasing' | 'stable' | 'decreasing';
}

export default function ContentModerationPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const fetchReports = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        category: categoryFilter
      });

      const response = await fetch(`/api/admin/reports?${params}`, {
        headers: {
          'x-admin-secret': 'admin-development-secret-key'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }

      const data = await response.json();
      setReports(data.reports || []);
      setStatistics(data.statistics || null);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('通報データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [statusFilter, categoryFilter]);

  const handleReportAction = async (reportId: string, action: string) => {
    try {
      const response = await fetch(`/api/admin/reports/${reportId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': 'admin-development-secret-key'
        },
        body: JSON.stringify({ action })
      });

      if (!response.ok) {
        throw new Error('Failed to update report');
      }

      fetchReports(); // データを再取得
    } catch (err) {
      console.error('Error updating report:', err);
    }
  };

  const getStatusChip = (status: string) => {
    const statusConfig = {
      pending: { label: '未対応', color: 'error' as const, icon: <Warning /> },
      reviewing: { label: '確認中', color: 'warning' as const, icon: <Assessment /> },
      resolved: { label: '解決済み', color: 'success' as const, icon: <CheckCircle /> },
      dismissed: { label: '却下', color: 'default' as const, icon: <Block /> }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <Chip 
        label={config.label} 
        color={config.color} 
        size="small" 
        icon={config.icon}
      />
    );
  };

  const getReasonChip = (reason: string) => {
    const reasonColors: { [key: string]: any } = {
      spam: 'warning',
      inappropriate: 'error',
      harassment: 'error',
      misinformation: 'warning',
      other: 'default'
    };

    return (
      <Chip 
        label={reason} 
        color={reasonColors[reason] || 'default'} 
        size="small" 
        variant="outlined"
      />
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  if (loading && !statistics) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        通報管理
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* 統計情報 */}
      {statistics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2" color="text.secondary">
                      総通報数
                    </Typography>
                    <ReportIcon color="action" />
                  </Stack>
                  <Typography variant="h4">
                    {statistics.totalReports}
                  </Typography>
                  {statistics.recentTrend === 'increasing' && (
                    <Chip 
                      label="増加傾向" 
                      color="error" 
                      size="small" 
                      icon={<TrendingUp />} 
                    />
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2" color="text.secondary">
                      未対応
                    </Typography>
                    <Badge badgeContent={statistics.pendingReports} color="error">
                      <Warning color="action" />
                    </Badge>
                  </Stack>
                  <Typography variant="h4" color="error.main">
                    {statistics.pendingReports}
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={(statistics.pendingReports / statistics.totalReports) * 100}
                    color="error"
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2" color="text.secondary">
                      解決済み
                    </Typography>
                    <CheckCircle color="success" />
                  </Stack>
                  <Typography variant="h4" color="success.main">
                    {statistics.resolvedReports}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    解決率: {Math.round((statistics.resolvedReports / statistics.totalReports) * 100)}%
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2" color="text.secondary">
                      高リスク投稿
                    </Typography>
                    <Security color="error" />
                  </Stack>
                  <Typography variant="h4" color="warning.main">
                    {statistics.highRiskPosts}
                  </Typography>
                  <Button 
                    size="small" 
                    color="error" 
                    startIcon={<Flag />}
                  >
                    要確認
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* フィルター */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>ステータス</InputLabel>
              <Select
                value={statusFilter}
                label="ステータス"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">すべて</MenuItem>
                <MenuItem value="pending">未対応</MenuItem>
                <MenuItem value="reviewing">確認中</MenuItem>
                <MenuItem value="resolved">解決済み</MenuItem>
                <MenuItem value="dismissed">却下</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>カテゴリ</InputLabel>
              <Select
                value={categoryFilter}
                label="カテゴリ"
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <MenuItem value="all">すべて</MenuItem>
                <MenuItem value="spam">スパム</MenuItem>
                <MenuItem value="inappropriate">不適切</MenuItem>
                <MenuItem value="harassment">ハラスメント</MenuItem>
                <MenuItem value="misinformation">誤情報</MenuItem>
                <MenuItem value="other">その他</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchReports}
            >
              更新
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* 通報テーブル */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>投稿情報</TableCell>
              <TableCell>通報者</TableCell>
              <TableCell>理由</TableCell>
              <TableCell>ステータス</TableCell>
              <TableCell>通報日時</TableCell>
              <TableCell>アクション</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Box py={4}>
                    <Typography color="text.secondary">
                      通報データがありません
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              reports.map((report) => (
                <TableRow key={report._id}>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        {report.postTitle || '投稿タイトル'}
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
                        {report.postContent || '投稿内容'}
                      </Typography>
                      <Typography variant="caption" color="primary">
                        投稿者: {report.postAuthor || 'Unknown'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">{report.reporterName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {report.reporterEmail}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.5}>
                      {getReasonChip(report.reason)}
                      {report.description && (
                        <Typography variant="caption" color="text.secondary">
                          {report.description}
                        </Typography>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>{getStatusChip(report.status)}</TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {formatDate(report.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="詳細を確認">
                        <IconButton size="small">
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {report.status === 'pending' && (
                        <>
                          <Tooltip title="解決済みにする">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleReportAction(report._id, 'resolve')}
                            >
                              <CheckCircle fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="却下する">
                            <IconButton
                              size="small"
                              color="default"
                              onClick={() => handleReportAction(report._id, 'dismiss')}
                            >
                              <Block fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      <Tooltip title="投稿を削除">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleReportAction(report._id, 'delete_post')}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}