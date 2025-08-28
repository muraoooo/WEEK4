'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Skeleton,
  Grid,
  LinearProgress
} from '@mui/material';
import {
  Visibility,
  CheckCircle,
  Cancel,
  Warning,
  Assessment,
  Refresh,
  TrendingUp,
  ReportProblem
} from '@mui/icons-material';

interface Report {
  _id: string;
  targetId: string;
  targetType: 'post' | 'comment' | 'user';
  category: string;
  description: string;
  reporterId: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'rejected';
  priority: number;
  falseReportScore?: number;
  metadata: {
    targetContent?: string;
    timestamp: string;
    ipAddress?: string;
    userAgent?: string;
  };
  createdAt: string;
  updatedAt: string;
  resolution?: {
    action: string;
    resolvedBy: string;
    resolvedAt: string;
    notes: string;
  };
}

interface ReportStats {
  totalReports: number;
  pendingCount: number;
  reviewingCount: number;
  resolvedCount: number;
  rejectedCount: number;
  avgPriority: number;
  avgFalseReportScore: number;
  resolutionRate: number;
}

export default function PublicReportsManagement() {
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [actionDialog, setActionDialog] = useState(false);
  const [detailDialog, setDetailDialog] = useState(false);
  const [actionNotes, setActionNotes] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    sortBy: 'priority'
  });

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.category) params.append('category', filters.category);
      params.append('sortBy', filters.sortBy);

      const response = await fetch(`/api/reports?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }

      const data = await response.json();
      setReports(data.reports || []);
      
      // Calculate stats
      const stats: ReportStats = {
        totalReports: data.reports?.length || 0,
        pendingCount: data.reports?.filter((r: Report) => r.status === 'pending').length || 0,
        reviewingCount: data.reports?.filter((r: Report) => r.status === 'reviewing').length || 0,
        resolvedCount: data.reports?.filter((r: Report) => r.status === 'resolved').length || 0,
        rejectedCount: data.reports?.filter((r: Report) => r.status === 'rejected').length || 0,
        avgPriority: data.reports?.reduce((acc: number, r: Report) => acc + r.priority, 0) / (data.reports?.length || 1) || 0,
        avgFalseReportScore: data.reports?.reduce((acc: number, r: Report) => acc + (r.falseReportScore || 0), 0) / (data.reports?.length || 1) || 0,
        resolutionRate: ((data.reports?.filter((r: Report) => r.status === 'resolved' || r.status === 'rejected').length || 0) / (data.reports?.length || 1)) * 100 || 0
      };
      setStats(stats);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('通報データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const handleAction = async () => {
    if (!selectedReport || !selectedAction) return;

    try {
      const response = await fetch(`/api/reports/${selectedReport._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: selectedAction === 'reject' ? 'rejected' : 'resolved',
          resolution: {
            action: selectedAction,
            notes: actionNotes,
            resolvedBy: 'moderator',
            resolvedAt: new Date().toISOString()
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update report');
      }

      setActionDialog(false);
      setSelectedReport(null);
      setActionNotes('');
      setSelectedAction('');
      fetchReports();
    } catch (err) {
      console.error('Error updating report:', err);
      setError('通報の更新に失敗しました');
    }
  };

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const getPriorityColor = (priority: number) => {
    if (priority >= 7) return 'error';
    if (priority >= 4) return 'warning';
    return 'default';
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 7) return '緊急';
    if (priority >= 4) return '高';
    if (priority >= 2) return '中';
    return '低';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'reviewing': return 'info';
      case 'resolved': return 'success';
      case 'rejected': return 'default';
      default: return 'default';
    }
  };

  const getFalseReportColor = (score?: number) => {
    if (!score) return 'success';
    if (score >= 70) return 'error';
    if (score >= 40) return 'warning';
    return 'success';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ReportProblem color="error" />
        通報管理センター
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 統計情報 */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  総通報数
                </Typography>
                <Typography variant="h4">
                  {stats.totalReports}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  未処理
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {stats.pendingCount}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={stats.pendingCount / Math.max(stats.totalReports, 1) * 100} 
                  color="warning"
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  解決率
                </Typography>
                <Typography variant="h4" color="success.main">
                  {stats.resolutionRate.toFixed(0)}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={stats.resolutionRate} 
                  color="success"
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  平均優先度
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="h4">
                    {stats.avgPriority.toFixed(1)}
                  </Typography>
                  <Chip 
                    size="small" 
                    label={getPriorityLabel(stats.avgPriority)}
                    color={getPriorityColor(stats.avgPriority)}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* フィルター */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>ステータス</InputLabel>
          <Select
            value={filters.status}
            label="ステータス"
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <MenuItem value="">すべて</MenuItem>
            <MenuItem value="pending">未処理</MenuItem>
            <MenuItem value="reviewing">確認中</MenuItem>
            <MenuItem value="resolved">解決済み</MenuItem>
            <MenuItem value="rejected">却下</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>カテゴリ</InputLabel>
          <Select
            value={filters.category}
            label="カテゴリ"
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          >
            <MenuItem value="">すべて</MenuItem>
            <MenuItem value="SPAM">スパム</MenuItem>
            <MenuItem value="HARASSMENT">嫌がらせ</MenuItem>
            <MenuItem value="VIOLENCE">暴力</MenuItem>
            <MenuItem value="HATE_SPEECH">ヘイト</MenuItem>
            <MenuItem value="MISINFORMATION">誤情報</MenuItem>
            <MenuItem value="INAPPROPRIATE">不適切</MenuItem>
            <MenuItem value="COPYRIGHT">著作権</MenuItem>
            <MenuItem value="OTHER">その他</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>並び順</InputLabel>
          <Select
            value={filters.sortBy}
            label="並び順"
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
          >
            <MenuItem value="priority">優先度</MenuItem>
            <MenuItem value="createdAt">作成日</MenuItem>
            <MenuItem value="falseReportScore">虚偽スコア</MenuItem>
          </Select>
        </FormControl>

        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchReports}
        >
          更新
        </Button>
      </Box>

      {/* レポートテーブル */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>対象</TableCell>
              <TableCell>カテゴリ</TableCell>
              <TableCell>優先度</TableCell>
              <TableCell>虚偽スコア</TableCell>
              <TableCell>ステータス</TableCell>
              <TableCell>作成日時</TableCell>
              <TableCell>アクション</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(8)].map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : reports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  通報がありません
                </TableCell>
              </TableRow>
            ) : (
              reports.map((report) => (
                <TableRow key={report._id}>
                  <TableCell>{report._id.slice(-6)}</TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {report.targetType}/{report.targetId.slice(-6)}
                    </Typography>
                  </TableCell>
                  <TableCell>{report.category}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={getPriorityLabel(report.priority)}
                      color={getPriorityColor(report.priority)}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={`${report.falseReportScore || 0}%`}
                      color={getFalseReportColor(report.falseReportScore)}
                      variant={report.falseReportScore && report.falseReportScore > 40 ? "filled" : "outlined"}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={report.status}
                      color={getStatusColor(report.status)}
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(report.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedReport(report);
                        setDetailDialog(true);
                      }}
                    >
                      <Visibility />
                    </IconButton>
                    {report.status === 'pending' && (
                      <>
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => {
                            setSelectedReport(report);
                            setSelectedAction('resolve');
                            setActionDialog(true);
                          }}
                        >
                          <CheckCircle />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            setSelectedReport(report);
                            setSelectedAction('reject');
                            setActionDialog(true);
                          }}
                        >
                          <Cancel />
                        </IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 詳細ダイアログ */}
      <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>通報詳細</DialogTitle>
        <DialogContent>
          {selectedReport && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">ID:</Typography>
                  <Typography variant="body2">{selectedReport._id}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">カテゴリ:</Typography>
                  <Typography variant="body2">{selectedReport.category}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">説明:</Typography>
                  <Typography variant="body2">{selectedReport.description}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">優先度:</Typography>
                  <Chip 
                    label={`${selectedReport.priority} - ${getPriorityLabel(selectedReport.priority)}`}
                    color={getPriorityColor(selectedReport.priority)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">虚偽通報スコア:</Typography>
                  <Chip 
                    label={`${selectedReport.falseReportScore || 0}%`}
                    color={getFalseReportColor(selectedReport.falseReportScore)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">作成日時:</Typography>
                  <Typography variant="body2">
                    {new Date(selectedReport.createdAt).toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>
              
              {selectedReport.metadata.targetContent && (
                <Box mt={2}>
                  <Typography variant="subtitle2">対象コンテンツ:</Typography>
                  <Paper variant="outlined" sx={{ p: 1, mt: 1 }}>
                    <Typography variant="body2">
                      {selectedReport.metadata.targetContent}
                    </Typography>
                  </Paper>
                </Box>
              )}
              
              {selectedReport.resolution && (
                <Box mt={2}>
                  <Typography variant="subtitle2" color="primary">解決情報:</Typography>
                  <Grid container spacing={1} mt={1}>
                    <Grid item xs={12}>
                      <Typography variant="body2">
                        アクション: {selectedReport.resolution.action}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2">
                        解決者: {selectedReport.resolution.resolvedBy}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2">
                        解決日時: {new Date(selectedReport.resolution.resolvedAt).toLocaleString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2">
                        メモ: {selectedReport.resolution.notes}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>閉じる</Button>
        </DialogActions>
      </Dialog>

      {/* アクションダイアログ */}
      <Dialog open={actionDialog} onClose={() => setActionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedAction === 'resolve' ? '通報を解決' : '通報を却下'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="対応メモ"
            value={actionNotes}
            onChange={(e) => setActionNotes(e.target.value)}
            margin="normal"
            placeholder="対応内容や判断理由を記載してください"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog(false)}>キャンセル</Button>
          <Button
            onClick={handleAction}
            color={selectedAction === 'resolve' ? 'success' : 'error'}
            variant="contained"
          >
            {selectedAction === 'resolve' ? '解決' : '却下'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}