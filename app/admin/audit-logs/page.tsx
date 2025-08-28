'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Tooltip,
  InputAdornment,
  Tabs,
  Tab
} from '@mui/material';
import {
  Search,
  FilterList,
  Download,
  Archive,
  VerifiedUser,
  Warning,
  Error as ErrorIcon,
  Info,
  Refresh,
  DateRange,
  Security,
  Assessment,
  BugReport,
  CheckCircle,
  Cancel
} from '@mui/icons-material';
// 日付ピッカーは一時的に無効化（代替手段としてテキストフィールドを使用）
// import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
// import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
// import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

interface AuditLog {
  _id: string;
  timestamp: Date;
  eventType: string;
  eventCategory: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  userId: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  resourceType?: string;
  ipAddress?: string;
  userAgent?: string;
  statusCode?: number;
  duration?: number;
  signature?: string;
  isValid?: boolean;
}

interface AuditStats {
  totalEvents: number;
  uniqueUsers: number;
  topEventTypes: { type: string; count: number }[];
  severityDistribution: { severity: string; count: number }[];
  recentAlerts: any[];
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AuditLogsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // フィルタ
  const [filters, setFilters] = useState({
    startDate: null as Date | null,
    endDate: null as Date | null,
    eventType: '',
    eventCategory: '',
    severity: '',
    userId: '',
    ipAddress: ''
  });
  
  // ページネーション
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [total, setTotal] = useState(0);
  
  // ダイアログ
  const [verifyDialog, setVerifyDialog] = useState(false);
  const [archiveDialog, setArchiveDialog] = useState(false);
  const [exportDialog, setExportDialog] = useState(false);
  const [detailDialog, setDetailDialog] = useState<AuditLog | null>(null);
  
  // 検証結果
  const [verificationResult, setVerificationResult] = useState<any>(null);

