'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
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
  Button,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  LinearProgress,
  Badge,
  Tooltip,
  Stack,
  Tabs,
  Tab,
  Avatar,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  ReportProblem,
  CheckCircle,
  Cancel,
  Warning,
  Info,
  Refresh,
  FilterList,
  Assessment,
  TrendingUp,
  Person,
  Flag,
  Visibility,
  Edit,
  Delete,
  Archive,
  Send,
  Block,
  ThumbUp,
  ThumbDown,
  AccessTime,
  Security
} from '@mui/icons-material';
import { useAdminAuth } from '@/hooks/useAdminAuth';

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

interface Stats {
  totalReports: number;
  pendingCount: number;
  reviewingCount: number;
  resolvedCount: number;
  rejectedCount: number;
  avgPriority: number;
  avgFalseReportScore: number;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const CATEGORY_LABELS: { [key: string]: string } = {
  'SPAM': 'スパム・広告',
  'HARASSMENT': 'いじめ・嫌がらせ',
  'VIOLENCE': '暴力的内容',
  'HATE_SPEECH': 'ヘイトスピーチ',
  'MISINFORMATION': '誤情報・デマ',
  'INAPPROPRIATE': '不適切な内容',
  'COPYRIGHT': '著作権侵害',
  'OTHER': 'その他'
};

const STATUS_LABELS: { [key: string]: string } = {
  'pending': '未処理',
  'reviewing': '確認中',
  'resolved': '解決済み',
  'rejected': '却下'
};

const ACTION_OPTIONS = [
  { value: 'warn_user', label: 'ユーザーに警告' },
  { value: 'delete_content', label: 'コンテンツを削除' },
  { value: 'suspend_user', label: 'ユーザーを停止' },
  { value: 'ban_user', label: 'ユーザーをBAN' },
  { value: 'hide_content', label: 'コンテンツを非表示' },
  { value: 'no_action', label: '対応不要' },
  { value: 'false_report', label: '虚偽通報として記録' }
];

export default function EnhancedReportsPage() {
  const { adminToken } = useAdminAuth();
  const [tabValue, setTabValue] = useState(0);
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // ページネーション
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);
  
  // フィルタ
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState('priority');
  
