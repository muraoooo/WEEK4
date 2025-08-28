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
  Tabs,
  Tab,
  CircularProgress,
  Skeleton
} from '@mui/material';
import {
  Visibility,
  CheckCircle,
  Cancel,
  Warning,
  Assessment,
  Refresh,
  FilterList,
  Search
} from '@mui/icons-material';
import { useSecureAdminAuth } from '@/hooks/useSecureAdminAuth';

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
}

export default function SecureReportsManagement() {
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [actionDialog, setActionDialog] = useState(false);
  const [detailDialog, setDetailDialog] = useState(false);
  const [actionNotes, setActionNotes] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    sortBy: 'priority'
  });

  const { secureFetch, getAuthHeaders, error: authError } = useSecureAdminAuth();

  const fetchReports = useCallback(async () => {
    if (authError) {
      setError(authError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.category) params.append('category', filters.category);
      params.append('sortBy', filters.sortBy);

      const response = await secureFetch(`/api/reports?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }

      const data = await response.json();
      setReports(data.reports || []);
      setStats(data.stats || null);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('通報データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [filters, secureFetch, authError]);

  const handleAction = async () => {
    if (!selectedReport || !selectedAction) return;

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/reports/${selectedReport._id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          status: selectedAction === 'reject' ? 'rejected' : 'resolved',
          resolution: {
            action: selectedAction,
            notes: actionNotes,
            resolvedBy: 'admin',
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
    if (!score) return 'default';
    if (score >= 70) return 'error';
    if (score >= 40) return 'warning';
    return 'success';
  };

  if (authError) {
    return (
      <Box p={3}>
        <Alert severity="error">
          認証エラー: {authError}
          <br />
          管理者としてログインしてください。
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        通報管理（セキュア版）
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 統計情報 */}
      {stats && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          <Card sx={{ flex: '1 1 250px' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                総通報数
              </Typography>
              <Typography variant="h4">
                {stats.totalReports}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: '1 1 250px' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                未処理
              </Typography>
              <Typography variant="h4" color="warning.main">
                {stats.pendingCount}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: '1 1 250px' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                平均優先度
              </Typography>
              <Typography variant="h4">
                {stats.avgPriority.toFixed(1)}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: '1 1 250px' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                虚偽通報スコア
              </Typography>
              <Typography variant="h4">
                {stats.avgFalseReportScore.toFixed(0)}
              </Typography>
            </CardContent>
          </Card>
        </Box>
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
                      label={report.falseReportScore || 0}
                      color={getFalseReportColor(report.falseReportScore)}
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
              <Typography variant="subtitle2">ID: {selectedReport._id}</Typography>
              <Typography variant="body2">カテゴリ: {selectedReport.category}</Typography>
              <Typography variant="body2">説明: {selectedReport.description}</Typography>
              <Typography variant="body2">
                作成日時: {new Date(selectedReport.createdAt).toLocaleString()}
              </Typography>
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
                  <Typography variant="subtitle2">解決情報:</Typography>
                  <Typography variant="body2">
                    アクション: {selectedReport.resolution.action}
                  </Typography>
                  <Typography variant="body2">
                    解決者: {selectedReport.resolution.resolvedBy}
                  </Typography>
                  <Typography variant="body2">
                    メモ: {selectedReport.resolution.notes}
                  </Typography>
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