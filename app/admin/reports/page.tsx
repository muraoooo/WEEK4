'use client';

import { useState, useEffect, useCallback } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  Chip,
  IconButton,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Stack,
  Tabs,
  Tab,
  LinearProgress,
  Badge,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Container,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  Assignment as AssignmentIcon,
  Flag as FlagIcon,
  Person as PersonIcon,
  Article as ArticleIcon,
  Comment as CommentIcon,
  Refresh as RefreshIcon,
  Speed,
  Timeline,
  TrendingUp,
  Security,
  AutoAwesome,
  Schedule,
  ExpandMore,
  Download,
  FilterList,
  Analytics,
  PriorityHigh,
  Block,
  ErrorOutline,
} from '@mui/icons-material';
import ContentModerationQueue from '@/components/admin/content/ContentModerationQueue';
import BulkContentActions from '@/components/admin/content/BulkContentActions';
import { useRouter } from 'next/navigation';

interface Report {
  _id: string;
  reportType: string;
  targetId: string;
  targetContent?: string;
  reporterEmail: string;
  reporterName?: string;
  reason: string;
  reasonDetails?: string;
  status: string;
  priority: string;
  assignedTo?: string;
  reviewedBy?: string;
  resolution?: any;
  createdAt: string;
  updatedAt: string;
}

interface ReportStats {
  pending: number;
  reviewing: number;
  resolved: number;
  total: number;
}