  // 選択した通報
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  
  // 詳細ダイアログ
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const fetchReports = async () => {
    if (!adminToken) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
        sortBy
      });
      
      if (statusFilter) params.append('status', statusFilter);
      if (categoryFilter) params.append('category', categoryFilter);
      
      const response = await fetch(`/api/reports?${params}`, {
        headers: {
          'x-admin-secret': adminToken
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch reports');
      
      const data = await response.json();
      setReports(data.reports || []);
      setStats(data.stats || null);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminToken) {
      fetchReports();
    }
  }, [page, rowsPerPage, statusFilter, categoryFilter, sortBy, adminToken]);

  const handleTakeAction = async () => {
    if (!selectedReport || !selectedAction) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/reports/${selectedReport._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminToken
        },
        body: JSON.stringify({
          action: selectedAction,
          notes: actionNotes,
          status: selectedAction === 'false_report' ? 'rejected' : 'resolved'
        })
      });
      
      if (!response.ok) throw new Error('Failed to update report');
      
      setActionDialogOpen(false);
      setSelectedAction('');
      setActionNotes('');
      fetchReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to take action');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: number): "error" | "warning" | "default" => {
    if (priority >= 7) return 'error';
    if (priority >= 4) return 'warning';
    return 'default';
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 7) return '緊急';
    if (priority >= 4) return '高';
    return '通常';
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

  const getFalseReportBadge = (score?: number) => {
    if (!score) return null;
    if (score >= 70) {
      return <Chip size="small" label="虚偽の可能性高" color="error" />;
    }
    if (score >= 40) {
      return <Chip size="small" label="要注意" color="warning" />;
    }
    return null;
  };

  return (
    <Container maxWidth="xl">
      <Box mb={3}>
        <Typography variant="h4" gutterBottom>
          通報管理システム
        </Typography>
        <Typography variant="body2" color="text.secondary">
          ユーザーからの通報を管理し、適切な対応を行います
        </Typography>
      </Box>

      {/* 統計カード */}
      {stats && (
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      総通報数
                    </Typography>
                    <Typography variant="h4">
                      {stats.totalReports}
                    </Typography>
                  </Box>
                  <Flag color="primary" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      未処理
                    </Typography>
                    <Typography variant="h4" color="warning.main">
                      {stats.pendingCount}
                    </Typography>
                  </Box>
                  <Warning color="warning" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      平均優先度
                    </Typography>
                    <Typography variant="h4">
                      {stats.avgPriority.toFixed(1)}
                    </Typography>
                  </Box>
                  <TrendingUp color="info" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      虚偽通報スコア
                    </Typography>
                    <Typography variant="h4">
                      {stats.avgFalseReportScore.toFixed(0)}%
                    </Typography>
                  </Box>
                  <Security color="error" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* フィルタとアクション */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>ステータス</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="ステータス"
              >
                <MenuItem value="">すべて</MenuItem>
                <MenuItem value="pending">未処理</MenuItem>
                <MenuItem value="reviewing">確認中</MenuItem>
                <MenuItem value="resolved">解決済み</MenuItem>
                <MenuItem value="rejected">却下</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>カテゴリ</InputLabel>
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                label="カテゴリ"
              >
                <MenuItem value="">すべて</MenuItem>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <MenuItem key={key} value={key}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>並び順</InputLabel>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                label="並び順"
              >
                <MenuItem value="priority">優先度順</MenuItem>
                <MenuItem value="createdAt">新しい順</MenuItem>
                <MenuItem value="falseReportScore">虚偽スコア順</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={fetchReports}
              fullWidth
            >
              更新
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* メインタブ */}
      <Paper>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab 
            label={
              <Badge badgeContent={stats?.pendingCount} color="error">
                未処理の通報
              </Badge>
            } 
          />
          <Tab label="すべての通報" />
          <Tab label="統計とレポート" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          {/* 未処理の通報テーブル */}
          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>優先度</TableCell>
                    <TableCell>カテゴリ</TableCell>
                    <TableCell>対象</TableCell>
                    <TableCell>説明</TableCell>
                    <TableCell>通報者</TableCell>
                    <TableCell>虚偽スコア</TableCell>
                    <TableCell>ステータス</TableCell>
                    <TableCell>日時</TableCell>
                    <TableCell>アクション</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reports
                    .filter(r => r.status === 'pending')
                    .map((report) => (
                    <TableRow key={report._id}>
                      <TableCell>
                        <Chip
                          size="small"
                          label={`${report.priority} - ${getPriorityLabel(report.priority)}`}
                          color={getPriorityColor(report.priority)}
                        />
                      </TableCell>
                      <TableCell>{CATEGORY_LABELS[report.category]}</TableCell>
                      <TableCell>
                        <Chip 
                          size="small" 
                          label={report.targetType}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Typography variant="body2" noWrap>
                          {report.description || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>{report.reporterId}</TableCell>
                      <TableCell>
                        {getFalseReportBadge(report.falseReportScore)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={STATUS_LABELS[report.status]}
                          color={getStatusColor(report.status) as any}
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(report.createdAt).toLocaleString('ja-JP')}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Tooltip title="詳細を見る">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedReport(report);
                                setDetailDialogOpen(true);
                              }}
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="対応する">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => {
                                setSelectedReport(report);
                                setActionDialogOpen(true);
                              }}
                            >
                              <Edit />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* すべての通報 */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>優先度</TableCell>
                  <TableCell>カテゴリ</TableCell>
                  <TableCell>対象</TableCell>
                  <TableCell>ステータス</TableCell>
                  <TableCell>解決内容</TableCell>
                  <TableCell>日時</TableCell>
                  <TableCell>アクション</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report._id}>
                    <TableCell>
                      <Chip
                        size="small"
                        label={report.priority}
                        color={getPriorityColor(report.priority)}
                      />
                    </TableCell>
                    <TableCell>{CATEGORY_LABELS[report.category]}</TableCell>
                    <TableCell>{report.targetType}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={STATUS_LABELS[report.status]}
                        color={getStatusColor(report.status) as any}
                      />
                    </TableCell>
                    <TableCell>
                      {report.resolution ? (
                        <Typography variant="caption">
                          {report.resolution.action}
                        </Typography>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {new Date(report.createdAt).toLocaleString('ja-JP')}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedReport(report);
                          setDetailDialogOpen(true);
                        }}
                      >
                        <Visibility />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
            />
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {/* 統計とレポート */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  カテゴリ別分布
                </Typography>
                <List>
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
                    const count = reports.filter(r => r.category === key).length;
                    const percentage = total > 0 ? (count / total * 100).toFixed(1) : 0;
                    return (
                      <ListItem key={key}>
                        <ListItemText 
                          primary={label}
                          secondary={`${count}件 (${percentage}%)`}
                        />
                        <LinearProgress 
                          variant="determinate" 
                          value={Number(percentage)} 
                          sx={{ width: '100px', ml: 2 }}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  処理状況
                </Typography>
                {stats && (
                  <List>
                    <ListItem>
                      <ListItemText 
                        primary="解決率"
                        secondary={`${((stats.resolvedCount / stats.totalReports) * 100).toFixed(1)}%`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="却下率"
                        secondary={`${((stats.rejectedCount / stats.totalReports) * 100).toFixed(1)}%`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="平均処理時間"
                        secondary="計測中..."
                      />
                    </ListItem>
                  </List>
                )}
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* アクションダイアログ */}
      <Dialog open={actionDialogOpen} onClose={() => setActionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>通報への対応</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>対応アクション</InputLabel>
            <Select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              label="対応アクション"
            >
              {ACTION_OPTIONS.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="対応メモ"
            value={actionNotes}
            onChange={(e) => setActionNotes(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialogOpen(false)}>キャンセル</Button>
          <Button 
            variant="contained" 
            onClick={handleTakeAction}
            disabled={!selectedAction}
          >
            対応を実行
          </Button>
        </DialogActions>
      </Dialog>

      {/* 詳細ダイアログ */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>通報詳細</DialogTitle>
        <DialogContent>
          {selectedReport && (
            <Box>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">ID</Typography>
                  <Typography>{selectedReport._id}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">優先度</Typography>
                  <Box>
                    <Chip
                      label={`${selectedReport.priority} - ${getPriorityLabel(selectedReport.priority)}`}
                      color={getPriorityColor(selectedReport.priority)}
                    />
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">カテゴリ</Typography>
                  <Typography>{CATEGORY_LABELS[selectedReport.category]}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">ステータス</Typography>
                  <Box>
                    <Chip
                      label={STATUS_LABELS[selectedReport.status]}
                      color={getStatusColor(selectedReport.status) as any}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">説明</Typography>
                  <Paper variant="outlined" sx={{ p: 1, mt: 1 }}>
                    <Typography>{selectedReport.description || '説明なし'}</Typography>
                  </Paper>
                </Grid>
                {selectedReport.metadata.targetContent && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">対象コンテンツ</Typography>
                    <Paper variant="outlined" sx={{ p: 1, mt: 1 }}>
                      <Typography>{selectedReport.metadata.targetContent}</Typography>
                    </Paper>
                  </Grid>
                )}
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">通報者ID</Typography>
                  <Typography>{selectedReport.reporterId}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">虚偽通報スコア</Typography>
                  <Typography>{selectedReport.falseReportScore}%</Typography>
                  {getFalseReportBadge(selectedReport.falseReportScore)}
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">IPアドレス</Typography>
                  <Typography>{selectedReport.metadata.ipAddress}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">通報日時</Typography>
                  <Typography>{new Date(selectedReport.createdAt).toLocaleString('ja-JP')}</Typography>
                </Grid>
                {selectedReport.resolution && (
                  <>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="h6">解決情報</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">対応アクション</Typography>
                      <Typography>{selectedReport.resolution.action}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">対応者</Typography>
                      <Typography>{selectedReport.resolution.resolvedBy}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">対応メモ</Typography>
                      <Paper variant="outlined" sx={{ p: 1, mt: 1 }}>
                        <Typography>{selectedReport.resolution.notes}</Typography>
                      </Paper>
                    </Grid>
                  </>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>閉じる</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}