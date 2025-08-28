'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Tooltip,
  Alert,
  LinearProgress,
  Divider,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Fade,
  Grow,
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
  Timeline,
  LocationOn,
  AccessTime,
  TrendingUp,
  TrendingDown,
  Security,
  PrivacyTip,
  Wifi,
  WifiOff,
  CheckCircle,
  Error,
  Warning,
} from '@mui/icons-material';
import { PrivacyWebSocketClient, getWebSocketClient } from '@/utils/websocket';

interface ActiveUser {
  id: string;
  currentPage: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browserType: string;
  lastActivity: string;
  joinedAt: string;
  isOnline: boolean;
}

interface UserUpdate {
  type: string;
  event: string;
  user: ActiveUser;
  activeCount: number;
  timestamp: string;
}

interface ActiveUsersList {
  type: string;
  users: ActiveUser[];
  count: number;
  timestamp: string;
}

export default function ActiveUsers() {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [statistics, setStatistics] = useState({
    total: 0,
    online: 0,
    desktop: 0,
    mobile: 0,
    tablet: 0,
    pages: {} as Record<string, number>,
  });
  const [filter, setFilter] = useState<'all' | 'desktop' | 'mobile' | 'tablet'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const wsClient = useRef<PrivacyWebSocketClient | null>(null);
  const updateQueue = useRef<UserUpdate[]>([]);
  const processQueueTimer = useRef<NodeJS.Timeout | null>(null);

  // WebSocket接続の初期化
  useEffect(() => {
    wsClient.current = getWebSocketClient();
    
    // イベントリスナーの設定
    wsClient.current.on('connected', handleConnected);
    wsClient.current.on('disconnected', handleDisconnected);
    wsClient.current.on('error', handleError);
    wsClient.current.on('reconnecting', handleReconnecting);
    wsClient.current.on('active_users_list', handleActiveUsersList);
    wsClient.current.on('user_update', handleUserUpdate);
    
    // 接続開始
    wsClient.current.connect().catch(console.error);
    
    // クリーンアップ
    return () => {
      if (processQueueTimer.current) {
        clearInterval(processQueueTimer.current);
      }
      wsClient.current?.disconnect();
    };
  }, []);

  // 接続成功ハンドラー
  const handleConnected = useCallback(() => {
    setConnectionState('connected');
    console.log('WebSocket connected');
  }, []);

  // 切断ハンドラー
  const handleDisconnected = useCallback(() => {
    setConnectionState('disconnected');
    console.log('WebSocket disconnected');
  }, []);

  // エラーハンドラー
  const handleError = useCallback((error: any) => {
    setConnectionState('error');
    console.error('WebSocket error:', error);
  }, []);

  // 再接続ハンドラー
  const handleReconnecting = useCallback((attempt: number) => {
    setConnectionState('connecting');
    console.log(`Reconnecting... (attempt ${attempt})`);
  }, []);

  // アクティブユーザーリスト受信
  const handleActiveUsersList = useCallback((data: ActiveUsersList) => {
    setActiveUsers(data.users);
    updateStatistics(data.users);
    setLastUpdate(new Date(data.timestamp));
  }, []);

  // ユーザー更新受信
  const handleUserUpdate = useCallback((data: UserUpdate) => {
    // 更新をキューに追加
    updateQueue.current.push(data);
    
    // バッチ処理タイマーがなければ開始
    if (!processQueueTimer.current) {
      processQueueTimer.current = setTimeout(processUpdateQueue, 100);
    }
  }, []);

  // 更新キューの処理
  const processUpdateQueue = useCallback(() => {
    const updates = [...updateQueue.current];
    updateQueue.current = [];
    processQueueTimer.current = null;
    
    if (updates.length === 0) return;
    
    setActiveUsers(prevUsers => {
      let newUsers = [...prevUsers];
      
      updates.forEach(update => {
        const { event, user } = update;
        
        switch (event) {
          case 'user_joined':
            // 新規ユーザーの追加
            if (!newUsers.find(u => u.id === user.id)) {
              newUsers.push(user);
            }
            break;
          
          case 'user_updated':
          case 'page_changed':
            // 既存ユーザーの更新
            const index = newUsers.findIndex(u => u.id === user.id);
            if (index !== -1) {
              newUsers[index] = { ...newUsers[index], ...user };
            } else {
              newUsers.push(user);
            }
            break;
          
          case 'user_left':
          case 'user_offline':
            // ユーザーのオフライン化
            const offlineIndex = newUsers.findIndex(u => u.id === user.id);
            if (offlineIndex !== -1) {
              newUsers[offlineIndex] = { ...newUsers[offlineIndex], isOnline: false };
            }
            break;
        }
      });
      
      // 統計を更新
      updateStatistics(newUsers);
      setLastUpdate(new Date());
      
      return newUsers;
    });
  }, []);

  // 統計の更新
  const updateStatistics = useCallback((users: ActiveUser[]) => {
    const stats = {
      total: users.length,
      online: users.filter(u => u.isOnline).length,
      desktop: users.filter(u => u.deviceType === 'desktop').length,
      mobile: users.filter(u => u.deviceType === 'mobile').length,
      tablet: users.filter(u => u.deviceType === 'tablet').length,
      pages: {} as Record<string, number>,
    };
    
    // ページ別の統計
    users.forEach(user => {
      if (user.isOnline) {
        stats.pages[user.currentPage] = (stats.pages[user.currentPage] || 0) + 1;
      }
    });
    
    setStatistics(stats);
  }, []);

  // 手動更新
  const handleRefresh = useCallback(() => {
    if (wsClient.current?.isConnected()) {
      wsClient.current.send({ type: 'request_users_list' });
    }
  }, []);

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

  // 接続状態の色
  const getConnectionColor = () => {
    switch (connectionState) {
      case 'connected': return 'success';
      case 'connecting': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

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
              icon={connectionState === 'connected' ? <Wifi /> : <WifiOff />}
              label={
                connectionState === 'connected' ? '接続中' :
                connectionState === 'connecting' ? '接続中...' :
                connectionState === 'error' ? 'エラー' : '切断'
              }
              color={getConnectionColor() as any}
              size="small"
            />
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
          <IconButton onClick={handleRefresh} disabled={connectionState !== 'connected'}>
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

      {/* 統計カード */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
        
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
        
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
        
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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

        {connectionState === 'connecting' ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={5}>
            <CircularProgress />
          </Box>
        ) : filteredUsers.length === 0 ? (
          <Box textAlign="center" py={5}>
            <PersonOutline sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              現在アクティブなユーザーはいません
            </Typography>
          </Box>
        ) : (
          <List>
            {filteredUsers.map((user, index) => (
              <Grow in key={user.id} timeout={300 + index * 50}>
                <ListItem
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
                            icon={<CheckCircle />}
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
              </Grow>
            ))}
          </List>
        )}

        {/* ページ別統計 */}
        {Object.keys(statistics.pages).length > 0 && (
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