export default function ReportsPage() {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState(0);
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<ReportStats>({
    pending: 0,
    reviewing: 0,
    resolved: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalReports, setTotalReports] = useState(0);
  
  // Enhanced analytics data
  const [analyticsData, setAnalyticsData] = useState({
    trendData: [] as Array<{ date: string; reports: number; resolved: number; pending: number }>,
    categoryData: [] as Array<{ category: string; count: number; severity: number }>,
    moderatorPerformance: [] as Array<{ moderator: string; processed: number; accuracy: number }>,
    responseTime: {
      average: 0,
      median: 0,
      p95: 0,
    },
    escalationRate: 0,
    automationRate: 0,
  });
  
  // フィルター
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  
  // Advanced features
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'timeline'>('table');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [bulkActionsOpen, setBulkActionsOpen] = useState(false);
  
  // ダイアログ
  const [quickActionDialog, setQuickActionDialog] = useState<{
    open: boolean;
    report: Report | null;
    action: string;
  }>({ open: false, report: null, action: '' });
  const [actionNotes, setActionNotes] = useState('');

  // Mock moderation queue data
  const [moderationItems, setModerationItems] = useState([
    {
      id: '1',
      type: 'post' as const,
      content: {
        id: 'post_1',
        text: 'これは問題のある投稿内容の例です。不適切な言語が含まれている可能性があります。',
        author: {
          id: 'user_1',
          name: '匿名ユーザー',
          reputation: 65,
        },
        metadata: {
          createdAt: new Date().toISOString(),
          platform: 'web',
        },
      },
      aiAnalysis: {
        riskScore: 0.85,
        categories: [
          { type: 'toxic_language', confidence: 0.92, severity: 'high' as const },
          { type: 'harassment', confidence: 0.78, severity: 'medium' as const },
        ],
        sentiment: { score: -0.8, label: 'negative' as const },
        language: { detected: 'ja', confidence: 0.99 },
        flags: ['toxic_language', 'harassment'],
      },
      reports: [
        { id: 'report_1', reporterId: 'user_2', reason: 'inappropriate_content', timestamp: new Date().toISOString() }
      ],
      priority: 'high' as const,
      status: 'pending' as const,
    },
  ]);

  // Mock bulk actions
  const bulkActions = [
    {
      id: 'approve_all',
      name: '一括承認',
      description: '選択したアイテムをすべて承認します',
      icon: <CheckCircleIcon />,
      category: 'moderation' as const,
      requiresConfirmation: true,
      parameters: [
        {
          name: 'reason',
          type: 'text' as const,
          label: '承認理由',
          required: true,
        },
      ],
    },
    {
      id: 'reject_all',
      name: '一括却下',
      description: '選択したアイテムをすべて却下します',
      icon: <CancelIcon />,
      category: 'moderation' as const,
      requiresConfirmation: true,
      parameters: [
        {
          name: 'reason',
          type: 'text' as const,
          label: '却下理由',
          required: true,
        },
      ],
    },
    {
      id: 'categorize',
      name: 'カテゴリ設定',
      description: 'コンテンツのカテゴリを一括設定します',
      icon: <AssignmentIcon />,
      category: 'content' as const,
      requiresConfirmation: false,
      parameters: [
        {
          name: 'category',
          type: 'select' as const,
          label: 'カテゴリ',
          options: ['一般', 'ニュース', '議論', '質問', 'お知らせ'],
          required: true,
        },
      ],
    },
  ];

  useEffect(() => {
    fetchReports();
  }, [page, rowsPerPage, statusFilter, priorityFilter, typeFilter]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
        ...(statusFilter && { status: statusFilter }),
        ...(priorityFilter && { priority: priorityFilter }),
        ...(typeFilter && { type: typeFilter })
      });

      const response = await fetch(`/api/admin/reports?${params}`, {
        headers: {
          'x-admin-secret': process.env.NEXT_PUBLIC_ADMIN_SECRET_KEY || 'admin-development-secret-key'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setReports(data.reports);
        setTotalReports(data.total);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = async () => {
    if (!quickActionDialog.report) return;

    try {
      const response = await fetch('/api/admin/reports', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': process.env.NEXT_PUBLIC_ADMIN_SECRET_KEY || 'admin-development-secret-key'
        },
        body: JSON.stringify({
          reportId: quickActionDialog.report._id,
          action: quickActionDialog.action,
          adminId: 'admin-user', // 実際の実装では認証済みの管理者IDを使用
          notes: actionNotes,
          ...(quickActionDialog.action === 'approve' && {
            resolutionAction: 'warning_issued'
          })
        })
      });

      if (response.ok) {
        fetchReports();
        setQuickActionDialog({ open: false, report: null, action: '' });
        setActionNotes('');
      }
    } catch (error) {
      console.error('Error performing action:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'reviewing': return 'info';
      case 'approved': return 'success';
      case 'rejected': return 'default';
      case 'resolved': return 'success';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getReasonLabel = (reason: string) => {
    const reasonMap: { [key: string]: string } = {
      spam: 'スパム',
      harassment: 'ハラスメント',
      inappropriate_content: '不適切なコンテンツ',
      hate_speech: 'ヘイトスピーチ',
      violence: '暴力的な内容',
      misinformation: '誤情報',
      copyright: '著作権侵害',
      other: 'その他'
    };
    return reasonMap[reason] || reason;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'post': return <ArticleIcon />;
      case 'user': return <PersonIcon />;
      case 'comment': return <CommentIcon />;
      default: return <FlagIcon />;
    }
  };

  // Mock handlers for the new components
  const handleModerationAction = useCallback(async (itemId: string, action: string, notes?: string) => {
    console.log('Moderation action:', { itemId, action, notes });
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 1000));
  }, []);

  const handleBulkModerationAction = useCallback(async (itemIds: string[], action: string) => {
    console.log('Bulk moderation action:', { itemIds, action });
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 1000));
  }, []);

  const handleModerationAssign = useCallback(async (itemId: string, assigneeId: string) => {
    console.log('Assign moderation:', { itemId, assigneeId });
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 1000));
  }, []);

  const handleBulkAction = useCallback(async (actionId: string, parameters: any) => {
    console.log('Execute bulk action:', { actionId, parameters });
    // Mock implementation - return job ID
    await new Promise(resolve => setTimeout(resolve, 1000));
    return `job_${Date.now()}`;
  }, []);

  const handleCancelJob = useCallback(async (jobId: string) => {
    console.log('Cancel job:', jobId);
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 500));
  }, []);

  const handleExportReports = async () => {
    try {
      const params = new URLSearchParams({
        ...(statusFilter && { status: statusFilter }),
        ...(priorityFilter && { priority: priorityFilter }),
        ...(typeFilter && { type: typeFilter }),
        ...(dateFilter && { dateFilter })
      });

      const response = await fetch(`/api/admin/reports/export?${params}`, {
        method: 'GET',
        headers: {
          'x-admin-secret': process.env.NEXT_PUBLIC_ADMIN_SECRET_KEY || 'admin-development-secret-key'
        }
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reports-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting reports:', error);
    }
  };

  if (loading && reports.length === 0) {
    return <LoadingSpinner message="通報データを読み込んでいます..." fullHeight />;
  }

  const TabPanel = ({ children, value, index }: { children: React.ReactNode; value: number; index: number }) => (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          通報・モデレーション管理
        </Typography>
        <Stack direction="row" spacing={2}>
          <Chip
            icon={<AutoAwesome />}
            label={`自動処理率: ${analyticsData.automationRate}%`}
            color="info"
            variant="outlined"
          />
          <Chip
            icon={<Speed />}
            label={`平均処理時間: ${analyticsData.responseTime.average}分`}
            color={analyticsData.responseTime.average < 60 ? 'success' : 'warning'}
            variant="outlined"
          />
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchReports}
            disabled={loading}
          >
            更新
          </Button>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={handleExportReports}
          >
            レポート出力
          </Button>
        </Stack>
      </Box>

      {/* Enhanced Statistics */}
      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 4 }}>
        <Box>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Badge badgeContent={stats.pending} color="warning">
                  <FlagIcon color="warning" />
                </Badge>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: 'warning.main' }}>
                    {stats.pending}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    未処理通報
                  </Typography>
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={(stats.pending / stats.total) * 100}
                color="warning"
                sx={{ height: 4, borderRadius: 2 }}
              />
            </CardContent>
          </Card>
        </Box>

        <Box>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Schedule color="info" />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: 'info.main' }}>
                    {stats.reviewing}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    レビュー中
                  </Typography>
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={(stats.reviewing / stats.total) * 100}
                color="info"
                sx={{ height: 4, borderRadius: 2 }}
              />
            </CardContent>
          </Card>
        </Box>

        <Box>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <CheckCircleIcon color="success" />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: 'success.main' }}>
                    {stats.resolved}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    解決済み
                  </Typography>
                </Box>
              </Box>
              <Box display="flex" alignItems="center" gap={1} mt={1}>
                <TrendingUp fontSize="small" color="success" />
                <Typography variant="caption" color="success.main">
                  +12% from last week
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Analytics color="primary" />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {stats.total}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    総通報数
                  </Typography>
                </Box>
              </Box>
              <Chip
                label={`エスカレーション率: ${analyticsData.escalationRate}%`}
                size="small"
                color={analyticsData.escalationRate < 5 ? 'success' : 'warning'}
              />
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Tab Navigation */}
      <Card sx={{ mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={(event, newValue) => setCurrentTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            icon={<FlagIcon />} 
            label="通報管理" 
            iconPosition="start"
          />
          <Tab 
            icon={<Security />} 
            label="モデレーションキュー" 
            iconPosition="start"
          />
          <Tab 
            icon={<AutoAwesome />} 
            label="一括操作" 
            iconPosition="start"
          />
        </Tabs>

        {/* Tab Content */}
        <TabPanel value={currentTab} index={0}>
          {/* Original Reports Table */}
          <Box>
            {/* Enhanced Filters */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FilterList />
                  フィルター・検索
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
                  <Box>
                    <FormControl fullWidth size="small">
                      <InputLabel>ステータス</InputLabel>
                      <Select
                        value={statusFilter}
                        label="ステータス"
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <MenuItem value="">すべて</MenuItem>
                        <MenuItem value="pending">未処理</MenuItem>
                        <MenuItem value="reviewing">レビュー中</MenuItem>
                        <MenuItem value="approved">承認済み</MenuItem>
                        <MenuItem value="rejected">却下済み</MenuItem>
                        <MenuItem value="resolved">解決済み</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <Box>
                    <FormControl fullWidth size="small">
                      <InputLabel>優先度</InputLabel>
                      <Select
                        value={priorityFilter}
                        label="優先度"
                        onChange={(e) => setPriorityFilter(e.target.value)}
                      >
                        <MenuItem value="">すべて</MenuItem>
                        <MenuItem value="critical">緊急</MenuItem>
                        <MenuItem value="high">高</MenuItem>
                        <MenuItem value="medium">中</MenuItem>
                        <MenuItem value="low">低</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <Box>
                    <FormControl fullWidth size="small">
                      <InputLabel>種類</InputLabel>
                      <Select
                        value={typeFilter}
                        label="種類"
                        onChange={(e) => setTypeFilter(e.target.value)}
                      >
                        <MenuItem value="">すべて</MenuItem>
                        <MenuItem value="post">投稿</MenuItem>
                        <MenuItem value="user">ユーザー</MenuItem>
                        <MenuItem value="comment">コメント</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <Box>
                    <FormControl fullWidth size="small">
                      <InputLabel>期間</InputLabel>
                      <Select
                        value={dateFilter}
                        label="期間"
                        onChange={(e) => setDateFilter(e.target.value)}
                      >
                        <MenuItem value="">すべて</MenuItem>
                        <MenuItem value="today">今日</MenuItem>
                        <MenuItem value="week">今週</MenuItem>
                        <MenuItem value="month">今月</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <Box>
                    <FormControl fullWidth size="small">
                      <InputLabel>担当者</InputLabel>
                      <Select
                        value={assigneeFilter}
                        label="担当者"
                        onChange={(e) => setAssigneeFilter(e.target.value)}
                      >
                        <MenuItem value="">すべて</MenuItem>
                        <MenuItem value="admin1">管理者A</MenuItem>
                        <MenuItem value="admin2">管理者B</MenuItem>
                        <MenuItem value="unassigned">未割り当て</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* Reports Table */}
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <input type="checkbox" />
                    </TableCell>
                    <TableCell>種類</TableCell>
                    <TableCell>理由</TableCell>
                    <TableCell>通報者</TableCell>
                    <TableCell>担当者</TableCell>
                    <TableCell>ステータス</TableCell>
                    <TableCell>優先度</TableCell>
                    <TableCell>作成日時</TableCell>
                    <TableCell align="center">アクション</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report._id} hover>
                      <TableCell padding="checkbox">
                        <input
                          type="checkbox"
                          checked={selectedReports.includes(report._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedReports([...selectedReports, report._id]);
                            } else {
                              setSelectedReports(selectedReports.filter(id => id !== report._id));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getTypeIcon(report.reportType)}
                          <Typography variant="body2">
                            {report.reportType === 'post' && '投稿'}
                            {report.reportType === 'user' && 'ユーザー'}
                            {report.reportType === 'comment' && 'コメント'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {getReasonLabel(report.reason)}
                          </Typography>
                          {report.reasonDetails && (
                            <Typography variant="caption" color="textSecondary">
                              {report.reasonDetails.substring(0, 50)}...
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Avatar sx={{ width: 24, height: 24 }}>
                            <PersonIcon fontSize="small" />
                          </Avatar>
                          <Box>
                            <Typography variant="body2">
                              {report.reporterName || 'Unknown'}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {report.reporterEmail}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {report.assignedTo ? (
                          <Chip label={report.assignedTo} size="small" />
                        ) : (
                          <Typography variant="caption" color="textSecondary">
                            未割り当て
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={report.status}
                          color={getStatusColor(report.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={report.priority}
                          color={getPriorityColor(report.priority) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(report.createdAt).toLocaleDateString('ja-JP')}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {new Date(report.createdAt).toLocaleTimeString('ja-JP')}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1}>
                          <Tooltip title="詳細表示">
                            <IconButton
                              size="small"
                              onClick={() => router.push(`/admin/reports/${report._id}`)}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {report.status === 'pending' && (
                            <>
                              <Tooltip title="承認">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => setQuickActionDialog({
                                    open: true,
                                    report,
                                    action: 'approve'
                                  })}
                                >
                                  <CheckCircleIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="却下">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => setQuickActionDialog({
                                    open: true,
                                    report,
                                    action: 'reject'
                                  })}
                                >
                                  <CancelIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                count={totalReports}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[25, 50, 100]}
                labelRowsPerPage="表示件数:"
              />
            </TableContainer>
          </Box>
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <ContentModerationQueue
            items={moderationItems}
            onAction={handleModerationAction}
            onBulkAction={handleBulkModerationAction}
            onAssign={handleModerationAssign}
            loading={loading}
          />
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <BulkContentActions
            selectedItems={selectedReports}
            availableActions={bulkActions}
            onExecuteAction={handleBulkAction}
            onCancelJob={handleCancelJob}
            currentJobs={[]} // Mock empty jobs array
          />
        </TabPanel>

      </Card>

      {/* Quick Action Dialog - Enhanced */}
      <Dialog
        open={quickActionDialog.open}
        onClose={() => setQuickActionDialog({ open: false, report: null, action: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            {quickActionDialog.action === 'approve' ? (
              <>
                <CheckCircleIcon color="success" />
                通報を承認
              </>
            ) : (
              <>
                <CancelIcon color="error" />
                通報を却下
              </>
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3}>
            <Alert severity={quickActionDialog.action === 'approve' ? 'warning' : 'info'}>
              {quickActionDialog.action === 'approve' && 
                '承認すると、対象コンテンツが制限され、投稿者に警告が発行されます。'}
              {quickActionDialog.action === 'reject' && 
                '却下すると、通報は無効とマークされ、コンテンツは公開されたままになります。'}
            </Alert>
            
            {quickActionDialog.report && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  通報詳細
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                  <Typography variant="body2">
                    <strong>理由:</strong> {getReasonLabel(quickActionDialog.report.reason)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>詳細:</strong> {quickActionDialog.report.reasonDetails || '詳細なし'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>通報者:</strong> {quickActionDialog.report.reporterName}
                  </Typography>
                </Paper>
              </Box>
            )}

            <TextField
              fullWidth
              label="処理メモ・理由"
              multiline
              rows={4}
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              placeholder="処理の理由や詳細を記入してください（必須）"
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setQuickActionDialog({ open: false, report: null, action: '' })}
          >
            キャンセル
          </Button>
          <Button
            variant="contained"
            color={quickActionDialog.action === 'approve' ? 'success' : 'error'}
            onClick={handleQuickAction}
            disabled={!actionNotes.trim()}
            startIcon={quickActionDialog.action === 'approve' ? <CheckCircleIcon /> : <CancelIcon />}
          >
            {quickActionDialog.action === 'approve' ? '承認して実行' : '却下して終了'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}