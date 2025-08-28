'use client';

import React, { useEffect, useState } from 'react';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import LinearProgress from '@mui/material/LinearProgress';
import Skeleton from '@mui/material/Skeleton';
import People from '@mui/icons-material/People';
import Article from '@mui/icons-material/Article';
import Security from '@mui/icons-material/Security';
import Warning from '@mui/icons-material/Warning';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Error from '@mui/icons-material/Error';
import Group from '@mui/icons-material/Group';
import Shield from '@mui/icons-material/Shield';
import Refresh from '@mui/icons-material/Refresh';
import Assessment from '@mui/icons-material/Assessment';
import { useRouter } from 'next/navigation';
import UserGrowthChart from '@/components/admin/dashboard/UserGrowthChart';
import DeviceAccessChart from '@/components/admin/dashboard/DeviceAccessChart';

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
  type: string;
  message: string;
  timestamp: Date;
  severity: string;
}

export default function EnhancedDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [userGrowthData, setUserGrowthData] = useState<any[]>([]);
  const [deviceAccessData, setDeviceAccessData] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async (retryCount = 0) => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/dashboard');
      
      if (!response.ok) {
        const errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        throw new (Error as any)(errorMessage);
      }
      
      const data = await response.json();
      
      if (data.stats) {
        setStats(data.stats);
      }
      
      if (data.activities) {
        setActivities(data.activities);
      }
      
      if (data.userGrowthData) {
        setUserGrowthData(data.userGrowthData);
      }
      
      if (data.deviceAccess) {
        setDeviceAccessData(data.deviceAccess);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      
      // Retry once if it's a network/404 error during hot reload
      if (retryCount < 2 && (error instanceof TypeError || (error as any)?.message?.includes('404'))) {
        console.log(`Retrying dashboard data fetch (attempt ${retryCount + 1})...`);
        setTimeout(() => fetchDashboardData(retryCount + 1), 1000);
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'success';
      case 'degraded': return 'warning';
      case 'partial_outage': return 'error';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'success': return <CheckCircle color="success" />;
      case 'warning': return <Warning color="warning" />;
      case 'error': return <Error color="error" />;
      default: return <Shield color="info" />;
    }
  };

  const StatCard = ({ title, value, change, changePercent, icon, color }: any) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.dark` }}>
            {icon}
          </Avatar>
          {changePercent !== undefined && (
            <Chip
              size="small"
              label={`${changePercent > 0 ? '+' : ''}${changePercent}%`}
              color={changePercent >= 0 ? 'success' : 'error'}
              sx={{ fontWeight: 'bold' }}
            />
          )}
        </Box>
        <Typography color="textSecondary" gutterBottom variant="body2">
          {title}
        </Typography>
        <Typography variant="h4" component="div">
          {value?.toLocaleString() || '0'}
        </Typography>
        {change !== undefined && (
          <Typography variant="body2" sx={{ mt: 1, color: change >= 0 ? 'success.main' : 'error.main' }}>
            {change >= 0 ? '+' : ''}{change} 今日
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((item) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={item}>
              <Skeleton variant="rectangular" height={150} />
            </Grid>
          ))}
          <Grid size={{ xs: 12, md: 8 }}>
            <Skeleton variant="rectangular" height={400} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Skeleton variant="rectangular" height={400} />
          </Grid>
        </Grid>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          ダッシュボード
        </Typography>
        <Button
          startIcon={<Refresh />}
          onClick={() => fetchDashboardData()}
          variant="outlined"
        >
          更新
        </Button>
      </Box>

      <Typography variant="body2" color="text.secondary" gutterBottom>
        システムの概要と最新の統計情報
      </Typography>

      {/* 統計カード */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="ユーザー総数"
            value={stats?.users.total}
            change={stats?.users.change}
            changePercent={stats?.users.changePercent}
            icon={<People />}
            color="primary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="アクティブユーザー"
            value={userGrowthData[userGrowthData.length - 1]?.activeUsers || 0}
            change={0}
            changePercent={0}
            icon={<Group />}
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="投稿総数"
            value={stats?.posts.total}
            change={stats?.posts.change}
            changePercent={stats?.posts.changePercent}
            icon={<Article />}
            color="warning"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="アクティブセッション"
            value={deviceAccessData.reduce((sum, item) => sum + item.value, 0)}
            change={0}
            changePercent={0}
            icon={<Security />}
            color="info"
          />
        </Grid>
      </Grid>

      {/* グラフセクション */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* 折れ線グラフ - ユーザー推移 */}
        <Grid size={{ xs: 12, md: 8 }}>
          {userGrowthData.length > 0 ? (
            <UserGrowthChart data={userGrowthData} />
          ) : (
            <Paper sx={{ p: 3, height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography color="text.secondary">データを読み込み中...</Typography>
            </Paper>
          )}
        </Grid>

        {/* 円グラフ - デバイス別アクセス */}
        <Grid size={{ xs: 12, md: 4 }}>
          {deviceAccessData.length > 0 ? (
            <DeviceAccessChart data={deviceAccessData} />
          ) : (
            <Paper sx={{ p: 3, height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography color="text.secondary">データを読み込み中...</Typography>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* 最近のアクティビティとシステムステータス */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              最近のアクティビティ
            </Typography>
            <List>
              {activities.map((activity) => (
                <ListItem key={activity.id}>
                  <ListItemIcon>
                    {getSeverityIcon(activity.severity)}
                  </ListItemIcon>
                  <ListItemText
                    primary={activity.message}
                    secondary={new Date(activity.timestamp).toLocaleString('ja-JP')}
                  />
                </ListItem>
              ))}
              {activities.length === 0 && (
                <ListItem>
                  <ListItemText
                    primary="アクティビティはありません"
                    secondary="システムは正常に稼働しています"
                  />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              システムステータス
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">セキュリティステータス</Typography>
                <Chip label="正常" color="success" size="small" />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">サーバー負荷</Typography>
                <Typography variant="body2" color="success.main">45%</Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <LinearProgress variant="determinate" value={45} color="success" />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">データベース使用率</Typography>
                <Typography variant="body2" color="warning.main">62%</Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <LinearProgress variant="determinate" value={62} color="warning" />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">稼働率</Typography>
                <Typography variant="body2" color="success.main">
                  {stats?.uptime.percentage}%
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={stats?.uptime.percentage || 0} 
                  color={getStatusColor(stats?.uptime.status || 'operational') as any}
                />
              </Box>
              <Box sx={{ mt: 3 }}>
                <Button variant="outlined" fullWidth onClick={() => router.push('/admin/audit-logs')}>
                  監査ログを確認
                </Button>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* クイックアクション */}
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          クイックアクション
        </Typography>
        <Grid container spacing={2}>
          <Grid size="auto">
            <Button
              variant="contained"
              startIcon={<People />}
              onClick={() => router.push('/admin/users/new')}
            >
              新規ユーザー作成
            </Button>
          </Grid>
          <Grid size="auto">
            <Button
              variant="outlined"
              startIcon={<Assessment />}
              onClick={() => router.push('/admin/audit-logs')}
            >
              監査ログを確認
            </Button>
          </Grid>
          <Grid size="auto">
            <Button
              variant="outlined"
              startIcon={<Shield />}
              onClick={() => router.push('/admin/sessions')}
            >
              セッション管理
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}