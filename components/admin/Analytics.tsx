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
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Visibility,
  People,
  AccessTime,
  TrendingUp,
  Devices,
  Language,
  Refresh,
  Info,
  Computer,
  PhoneAndroid,
  Tablet,
  DeviceUnknown,
  Schedule,
  CalendarToday,
  DateRange,
  Security,
  PrivacyTip,
} from '@mui/icons-material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

interface AnalyticsData {
  period: string;
  startDate: string;
  endDate: string;
  summary: {
    totalPageViews: number;
    uniqueVisitors: number;
    avgSessionDuration: number;
    bounceRate: number;
  };
  hourlyStats: Array<{
    hour: number;
    pageViews: number;
    uniqueVisitors: number;
  }>;
  deviceStats: Array<{
    deviceType: string;
    count: number;
  }>;
  topPages: Array<{
    pagePath: string;
    pageViews: number;
    uniqueVisitors: number;
    avgLoadTime: number;
  }>;
  referrerStats: Array<{
    referrer: string;
    count: number;
  }>;
}

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/track?period=${period}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      
      const analyticsData = await response.json();
      setData(analyticsData);
      setError(null);
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError('アクセス解析データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchAnalytics, 30000); // 30秒ごとに更新
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [period, autoRefresh]);

  const handlePeriodChange = (event: React.MouseEvent<HTMLElement>, newPeriod: 'day' | 'week' | 'month') => {
    if (newPeriod !== null) {
      setPeriod(newPeriod);
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}時間${minutes % 60}分`;
    }
    return `${minutes}分`;
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'desktop':
        return <Computer />;
      case 'mobile':
        return <PhoneAndroid />;
      case 'tablet':
        return <Tablet />;
      default:
        return <DeviceUnknown />;
    }
  };

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

  // グラフデータの準備
  const hourlyChartData = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}時`),
    datasets: [
      {
        label: 'ページビュー',
        data: Array.from({ length: 24 }, (_, hour) => {
          const stat = data.hourlyStats.find(s => s.hour === hour);
          return stat?.pageViews || 0;
        }),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        yAxisID: 'y',
      },
      {
        label: 'ユニークビジター',
        data: Array.from({ length: 24 }, (_, hour) => {
          const stat = data.hourlyStats.find(s => s.hour === hour);
          return stat?.uniqueVisitors || 0;
        }),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        yAxisID: 'y1',
      },
    ],
  };

  const deviceChartData = {
    labels: data.deviceStats.map(d => {
      switch (d.deviceType) {
        case 'desktop': return 'デスクトップ';
        case 'mobile': return 'モバイル';
        case 'tablet': return 'タブレット';
        default: return '不明';
      }
    }),
    datasets: [
      {
        data: data.deviceStats.map(d => d.count),
        backgroundColor: [
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 99, 132, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
        ],
      },
    ],
  };

  const totalDeviceCount = data.deviceStats.reduce((sum, d) => sum + d.count, 0);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* ヘッダー */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            プライバシー重視アクセス解析
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <Chip
              icon={<Security />}
              label="匿名化済み"
              color="success"
              size="small"
            />
            <Chip
              icon={<PrivacyTip />}
              label="個人情報なし"
              color="primary"
              size="small"
            />
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              最終更新: {new Date(data.endDate).toLocaleString('ja-JP')}
            </Typography>
          </Box>
        </Box>
        <Box display="flex" gap={2} alignItems="center">
          <ToggleButtonGroup
            value={period}
            exclusive
            onChange={handlePeriodChange}
            size="small"
          >
            <ToggleButton value="day">
              <CalendarToday sx={{ mr: 0.5 }} />
              24時間
            </ToggleButton>
            <ToggleButton value="week">
              <DateRange sx={{ mr: 0.5 }} />
              7日間
            </ToggleButton>
            <ToggleButton value="month">
              <DateRange sx={{ mr: 0.5 }} />
              30日間
            </ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchAnalytics}
            disabled={loading}
          >
            更新
          </Button>
        </Box>
      </Box>

      {/* プライバシー通知 */}
      <Alert severity="info" icon={<PrivacyTip />} sx={{ mb: 3 }}>
        <Typography variant="body2">
          このシステムは個人を特定できる情報を一切収集しません。
          IPアドレスは匿名化され、クッキーは使用していません。
          すべてのデータは90日後に自動削除されます（GDPR準拠）。
        </Typography>
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* サマリーカード */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography color="textSecondary" variant="body2" gutterBottom>
                    ページビュー
                  </Typography>
                  <Typography variant="h4">
                    {data.summary.totalPageViews.toLocaleString()}
                  </Typography>
                </Box>
                <Badge badgeContent="匿名" color="success">
                  <Visibility fontSize="large" color="primary" />
                </Badge>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography color="textSecondary" variant="body2" gutterBottom>
                    ユニークビジター
                  </Typography>
                  <Typography variant="h4">
                    {data.summary.uniqueVisitors.toLocaleString()}
                  </Typography>
                </Box>
                <Badge badgeContent="匿名" color="success">
                  <People fontSize="large" color="secondary" />
                </Badge>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography color="textSecondary" variant="body2" gutterBottom>
                    平均セッション時間
                  </Typography>
                  <Typography variant="h4">
                    {formatDuration(data.summary.avgSessionDuration)}
                  </Typography>
                </Box>
                <AccessTime fontSize="large" color="warning" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography color="textSecondary" variant="body2" gutterBottom>
                    デバイス数
                  </Typography>
                  <Typography variant="h4">
                    {totalDeviceCount.toLocaleString()}
                  </Typography>
                </Box>
                <Devices fontSize="large" color="info" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* グラフセクション */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              時間帯別アクセス
            </Typography>
            <Box sx={{ height: 300 }}>
              <Line
                data={hourlyChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: {
                    mode: 'index',
                    intersect: false,
                  },
                  scales: {
                    y: {
                      type: 'linear',
                      display: true,
                      position: 'left',
                    },
                    y1: {
                      type: 'linear',
                      display: true,
                      position: 'right',
                      grid: {
                        drawOnChartArea: false,
                      },
                    },
                  },
                }}
              />
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              デバイス種別
            </Typography>
            <Box sx={{ height: 300 }}>
              <Doughnut
                data={deviceChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                    },
                  },
                }}
              />
            </Box>
            <Box mt={2}>
              {data.deviceStats.map((device) => (
                <Box key={device.deviceType} display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getDeviceIcon(device.deviceType)}
                    <Typography variant="body2">
                      {device.deviceType === 'desktop' ? 'デスクトップ' :
                       device.deviceType === 'mobile' ? 'モバイル' :
                       device.deviceType === 'tablet' ? 'タブレット' : '不明'}
                    </Typography>
                  </Box>
                  <Typography variant="body2" fontWeight={500}>
                    {((device.count / totalDeviceCount) * 100).toFixed(1)}%
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* テーブルセクション */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              人気ページランキング
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ページ</TableCell>
                    <TableCell align="right">PV</TableCell>
                    <TableCell align="right">UV</TableCell>
                    <TableCell align="right">速度</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.topPages.map((page, index) => (
                    <TableRow key={page.pagePath}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Chip label={index + 1} size="small" />
                          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                            {page.pagePath}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">{page.pageViews.toLocaleString()}</TableCell>
                      <TableCell align="right">{page.uniqueVisitors.toLocaleString()}</TableCell>
                      <TableCell align="right">
                        <Tooltip title={`平均読み込み時間: ${page.avgLoadTime}ms`}>
                          <Box>
                            {page.avgLoadTime < 1000 ? (
                              <Chip label="高速" size="small" color="success" />
                            ) : page.avgLoadTime < 3000 ? (
                              <Chip label="普通" size="small" color="warning" />
                            ) : (
                              <Chip label="遅い" size="small" color="error" />
                            )}
                          </Box>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              参照元
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>参照元</TableCell>
                    <TableCell align="right">訪問数</TableCell>
                    <TableCell align="right">割合</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.referrerStats.map((referrer) => {
                    const percentage = ((referrer.count / data.summary.totalPageViews) * 100).toFixed(1);
                    return (
                      <TableRow key={referrer.referrer}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Language fontSize="small" />
                            <Typography variant="body2">
                              {referrer.referrer === 'direct' ? '直接アクセス' : referrer.referrer}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">{referrer.count.toLocaleString()}</TableCell>
                        <TableCell align="right">
                          <Box display="flex" alignItems="center" gap={1}>
                            <LinearProgress
                              variant="determinate"
                              value={parseFloat(percentage)}
                              sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
                            />
                            <Typography variant="body2" sx={{ minWidth: 45 }}>
                              {percentage}%
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* フッター情報 */}
      <Box mt={4} p={2} bgcolor="grey.100" borderRadius={1}>
        <Typography variant="caption" color="text.secondary">
          <Info fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
          プライバシー保護: IPアドレスは最後のオクテットを削除後SHA-256でハッシュ化、
          クッキー未使用、個人識別情報非収集、90日後自動削除（GDPR準拠）
        </Typography>
      </Box>
    </Container>
  );
}