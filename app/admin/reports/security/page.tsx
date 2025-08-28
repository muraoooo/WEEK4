'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Avatar,
} from '@mui/material';
import {
  Security,
  Warning,
  Error as ErrorIcon,
  CheckCircle,
  Block,
  VpnKey,
  PersonOff,
  TrendingUp,
  TrendingDown,
  Refresh,
  Shield,
  Report,
} from '@mui/icons-material';

interface SecurityData {
  overview: {
    securityScore: number;
    securityLevel: string;
    totalAlerts: number;
    activeThreats: number;
  };
  loginSecurity: {
    total: number;
    failed: number;
    failureRate: string;
    todayAttempts: number;
    todayFailed: number;
    suspiciousIPs: Array<{
      ip: string;
      attempts: number;
    }>;
  };
  tokenSecurity: {
    blacklisted: number;
    recentBlacklisted: number;
    activeSessions: number;
  };
  riskUsers: Array<{
    email: string;
    failedAttempts: number;
    riskLevel: string;
  }>;
  recentEvents: Array<{
    id: string;
    type: string;
    severity: string;
    message: string;
    timestamp: string;
    details: any;
  }>;
  recommendations: string[];
  lastUpdated: string;
}

export default function SecurityReportPage() {
  const [data, setData] = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/security', { headers: { 'x-admin-secret': 'admin-development-secret-key' } });
      
      if (!response.ok) {
        throw new Error('Failed to fetch security data');
      }
      
      const securityData = await response.json();
      setData(securityData);
      setError(null);
    } catch (err) {
      console.error('Security data fetch error:', err);
      setError('セキュリティデータの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
    const interval = setInterval(fetchSecurityData, 30000); // 30秒ごとに更新
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error && !data) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!data) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'success':
        return 'success';
      default:
        return 'info';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <Warning color="warning" />;
      case 'success':
        return <CheckCircle color="success" />;
      default:
        return <Security color="info" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ja-JP');
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          セキュリティレポート
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchSecurityData}
          disabled={loading}
        >
          更新
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* セキュリティスコアカード */}
      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 4 }}>
        <Box>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h6" gutterBottom>
                    セキュリティスコア
                  </Typography>
                  <Box display="flex" alignItems="baseline" gap={2}>
                    <Typography variant="h2" color={getScoreColor(data.overview.securityScore)}>
                      {data.overview.securityScore}
                    </Typography>
                    <Typography variant="h5" color="text.secondary">
                      / 100
                    </Typography>
                  </Box>
                  <Chip
                    label={
                      data.overview.securityLevel === 'high' ? '高セキュリティ' :
                      data.overview.securityLevel === 'medium' ? '中セキュリティ' : '低セキュリティ'
                    }
                    color={getScoreColor(data.overview.securityScore) as any}
                    sx={{ mt: 1 }}
                  />
                </Box>
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: getScoreColor(data.overview.securityScore) + '.main'
                  }}
                >
                  <Shield fontSize="large" />
                </Avatar>
              </Box>
              <LinearProgress
                variant="determinate"
                value={data.overview.securityScore}
                color={getScoreColor(data.overview.securityScore) as any}
                sx={{ mt: 2, height: 8, borderRadius: 4 }}
              />
            </CardContent>
          </Card>
        </Box>

        <Box>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Box>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    アクティブな脅威
                  </Typography>
                  <Typography variant="h4" color="error">
                    {data.overview.activeThreats}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            <Box>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    総アラート数
                  </Typography>
                  <Typography variant="h4" color="warning">
                    {data.overview.totalAlerts}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            <Box>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    ログイン失敗率
                  </Typography>
                  <Typography variant="h4">
                    {data.loginSecurity.failureRate}%
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            <Box>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    ブロック済みトークン
                  </Typography>
                  <Typography variant="h4">
                    {data.tokenSecurity.blacklisted}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* 推奨事項 */}
      {data.recommendations.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            セキュリティ推奨事項
          </Typography>
          <List>
            {data.recommendations.map((rec, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  <Warning color="warning" />
                </ListItemIcon>
                <ListItemText primary={rec} />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* 不審なIPアドレス */}
      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 3 }}>
        <Box>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              不審なIPアドレス
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>IPアドレス</TableCell>
                    <TableCell align="right">失敗回数</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.loginSecurity.suspiciousIPs.slice(0, 5).map((ip) => (
                    <TableRow key={ip.ip}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Block fontSize="small" color="error" />
                          {ip.ip || 'Unknown'}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={ip.attempts}
                          size="small"
                          color={ip.attempts > 10 ? 'error' : 'warning'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.loginSecurity.suspiciousIPs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} align="center">
                        <Typography variant="body2" color="text.secondary">
                          不審なアクセスは検出されていません
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>

        <Box>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              リスクユーザー
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ユーザー</TableCell>
                    <TableCell align="right">失敗回数</TableCell>
                    <TableCell align="center">リスク</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.riskUsers.slice(0, 5).map((user) => (
                    <TableRow key={user.email}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <PersonOff fontSize="small" />
                          <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                            {user.email}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">{user.failedAttempts}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={
                            user.riskLevel === 'high' ? '高' :
                            user.riskLevel === 'medium' ? '中' : '低'
                          }
                          size="small"
                          color={
                            user.riskLevel === 'high' ? 'error' :
                            user.riskLevel === 'medium' ? 'warning' : 'success'
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.riskUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        <Typography variant="body2" color="text.secondary">
                          リスクユーザーは検出されていません
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      </Box>

      {/* 最近のセキュリティイベント */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          最近のセキュリティイベント
        </Typography>
        <List>
          {data.recentEvents.slice(0, 10).map((event) => (
            <ListItem key={event.id} divider>
              <ListItemIcon>
                {getSeverityIcon(event.severity)}
              </ListItemIcon>
              <ListItemText
                primary={event.message}
                secondary={
                  <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="caption">
                      {formatTimestamp(event.timestamp)}
                    </Typography>
                    <Chip
                      label={event.type}
                      size="small"
                      variant="outlined"
                    />
                    {event.details?.ip && (
                      <Typography variant="caption" color="text.secondary">
                        IP: {event.details.ip}
                      </Typography>
                    )}
                  </Box>
                }
              />
            </ListItem>
          ))}
          {data.recentEvents.length === 0 && (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
              最近のセキュリティイベントはありません
            </Typography>
          )}
        </List>
      </Paper>

      {/* 更新時刻 */}
      <Box mt={3} textAlign="center">
        <Typography variant="caption" color="text.secondary">
          最終更新: {formatTimestamp(data.lastUpdated)}
        </Typography>
      </Box>
    </Container>
  );
}