  useEffect(() => {
    fetchLogs();
  }, [page, rowsPerPage, filters]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        limit: rowsPerPage.toString()
      });
      
      if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
      if (filters.eventType) params.append('eventType', filters.eventType);
      if (filters.eventCategory) params.append('category', filters.eventCategory);
      if (filters.severity) params.append('severity', filters.severity);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.ipAddress) params.append('ipAddress', filters.ipAddress);
      
      const response = await fetch(`/api/admin/audit-logs?${params}`, {
        headers: {
          'x-admin-secret': process.env.NEXT_PUBLIC_ADMIN_SECRET || ''
        }
      });
      
      if (!response.ok) throw new globalThis.Error('Failed to fetch audit logs');
      
      const data = await response.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      
      // 統計データの構造を修正
      if (data.stats) {
        const mappedStats = {
          totalEvents: data.stats.total?.[0]?.count || data.total || 0,
          uniqueUsers: data.stats.byUser?.length || 0,
          topEventTypes: data.stats.byEventType || [],
          severityDistribution: data.stats.bySeverity || [],
          recentAlerts: []
        };
        setStats(mappedStats);
      } else {
        setStats(null);
      }
      
      setAnomalies(data.anomalies || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLogs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
      
      const response = await fetch(`/api/admin/audit-logs/verify?${params}`, {
        headers: {
          'x-admin-secret': process.env.NEXT_PUBLIC_ADMIN_SECRET || ''
        }
      });
      
      if (!response.ok) throw new Error('Verification failed');
      
      const result = await response.json();
      setVerificationResult(result);
      setSuccess(result.status === 'VERIFIED' ? 
        'All logs verified successfully' : 
        'Warning: Tampering detected!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setVerifyDialog(false);
    }
  };

  const handleArchiveLogs = async (daysOld: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/audit-logs/archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': process.env.NEXT_PUBLIC_ADMIN_SECRET || ''
        },
        body: JSON.stringify({ daysOld })
      });
      
      if (!response.ok) throw new Error('Archive failed');
      
      const result = await response.json();
      setSuccess(`Archived ${result.archivedCount} logs`);
      fetchLogs();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setArchiveDialog(false);
    }
  };

  const handleExportLogs = async (format: 'json' | 'csv') => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({ format });
      if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
      
      const response = await fetch(`/api/admin/audit-logs/export?${params}`, {
        headers: {
          'x-admin-secret': process.env.NEXT_PUBLIC_ADMIN_SECRET || ''
        }
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      setSuccess('Logs exported successfully');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setExportDialog(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <ErrorIcon />;
      case 'high': return <Warning />;
      case 'medium': return <Info />;
      case 'low': return <CheckCircle />;
      default: return <Info />;
    }
  };

  return (
    <Container maxWidth="xl">
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            監査ログ管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            システムの全操作履歴を監視・検証
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {verificationResult && (
          <Alert 
            severity={verificationResult.status === 'VERIFIED' ? 'success' : 'error'} 
            sx={{ mb: 2 }}
            onClose={() => setVerificationResult(null)}
          >
            <Typography variant="subtitle2">{verificationResult.message}</Typography>
            {verificationResult.invalid > 0 && (
              <Typography variant="body2">
                無効なログ: {verificationResult.invalid}件
              </Typography>
            )}
            {verificationResult.broken?.length > 0 && (
              <Typography variant="body2">
                チェーン破損: {verificationResult.broken.length}箇所
              </Typography>
            )}
          </Alert>
        )}

        {/* 異常検知アラート */}
        {anomalies.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="subtitle2">異常検知: {anomalies.length}件</Typography>
            {anomalies.slice(0, 3).map((anomaly, idx) => (
              <Typography key={idx} variant="body2">
                • {anomaly.message}
              </Typography>
            ))}
          </Alert>
        )}

        <Paper sx={{ mb: 3 }}>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
            <Tab label="ログ一覧" />
            <Tab label="統計情報" />
            <Tab label="フィルタ設定" />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            {/* アクションバー */}
            <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
              <Button
                startIcon={<Refresh />}
                onClick={fetchLogs}
                disabled={loading}
              >
                更新
              </Button>
              <Button
                startIcon={<VerifiedUser />}
                onClick={() => setVerifyDialog(true)}
                color="primary"
              >
                整合性検証
              </Button>
              <Button
                startIcon={<Archive />}
                onClick={() => setArchiveDialog(true)}
              >
                アーカイブ
              </Button>
              <Button
                startIcon={<Download />}
                onClick={() => setExportDialog(true)}
              >
                エクスポート
              </Button>
            </Box>

            {/* ログテーブル */}
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>時刻</TableCell>
                    <TableCell>重要度</TableCell>
                    <TableCell>イベント</TableCell>
                    <TableCell>ユーザー</TableCell>
                    <TableCell>アクション</TableCell>
                    <TableCell>IPアドレス</TableCell>
                    <TableCell>ステータス</TableCell>
                    <TableCell>操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        ログが見つかりません
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log._id}>
                        <TableCell>
                          {new Date(log.timestamp).toLocaleString('ja-JP')}
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={getSeverityIcon(log.severity)}
                            label={log.severity}
                            color={getSeverityColor(log.severity) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{log.eventType}</TableCell>
                        <TableCell>
                          {log.userEmail || log.userId}
                        </TableCell>
                        <TableCell>
                          <Tooltip title={log.action}>
                            <span>{log.action.substring(0, 30)}...</span>
                          </Tooltip>
                        </TableCell>
                        <TableCell>{log.ipAddress}</TableCell>
                        <TableCell>
                          {log.statusCode && (
                            <Chip
                              label={log.statusCode}
                              color={log.statusCode >= 400 ? 'error' : 'success'}
                              size="small"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => setDetailDialog(log)}
                          >
                            <Info />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              rowsPerPageOptions={[25, 50, 100]}
              component="div"
              count={total}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              labelRowsPerPage="表示件数:"
            />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            {/* 統計情報 */}
            {stats && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 3 }}>
                <Box>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        総イベント数
                      </Typography>
                      <Typography variant="h4">
                        {(stats.totalEvents || 0).toLocaleString()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
                <Box>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        ユニークユーザー
                      </Typography>
                      <Typography variant="h4">
                        {stats.uniqueUsers || 0}
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
                <Box sx={{ gridColumn: { xs: '1', md: 'span 2' } }}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        重要度分布
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {(stats.severityDistribution || []).map((item: any) => (
                          <Chip
                            key={item.severity || item._id}
                            label={`${item.severity || item._id}: ${item.count}`}
                            color={getSeverityColor(item.severity || item._id) as any}
                          />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Box>
              </Box>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            {/* フィルタ設定 */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
              <Box>
                <TextField
                  fullWidth
                  label="開始日時"
                  type="datetime-local"
                  value={filters.startDate ? filters.startDate.toISOString().slice(0, 16) : ''}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value ? new Date(e.target.value) : null })}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
              <Box>
                <TextField
                  fullWidth
                  label="終了日時"
                  type="datetime-local"
                  value={filters.endDate ? filters.endDate.toISOString().slice(0, 16) : ''}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value ? new Date(e.target.value) : null })}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
              <Box>
                <FormControl fullWidth>
                  <InputLabel>イベントタイプ</InputLabel>
                  <Select
                    value={filters.eventType}
                    onChange={(e) => setFilters({ ...filters, eventType: e.target.value })}
                  >
                    <MenuItem value="">全て</MenuItem>
                    <MenuItem value="AUTH_LOGIN_SUCCESS">ログイン成功</MenuItem>
                    <MenuItem value="AUTH_LOGOUT">ログアウト</MenuItem>
                    <MenuItem value="DATA_READ">データ読取</MenuItem>
                    <MenuItem value="DATA_UPDATE">データ更新</MenuItem>
                    <MenuItem value="DATA_DELETE">データ削除</MenuItem>
                    <MenuItem value="SECURITY_ALERT">セキュリティアラート</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box>
                <FormControl fullWidth>
                  <InputLabel>重要度</InputLabel>
                  <Select
                    value={filters.severity}
                    onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                  >
                    <MenuItem value="">全て</MenuItem>
                    <MenuItem value="critical">Critical</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="info">Info</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box>
                <TextField
                  fullWidth
                  label="ユーザーID"
                  value={filters.userId}
                  onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                />
              </Box>
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Button
                  variant="contained"
                  onClick={() => {
                    setPage(0);
                    fetchLogs();
                  }}
                >
                  フィルタ適用
                </Button>
                <Button
                  sx={{ ml: 2 }}
                  onClick={() => {
                    setFilters({
                      startDate: null,
                      endDate: null,
                      eventType: '',
                      eventCategory: '',
                      severity: '',
                      userId: '',
                      ipAddress: ''
                    });
                    setPage(0);
                  }}
                >
                  リセット
                </Button>
              </Box>
            </Box>
          </TabPanel>
        </Paper>

        {/* 検証ダイアログ */}
        <Dialog open={verifyDialog} onClose={() => setVerifyDialog(false)}>
          <DialogTitle>ログ整合性検証</DialogTitle>
          <DialogContent>
            <Typography>
              指定期間のログの改ざんチェックを実行しますか？
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setVerifyDialog(false)}>キャンセル</Button>
            <Button onClick={handleVerifyLogs} variant="contained">
              検証実行
            </Button>
          </DialogActions>
        </Dialog>

        {/* アーカイブダイアログ */}
        <Dialog open={archiveDialog} onClose={() => setArchiveDialog(false)}>
          <DialogTitle>ログのアーカイブ</DialogTitle>
          <DialogContent>
            <Typography>何日以前のログをアーカイブしますか？</Typography>
            <TextField
              type="number"
              defaultValue={90}
              fullWidth
              margin="normal"
              id="archive-days"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setArchiveDialog(false)}>キャンセル</Button>
            <Button
              onClick={() => {
                const days = parseInt((document.getElementById('archive-days') as HTMLInputElement).value);
                handleArchiveLogs(days);
              }}
              variant="contained"
            >
              アーカイブ実行
            </Button>
          </DialogActions>
        </Dialog>

        {/* エクスポートダイアログ */}
        <Dialog open={exportDialog} onClose={() => setExportDialog(false)}>
          <DialogTitle>ログのエクスポート</DialogTitle>
          <DialogContent>
            <Typography>エクスポート形式を選択してください</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setExportDialog(false)}>キャンセル</Button>
            <Button onClick={() => handleExportLogs('csv')}>CSV</Button>
            <Button onClick={() => handleExportLogs('json')} variant="contained">
              JSON
            </Button>
          </DialogActions>
        </Dialog>

        {/* 詳細ダイアログ */}
        <Dialog
          open={!!detailDialog}
          onClose={() => setDetailDialog(null)}
          maxWidth="md"
          fullWidth
        >
          {detailDialog && (
            <>
              <DialogTitle>ログ詳細</DialogTitle>
              <DialogContent>
                <Box sx={{ '& > *': { mb: 2 } }}>
                  <Typography variant="subtitle2">基本情報</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Box>
                      <Typography variant="caption">ID</Typography>
                      <Typography>{detailDialog._id}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption">タイムスタンプ</Typography>
                      <Typography>
                        {new Date(detailDialog.timestamp).toLocaleString('ja-JP')}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption">イベントタイプ</Typography>
                      <Typography>{detailDialog.eventType}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption">カテゴリ</Typography>
                      <Typography>{detailDialog.eventCategory}</Typography>
                    </Box>
                  </Box>

                  <Typography variant="subtitle2" sx={{ mt: 2 }}>ユーザー情報</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Box>
                      <Typography variant="caption">ユーザーID</Typography>
                      <Typography>{detailDialog.userId}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption">メール</Typography>
                      <Typography>{detailDialog.userEmail || '-'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption">ロール</Typography>
                      <Typography>{detailDialog.userRole || '-'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption">IPアドレス</Typography>
                      <Typography>{detailDialog.ipAddress}</Typography>
                    </Box>
                  </Box>

                  <Typography variant="subtitle2" sx={{ mt: 2 }}>アクション詳細</Typography>
                  <Typography>{detailDialog.action}</Typography>

                  {detailDialog.signature && (
                    <>
                      <Typography variant="subtitle2" sx={{ mt: 2 }}>署名</Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
                      >
                        {detailDialog.signature}
                      </Typography>
                    </>
                  )}
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setDetailDialog(null)}>閉じる</Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </Container>
  );
}