'use client';

import React, { useEffect, useState } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  Chip,
  Avatar,
  LinearProgress,
  IconButton
} from '@mui/material';
import {
  People,
  Article,
  Security,
  TrendingUp,
  Warning,
  CheckCircle,
  Error,
  Group,
  Description,
  Shield,
  Refresh
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

interface DashboardData {
  users: {
    total: number;
    active: number;
    suspended: number;
    new: number;
  };
  posts: {
    total: number;
    today: number;
    reported: number;
  };
  sessions: {
    active: number;
    today: number;
  };
  security: {
    alerts: number;
    criticalEvents: number;
  };
}

export default function SimpleDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>({
    users: { total: 0, active: 0, suspended: 0, new: 0 },
    posts: { total: 0, today: 0, reported: 0 },
    sessions: { active: 0, today: 0 },
    security: { alerts: 0, criticalEvents: 0 }
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/dashboard', {
        headers: {
          'x-admin-secret': process.env.NEXT_PUBLIC_ADMIN_SECRET || ''
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        setData({
          users: {
            total: result.stats?.users?.total || 0,
            active: result.stats?.users?.active || 0,
            suspended: result.stats?.users?.suspended || 0,
            new: result.stats?.users?.newToday || 0
          },
          posts: {
            total: result.stats?.posts?.total || 0,
            today: result.stats?.posts?.today || 0,
            reported: result.stats?.posts?.reported || 0
          },
          sessions: {
            active: result.stats?.sessions?.active || 0,
            today: result.stats?.sessions?.today || 0
          },
          security: {
            alerts: result.stats?.security?.alerts || 0,
            criticalEvents: result.stats?.security?.critical || 0
          }
        });
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    {
      title: 'ユーザー総数',
      value: data.users.total,
      icon: <People />,
      color: '#1976d2',
      link: '/admin/users'
    },
    {
      title: 'アクティブユーザー',
      value: data.users.active,
      icon: <Group />,
      color: '#4caf50',
      link: '/admin/users'
    },
    {
      title: '投稿総数',
      value: data.posts.total,
      icon: <Article />,
      color: '#ff9800',
      link: '/admin/posts'
    },
    {
      title: 'アクティブセッション',
      value: data.sessions.active,
      icon: <Security />,
      color: '#9c27b0',
      link: '/admin/sessions'
    }
  ];

  const recentActivities = [
    { text: '新規ユーザー登録', icon: <People />, time: '5分前', color: 'primary' },
    { text: '投稿が報告されました', icon: <Warning />, time: '15分前', color: 'warning' },
    { text: 'セキュリティアラート', icon: <Shield />, time: '30分前', color: 'error' },
    { text: 'システム更新完了', icon: <CheckCircle />, time: '1時間前', color: 'success' }
  ];

  return (
    <Container maxWidth="xl">
      {/* ヘッダー */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          ダッシュボード
        </Typography>
        <Typography variant="body2" color="text.secondary">
          システムの概要と最新の統計情報
        </Typography>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* 統計カード */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statsCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              sx={{
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)' }
              }}
              onClick={() => router.push(card.link)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: card.color, mr: 2 }}>
                    {card.icon}
                  </Avatar>
                  <Box>
                    <Typography variant="h4">
                      {card.value.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {card.title}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* 最近のアクティビティ */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">最近のアクティビティ</Typography>
              <IconButton onClick={fetchDashboardData}>
                <Refresh />
              </IconButton>
            </Box>
            <List>
              {recentActivities.map((activity, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <Avatar sx={{ bgcolor: `${activity.color}.light`, width: 36, height: 36 }}>
                      {activity.icon}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={activity.text}
                    secondary={activity.time}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* システムステータス */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              システムステータス
            </Typography>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">セキュリティステータス</Typography>
                <Chip
                  label={data.security.criticalEvents > 0 ? '警告あり' : '正常'}
                  color={data.security.criticalEvents > 0 ? 'warning' : 'success'}
                  size="small"
                />
              </Box>
              <LinearProgress
                variant="determinate"
                value={data.security.criticalEvents > 0 ? 70 : 100}
                color={data.security.criticalEvents > 0 ? 'warning' : 'success'}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">サーバー負荷</Typography>
                <Typography variant="body2">45%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={45} />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">データベース使用率</Typography>
                <Typography variant="body2">62%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={62} color="primary" />
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 3 }}>
              <Chip icon={<CheckCircle />} label="API: 正常" color="success" size="small" />
              <Chip icon={<CheckCircle />} label="DB: 接続中" color="success" size="small" />
              <Chip icon={<Warning />} label={`アラート: ${data.security.alerts}`} color="warning" size="small" />
            </Box>
          </Paper>
        </Grid>

        {/* クイックアクション */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              クイックアクション
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<People />}
                onClick={() => router.push('/admin/users/new')}
              >
                新規ユーザー作成
              </Button>
              <Button
                variant="outlined"
                startIcon={<Shield />}
                onClick={() => router.push('/admin/audit-logs')}
              >
                監査ログを確認
              </Button>
              <Button
                variant="outlined"
                startIcon={<Article />}
                onClick={() => router.push('/admin/posts')}
              >
                投稿を管理
              </Button>
              <Button
                variant="outlined"
                startIcon={<Security />}
                onClick={() => router.push('/admin/sessions')}
              >
                セッション管理
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}