'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Badge,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
  IconButton,
  Alert,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
} from '@mui/material';
import {
  People,
  PersonOutline,
  Computer,
  PhoneAndroid,
  Tablet,
  DeviceUnknown,
  Circle,
  Refresh,
  AccessTime,
  Security,
  PrivacyTip,
  LocationOn,
} from '@mui/icons-material';

interface ActiveUser {
  id: string;
  currentPage: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browserType: string;
  lastActivity: string;
  joinedAt: string;
  isOnline: boolean;
}

interface Statistics {
  total: number;
  online: number;
  desktop: number;
  mobile: number;
  tablet: number;
  pages: Record<string, number>;
}

export default function ActiveUsersSimple() {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    total: 0,
    online: 0,
    desktop: 0,
    mobile: 0,
    tablet: 0,
    pages: {},
  });
  const [filter, setFilter] = useState<'all' | 'desktop' | 'mobile' | 'tablet'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // アクティブユーザーの取得
  const fetchActiveUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/active-users');
      if (!response.ok) {
        throw new Error('Failed to fetch active users');
      }
      
      const data = await response.json();
      setActiveUsers(data.users || []);
      setStatistics(data.statistics || {
        total: 0,
        online: 0,
        desktop: 0,
        mobile: 0,
        tablet: 0,
        pages: {},
      });
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  // ハートビートの送信
  const sendHeartbeat = useCallback(async () => {
    if (!userId) return;
    
    try {
      await fetch('/api/active-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'heartbeat',
          userId,
          sessionId,
          page: window.location.pathname,
        }),
      });
    } catch (err) {
      console.error('Heartbeat error:', err);
    }
  }, [userId, sessionId]);

  // 初回接続
  const connect = useCallback(async () => {
    try {
      const response = await fetch('/api/active-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'connect',
          page: window.location.pathname,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserId(data.userId);
        setSessionId(data.sessionId);
      }
    } catch (err) {
      console.error('Connection error:', err);
    }
  }, []);

  // 初期化と定期更新
  useEffect(() => {
    // 初回接続
    connect();
    
    // データの取得
    fetchActiveUsers();
    
    // 定期的な更新（5秒ごと）
    const fetchInterval = setInterval(fetchActiveUsers, 5000);
    
    // ハートビート（30秒ごと）
    const heartbeatInterval = setInterval(sendHeartbeat, 30000);
    
    // クリーンアップ
    return () => {
      clearInterval(fetchInterval);
      clearInterval(heartbeatInterval);
      
      // 切断通知
      if (userId) {
        fetch('/api/active-users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'disconnect',
            userId,
            sessionId,
          }),
        }).catch(console.error);
      }
    };
  }, []);

  // userIdが設定されたらハートビートを開始
  useEffect(() => {
    if (userId) {
      sendHeartbeat();
    }
  }, [userId, sendHeartbeat]);

  // フィルタリングされたユーザーリスト
  const filteredUsers = activeUsers.filter(user => {
    if (filter === 'all') return true;
    return user.deviceType === filter;
  });

  // デバイスアイコンの取得
  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'desktop': return <Computer />;
      case 'mobile': return <PhoneAndroid />;
      case 'tablet': return <Tablet />;
      default: return <DeviceUnknown />;
    }
  };

  // 経過時間の計算
  const getTimeSince = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now.getTime() - time.getTime()) / 1000);
    
    if (diff < 60) return `${diff}秒前`;
    if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
    return `${Math.floor(diff / 86400)}日前`;
  };

  // 手動更新
  const handleRefresh = () => {
    setLoading(true);
    fetchActiveUsers();
  };

  if (loading && activeUsers.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* ヘッダー */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            リアルタイムアクティブユーザー
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <Chip
              icon={<Security />}
              label="プライバシー保護"
              color="primary"
              size="small"
            />
            {lastUpdate && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                最終更新: {lastUpdate.toLocaleTimeString('ja-JP')}
              </Typography>
            )}
          </Box>
        </Box>
        <Box>
          <IconButton onClick={handleRefresh} disabled={loading}>
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {/* プライバシー通知 */}
      <Alert severity="info" icon={<PrivacyTip />} sx={{ mb: 3 }}>
        <Typography variant="body2">
          個人を特定できる情報は表示されません。
          ユーザーIDは匿名化され、IPアドレスや個人情報は収集していません。
        </Typography>
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 統計カード */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography color="textSecondary" variant="body2" gutterBottom>
                    オンライン
                  </Typography>
                  <Typography variant="h4">
                    {statistics.online}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    / {statistics.total} 総ユーザー
                  </Typography>
                </Box>
                <Badge badgeContent={statistics.online} color="success" max={99}>
                  <Avatar sx={{ bgcolor: 'success.light' }}>
                    <People />
                  </Avatar>
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
                    デスクトップ
                  </Typography>
                  <Typography variant="h4">
                    {statistics.desktop}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.light' }}>
                  <Computer />
                </Avatar>
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
                    モバイル
                  </Typography>
                  <Typography variant="h4">
                    {statistics.mobile}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'secondary.light' }}>
                  <PhoneAndroid />
                </Avatar>
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
                    タブレット
                  </Typography>
                  <Typography variant="h4">
                    {statistics.tablet}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.light' }}>
                  <Tablet />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* フィルターとユーザーリスト */}
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            アクティブユーザー一覧
          </Typography>
          <ToggleButtonGroup
            value={filter}
            exclusive
            onChange={(e, value) => value && setFilter(value)}
            size="small"
          >
            <ToggleButton value="all">
              すべて
            </ToggleButton>
            <ToggleButton value="desktop">
              <Computer sx={{ mr: 0.5 }} />
              PC
            </ToggleButton>
            <ToggleButton value="mobile">
              <PhoneAndroid sx={{ mr: 0.5 }} />
              モバイル
            </ToggleButton>
            <ToggleButton value="tablet">
              <Tablet sx={{ mr: 0.5 }} />
              タブレット
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {filteredUsers.length === 0 ? (
          <Box textAlign="center" py={5}>
            <PersonOutline sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              現在アクティブなユーザーはいません
            </Typography>
          </Box>
        ) : (
          <List>
            {filteredUsers.map((user) => (
              <ListItem
                key={user.id}
                sx={{
                  borderRadius: 1,
                  mb: 1,
                  bgcolor: user.isOnline ? 'background.paper' : 'action.hover',
                  opacity: user.isOnline ? 1 : 0.7,
                }}
              >
                <ListItemAvatar>
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    badgeContent={
                      <Circle 
                        sx={{ 
                          width: 12, 
                          height: 12,
                          color: user.isOnline ? 'success.main' : 'text.disabled'
                        }} 
                      />
                    }
                  >
                    <Avatar sx={{ bgcolor: 'primary.light' }}>
                      {getDeviceIcon(user.deviceType)}
                    </Avatar>
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body1">
                        {user.id}
                      </Typography>
                      <Chip
                        label={user.browserType}
                        size="small"
                        variant="outlined"
                      />
                      {user.isOnline ? (
                        <Chip
                          label="オンライン"
                          size="small"
                          color="success"
                        />
                      ) : (
                        <Chip
                          label="オフライン"
                          size="small"
                          color="default"
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box display="flex" alignItems="center" gap={2} component="span">
                      <Box display="flex" alignItems="center" gap={0.5} component="span">
                        <LocationOn fontSize="small" />
                        <Typography variant="caption" component="span">
                          {user.currentPage}
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={0.5} component="span">
                        <AccessTime fontSize="small" />
                        <Typography variant="caption" component="span">
                          {getTimeSince(user.lastActivity)}
                        </Typography>
                      </Box>
                    </Box>
                  }
                  secondaryTypographyProps={{ component: 'div' }}
                />
              </ListItem>
            ))}
          </List>
        )}

        {/* ページ別統計 */}
        {Object.keys(statistics.pages || {}).length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              ページ別アクティブユーザー
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
              {Object.entries(statistics.pages).map(([page, count]) => (
                <Chip
                  key={page}
                  label={`${page} (${count})`}
                  variant="outlined"
                  size="small"
                />
              ))}
            </Box>
          </>
        )}
      </Paper>
    </Container>
  );
}