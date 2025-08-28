'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
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
  Card,
  CardContent,
  Stack
} from '@mui/material';
import {
  Refresh,
  Visibility,
  CheckCircle,
  Cancel,
  ReportProblem
} from '@mui/icons-material';

interface Report {
  _id: string;
  targetId: string;
  targetType: string;
  reporterId: string;
  reporterName?: string;
  reporterEmail?: string;
  reason?: string;
  description?: string;
  status: string;
  priority?: number;
  createdAt: string;
  updatedAt: string;
}

interface ReportStats {
  total: number;
  pending: number;
  resolved: number;
  rejected?: number;
}

export default function FinalReportsPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [detailDialog, setDetailDialog] = useState(false);
  const [actionDialog, setActionDialog] = useState(false);
  const [actionNotes, setActionNotes] = useState('');
  const [selectedAction, setSelectedAction] = useState<'resolve' | 'reject' | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchReports = useCallback(async () => {
    if (!mounted) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const params = filterStatus !== 'all' ? `?status=${filterStatus}` : '';
      const response = await fetch(`/api/reports${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      const reportsData = data.reports || [];
      
      setReports(reportsData);
      
      // 統計を計算
      const stats: ReportStats = {
        total: reportsData.length,
        pending: reportsData.filter((r: Report) => r.status === 'pending').length,
        resolved: reportsData.filter((r: Report) => r.status === 'resolved').length,
        rejected: reportsData.filter((r: Report) => r.status === 'rejected').length
      };
      setStats(stats);
      
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [mounted, filterStatus]);

  useEffect(() => {
    if (mounted) {
      fetchReports();
    }
  }, [mounted, filterStatus, fetchReports]);

  const handleAction = async () => {
    if (!selectedReport || !selectedAction) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/reports/${selectedReport._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: selectedAction === 'resolve' ? 'resolved' : 'rejected',
          resolution: {
            action: selectedAction,
            notes: actionNotes,
            resolvedBy: 'admin',
            resolvedAt: new Date().toISOString()
          }
        })
      });
      
      if (!response.ok) {
        throw new Error('更新に失敗しました');
      }
      
      setActionDialog(false);
      setActionNotes('');
      setSelectedAction(null);
      setSelectedReport(null);
      fetchReports();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新エラー');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <Container>
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'resolved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return '未処理';
      case 'resolved': return '解決済';
      case 'rejected': return '却下';
      default: return status;
    }
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReportProblem color="error" />
          通報管理システム
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* 統計カード */}
        {stats && (
          <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  総通報数
                </Typography>
                <Typography variant="h4">
                  {stats.total}
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  未処理
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {stats.pending}
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  解決済
                </Typography>
                <Typography variant="h4" color="success.main">
                  {stats.resolved}
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  却下
                </Typography>
                <Typography variant="h4" color="error.main">
                  {stats.rejected || 0}
                </Typography>
              </CardContent>
            </Card>
          </Stack>
        )}

        {/* フィルター */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>ステータス</InputLabel>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              label="ステータス"
            >
              <MenuItem value="all">すべて</MenuItem>
              <MenuItem value="pending">未処理</MenuItem>
              <MenuItem value="resolved">解決済</MenuItem>
              <MenuItem value="rejected">却下</MenuItem>
            </Select>
          </FormControl>
          
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={fetchReports}
            disabled={loading}
          >
            更新
          </Button>
        </Box>

        {/* テーブル */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>対象</TableCell>
                <TableCell>報告者</TableCell>
                <TableCell>理由</TableCell>
                <TableCell>ステータス</TableCell>
                <TableCell>作成日</TableCell>
                <TableCell>アクション</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress size={30} />
                  </TableCell>
                </TableRow>
              ) : reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    データがありません
                  </TableCell>
                </TableRow>
              ) : (
                reports.slice(0, 50).map((report) => (
                  <TableRow key={report._id}>
                    <TableCell>{report._id.slice(-6)}</TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {report.targetType}/{report.targetId.slice(-6)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {report.reporterEmail || report.reporterName || report.reporterId.slice(-6)}
                    </TableCell>
                    <TableCell>
                      {report.reason || report.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(report.status)}
                        color={getStatusColor(report.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(report.createdAt).toLocaleDateString('ja-JP')}
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
        <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>通報詳細</DialogTitle>
          <DialogContent>
            {selectedReport && (
              <Box sx={{ pt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  <strong>ID:</strong> {selectedReport._id}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>対象:</strong> {selectedReport.targetType} - {selectedReport.targetId}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>報告者:</strong> {selectedReport.reporterEmail || selectedReport.reporterId}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>理由:</strong> {selectedReport.reason || '-'}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>説明:</strong> {selectedReport.description || '-'}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>ステータス:</strong> {getStatusLabel(selectedReport.status)}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>作成日:</strong> {new Date(selectedReport.createdAt).toLocaleString('ja-JP')}
                </Typography>
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
              disabled={loading}
            >
              {selectedAction === 'resolve' ? '解決' : '却下'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
}