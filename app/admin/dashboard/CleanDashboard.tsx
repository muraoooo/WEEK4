'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Box,
  Alert,
  Button,
  Stack,
  Paper,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  People,
  Article,
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  Refresh,
  Circle,
  AccessTime,
  PersonAdd,
  PostAdd,
  FiberManualRecord,
} from '@mui/icons-material';
import dynamic from 'next/dynamic';

const DynamicCleanCharts = dynamic(
  () => import('@/components/admin/dashboard/CleanCharts'),
  { 
    ssr: false,
    loading: () => (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '350px' }}>
        <CircularProgress size={32} sx={{ color: '#e0e0e0' }} />
      </Box>
    )
  }
);

interface DashboardStats {
  users: {
    total: number;
    change: number;
    changePercent: number;
  };
  posts: {
    total: number;
    change: number;
    changePercent: number;
  };
  reports: {
    total: number;
    change: number;
    changePercent: number;
  };
  uptime: {
    percentage: number;
    status: string;
  };
}

interface Activity {
  id: string;
  type: 'user' | 'post' | 'report' | 'system';
  message: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'success';
}

interface ChartData {
  userTrends: Array<{
    date: string;
    users: number;
  }>;
  deviceAccess: Array<{
    device: string;
    percentage: number;
    count: number;
  }>;
}

export default function CleanDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/dashboard', {
        headers: {
          'x-admin-secret': 'admin-development-secret-key'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();

      // Transform the API response
      const dashboardStats: DashboardStats = {
        users: data.stats?.users || { total: 0, change: 0, changePercent: 0 },
        posts: data.stats?.posts || { total: 0, change: 0, changePercent: 0 },
        reports: data.stats?.reports || { total: 0, change: 0, changePercent: 0 },
        uptime: data.stats?.uptime || { percentage: 100, status: 'operational' }
      };

      const activitiesData: Activity[] = (data.activities || []).map((activity: any) => ({
        id: activity.id,
        type: activity.type,
        message: activity.message,
        timestamp: new Date(activity.timestamp),
        severity: activity.severity
      }));

      const chartDataFormatted: ChartData = {
        userTrends: data.userTrends || [],
        deviceAccess: data.deviceAccess || []
      };

      setStats(dashboardStats);
      setActivities(activitiesData);
      setChartData(chartDataFormatted);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000); // 5分ごとに更新
    return () => clearInterval(interval);
  }, []);

  const getActivityIcon = (type: string, severity: string) => {
    if (type === 'user') return <PersonAdd sx={{ color: '#4caf50' }} />;
    if (type === 'post') return <PostAdd sx={{ color: '#2196f3' }} />;
    if (type === 'report') return <Warning sx={{ color: '#ff9800' }} />;
    if (type === 'system' && severity === 'success') return <CheckCircle sx={{ color: '#4caf50' }} />;
    return <Circle sx={{ color: '#9e9e9e' }} />;
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp sx={{ fontSize: 16, color: '#4caf50' }} />;
    if (change < 0) return <TrendingDown sx={{ fontSize: 16, color: '#f44336' }} />;
    return null;
  };

  if (loading && !stats) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#fafafa', minHeight: '100vh', pb: 4 }}>
      <Container maxWidth="xl">
        {/* ヘッダー */}
        <Box sx={{ pt: 4, pb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 400, color: '#333' }}>
              ダッシュボード
            </Typography>
            <Button
              onClick={fetchDashboardData}
              startIcon={<Refresh />}
              disabled={loading}
              sx={{
                color: '#666',
                borderColor: '#ddd',
                '&:hover': {
                  borderColor: '#999',
                  bgcolor: 'white'
                }
              }}
              variant="outlined"
              size="small"
            >
              更新
            </Button>
          </Box>
          <Typography variant="body2" sx={{ color: '#999' }}>
            最終更新: {lastUpdated.toLocaleString('ja-JP')}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* 統計カード */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3, mb: 4 }}>
          {/* ユーザー統計 */}
          <Paper sx={{ p: 3, bgcolor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="body2" sx={{ color: '#999', mb: 1 }}>
                  総ユーザー数
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 300, color: '#333', mb: 1 }}>
                  {stats?.users.total.toLocaleString() || '0'}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {getChangeIcon(stats?.users.change || 0)}
                  <Typography variant="caption" sx={{ color: stats?.users.change >= 0 ? '#4caf50' : '#f44336' }}>
                    {Math.abs(stats?.users.changePercent || 0).toFixed(1)}%
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#999', ml: 0.5 }}>
                    前日比
                  </Typography>
                </Box>
              </Box>
              <People sx={{ fontSize: 40, color: '#e0e0e0' }} />
            </Box>
          </Paper>

          {/* 投稿統計 */}
          <Paper sx={{ p: 3, bgcolor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="body2" sx={{ color: '#999', mb: 1 }}>
                  総投稿数
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 300, color: '#333', mb: 1 }}>
                  {stats?.posts.total.toLocaleString() || '0'}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {getChangeIcon(stats?.posts.change || 0)}
                  <Typography variant="caption" sx={{ color: stats?.posts.change >= 0 ? '#4caf50' : '#f44336' }}>
                    {Math.abs(stats?.posts.changePercent || 0).toFixed(1)}%
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#999', ml: 0.5 }}>
                    前日比
                  </Typography>
                </Box>
              </Box>
              <Article sx={{ fontSize: 40, color: '#e0e0e0' }} />
            </Box>
          </Paper>

          {/* システム稼働率 */}
          <Paper sx={{ p: 3, bgcolor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="body2" sx={{ color: '#999', mb: 1 }}>
                  システム稼働率
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 300, color: '#333', mb: 1 }}>
                  {stats?.uptime.percentage || 100}%
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <FiberManualRecord sx={{ fontSize: 10, color: stats?.uptime.status === 'operational' ? '#4caf50' : '#ff9800' }} />
                  <Typography variant="caption" sx={{ color: '#666' }}>
                    {stats?.uptime.status === 'operational' ? '正常稼働' : '一部障害'}
                  </Typography>
                </Box>
              </Box>
              <CheckCircle sx={{ fontSize: 40, color: '#e0e0e0' }} />
            </Box>
          </Paper>
        </Box>

        {/* グラフとアクティビティ */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3 }}>
          {/* グラフエリア */}
          <Paper sx={{ p: 3, bgcolor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <Typography variant="h6" sx={{ fontWeight: 400, color: '#333', mb: 3 }}>
              アクティビティ分析
            </Typography>
            {chartData ? (
              <Box sx={{ height: '350px' }}>
                <DynamicCleanCharts 
                  userTrends={chartData.userTrends}
                  deviceAccess={chartData.deviceAccess}
                />
              </Box>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '350px' }}>
                <CircularProgress size={32} sx={{ color: '#e0e0e0' }} />
              </Box>
            )}
          </Paper>

          {/* 最近のアクティビティ */}
          <Paper sx={{ p: 3, bgcolor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', maxHeight: '450px', overflow: 'auto' }}>
            <Typography variant="h6" sx={{ fontWeight: 400, color: '#333', mb: 2 }}>
              最近のアクティビティ
            </Typography>
            <List dense>
              {activities.slice(0, 8).map((activity) => (
                <ListItem key={activity.id} sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {getActivityIcon(activity.type, activity.severity)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2" sx={{ color: '#666', fontSize: '0.875rem' }}>
                        {activity.message}
                      </Typography>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                        <AccessTime sx={{ fontSize: 12, color: '#999' }} />
                        <Typography variant="caption" sx={{ color: '#999' }}>
                          {new Date(activity.timestamp).toLocaleTimeString('ja-JP')}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
}