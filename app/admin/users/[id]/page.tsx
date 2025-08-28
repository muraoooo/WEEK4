'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  IconButton,
  Alert,
  CircularProgress,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Warning,
  Block,
  Gavel,
  CheckCircle,
  Person,
  Email,
  CalendarToday,
  Security,
  History,
  Report,
  AdminPanelSettings,
  AccessTime,
  Shield,
  RestartAlt,
  Verified,
  PhonelinkLock,
} from '@mui/icons-material';

interface UserDetails {
  user: {
    _id: string;
    email: string;
    name: string;
    role: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    lastLogin: string | null;
    emailVerified: boolean;
    twoFactorEnabled: boolean;
    metadata?: Record<string, any>;
  };
  activities: Array<{
    _id: string;
    createdAt: string;
    ipAddress?: string;
    userAgent?: string;
  }>;
  auditLogs: Array<{
    _id: string;
    timestamp: string;
    action: string;
    adminId: string;
    details: Record<string, any>;
  }>;
  roleHistory: Array<{
    timestamp: string;
    action: string;
    details: {
      oldRole?: string;
      newRole?: string;
      reason?: string;
    };
  }>;
  sanctionHistory: Array<{
    timestamp: string;
    action: string;
    details: {
      reason?: string;
      duration?: string;
      until?: string;
    };
  }>;
  stats: {
    totalSessions: number;
    lastLogin: string | null;
    warningCount: number;
    suspensionCount: number;
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // ユーザー詳細の取得
  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users/${userId}`, { headers: { 'x-admin-secret': 'admin-development-secret-key' } });
      if (!response.ok) {
        throw new Error('Failed to fetch user details');
      }
      const data = await response.json();
      setUserDetails(data);
      setError(null);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('ユーザー情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUserDetails();
    }
  }, [userId]);

  // アクション実行
  const executeAction = async (action: string, data?: any) => {
    try {
      // 警告アクションの確認ダイアログ
      if (action === 'WARNING') {
        if (!window.confirm('このユーザーに警告を送信しますか？\n\n警告が蓄積されると、自動的にアカウントが制限される場合があります。')) {
          return;
        }
      }
      
      // 停止アクションの確認ダイアログ
      if (action === 'SUSPEND') {
        if (!window.confirm('このユーザーを停止しますか？\n\nこの操作により、ユーザーは一時的にログインできなくなります。')) {
          return;
        }
      }
      
      // BANアクションの確認ダイアログ
      if (action === 'BAN') {
        if (!window.confirm('このユーザーをBANしますか？\n\nこの操作は重大な措置です。ユーザーは永続的にアクセスを制限されます。')) {
          return;
        }
      }
      
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' , 'x-admin-secret': 'admin-development-secret-key' },
        body: JSON.stringify({
          action,
          data,
          reason: data?.reason || 'Admin action',
          adminId: 'current-admin', // TODO: 実際の管理者IDを取得
        }),
      });
      
      if (!response.ok) {
        throw new Error('Action failed');
      }
      
      setActionSuccess(`${action} を実行しました`);
      fetchUserDetails();
    } catch (err) {
      console.error('Action error:', err);
      setError('アクションの実行に失敗しました');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!userDetails) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">ユーザー情報が見つかりません</Alert>
      </Container>
    );
  }

  const { user, activities, auditLogs, roleHistory, sanctionHistory, stats } = userDetails;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'suspended': return 'warning';
      case 'banned': return 'error';
      case 'deleted': return 'default';
      default: return 'default';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'error';
      case 'moderator': return 'warning';
      case 'user': return 'default';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={() => router.push('/admin/users')}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4">ユーザー詳細</Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Edit />}
          onClick={() => router.push(`/admin/users/${userId}/edit`)}
        >
          編集
        </Button>
      </Box>

      {/* メッセージ */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {actionSuccess && (
        <Alert severity="success" onClose={() => setActionSuccess(null)} sx={{ mb: 2 }}>
          {actionSuccess}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }>
          <Box>
            <Box display="flex" alignItems="center" gap={3}>
              <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main' }}>
                <Person sx={{ fontSize: 40 }} />
              </Avatar>
              <Box>
                <Typography variant="h5" gutterBottom>
                  {user.name || 'Unknown'}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    label={user.role}
                    size="small"
                    color={getRoleColor(user.role)}
                    icon={<AdminPanelSettings />}
                  />
                  <Chip
                    label={user.status}
                    size="small"
                    color={getStatusColor(user.status)}
                  />
                  {user.emailVerified && (
                    <Chip
                      label="メール認証済み"
                      size="small"
                      color="success"
                      icon={<Verified />}
                    />
                  )}
                  {user.twoFactorEnabled && (
                    <Chip
                      label="2FA有効"
                      size="small"
                      color="info"
                      icon={<PhonelinkLock />}
                    />
                  )}
                </Stack>
              </Box>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Box>
                <Stack spacing={1}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Email fontSize="small" />
                    <Typography variant="body2" color="text.secondary">
                      メールアドレス
                    </Typography>
                  </Box>
                  <Typography>{user.email}</Typography>
                </Stack>
              </Box>
              <Box>
                <Stack spacing={1}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <CalendarToday fontSize="small" />
                    <Typography variant="body2" color="text.secondary">
                      登録日
                    </Typography>
                  </Box>
                  <Typography>{formatDate(user.createdAt)}</Typography>
                </Stack>
              </Box>
              <Box>
                <Stack spacing={1}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <AccessTime fontSize="small" />
                    <Typography variant="body2" color="text.secondary">
                      最終ログイン
                    </Typography>
                  </Box>
                  <Typography>
                    {user.lastLogin ? formatDate(user.lastLogin) : '未ログイン'}
                  </Typography>
                </Stack>
              </Box>
              <Box>
                <Stack spacing={1}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <History fontSize="small" />
                    <Typography variant="body2" color="text.secondary">
                      最終更新
                    </Typography>
                  </Box>
                  <Typography>{formatDate(user.updatedAt)}</Typography>
                </Stack>
              </Box>
            </Box>
          
          <Box>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  統計情報
                </Typography>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      総セッション数
                    </Typography>
                    <Typography variant="h6">{stats.totalSessions}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      警告回数
                    </Typography>
                    <Typography variant="h6" color="warning.main">
                      {stats.warningCount}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      停止回数
                    </Typography>
                    <Typography variant="h6" color="error.main">
                      {stats.suspensionCount}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          クイックアクション
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            size="small"
            startIcon={<Warning />}
            onClick={() => executeAction('WARNING')}
            disabled={user.status === 'banned' || user.status === 'deleted'}
          >
            警告
          </Button>
          <Button
            size="small"
            startIcon={<Block />}
            onClick={() => executeAction('SUSPEND')}
            disabled={user.status === 'suspended' || user.status === 'banned'}
          >
            停止
          </Button>
          <Button
            size="small"
            startIcon={<Gavel />}
            color="error"
            onClick={() => executeAction('BAN')}
            disabled={user.status === 'banned'}
          >
            BAN
          </Button>
          <Button
            size="small"
            startIcon={<RestartAlt />}
            color="success"
            onClick={() => executeAction('REACTIVATE')}
            disabled={user.status === 'active'}
          >
            復活
          </Button>
        </Stack>
      </Paper>

      {/* タブコンテンツ */}
      <Paper>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="アクティビティ" />
          <Tab label="権限履歴" />
          <Tab label="制裁履歴" />
          <Tab label="監査ログ" />
        </Tabs>
        
        <Box sx={{ px: 3 }}>
          {/* アクティビティ */}
          <TabPanel value={tabValue} index={0}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>セッションID</TableCell>
                    <TableCell>作成日時</TableCell>
                    <TableCell>IPアドレス</TableCell>
                    <TableCell>User Agent</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activities.map((activity) => (
                    <TableRow key={activity._id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {activity._id}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatDate(activity.createdAt)}</TableCell>
                      <TableCell>{activity.ipAddress || 'Unknown'}</TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                          {activity.userAgent || 'Unknown'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                  {activities.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        アクティビティがありません
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>
          
          {/* 権限履歴 */}
          <TabPanel value={tabValue} index={1}>
            <List>
              {roleHistory.map((history, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemIcon>
                      <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                        <Shield fontSize="small" />
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle1">
                            {history.action === 'ROLE_CHANGE' ? '権限変更' : '権限更新'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(history.timestamp)}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Stack spacing={0.5}>
                          {history.details.oldRole && history.details.newRole && (
                            <Typography variant="body2">
                              <Chip label={history.details.oldRole} size="small" sx={{ mr: 1 }} />
                              →
                              <Chip label={history.details.newRole} size="small" sx={{ ml: 1 }} />
                            </Typography>
                          )}
                          {history.details.reason && (
                            <Typography variant="body2" color="text.secondary">
                              理由: {history.details.reason}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary">
                            管理者: {history.adminId}
                          </Typography>
                        </Stack>
                      }
                    />
                  </ListItem>
                  {index < roleHistory.length - 1 && <Divider />}
                </React.Fragment>
              ))}
              {roleHistory.length === 0 && (
                <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                  権限変更履歴はありません
                </Typography>
              )}
            </List>
          </TabPanel>
          
          {/* 制裁履歴 */}
          <TabPanel value={tabValue} index={2}>
            <List>
              {sanctionHistory.map((sanction, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemIcon>
                      <Avatar sx={{ 
                        bgcolor: 
                          sanction.action === 'WARNING' ? 'warning.main' :
                          sanction.action === 'SUSPEND' || sanction.action === 'BAN' ? 'error.main' : 
                          'success.main',
                        width: 32, 
                        height: 32 
                      }}>
                        {sanction.action === 'WARNING' ? <Warning fontSize="small" /> :
                         sanction.action === 'SUSPEND' ? <Block fontSize="small" /> :
                         sanction.action === 'BAN' ? <Gavel fontSize="small" /> :
                         <CheckCircle fontSize="small" />}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle1">
                            {sanction.action === 'WARNING' ? '警告' :
                             sanction.action === 'SUSPEND' ? 'アカウント停止' :
                             sanction.action === 'BAN' ? 'アカウントBAN' :
                             sanction.action === 'REACTIVATE' ? 'アカウント復活' :
                             sanction.action}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(sanction.timestamp)}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Stack spacing={0.5}>
                          {sanction.details.reason && (
                            <Typography variant="body2">
                              理由: {sanction.details.reason}
                            </Typography>
                          )}
                          {sanction.details.message && (
                            <Typography variant="body2" color="text.secondary">
                              {sanction.details.message}
                            </Typography>
                          )}
                          {sanction.details.duration && (
                            <Typography variant="caption" color="text.secondary">
                              期間: {typeof sanction.details.duration === 'number' 
                                ? `${Math.floor(sanction.details.duration / (24 * 60 * 60 * 1000))}日間`
                                : sanction.details.duration}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary">
                            管理者: {sanction.adminId}
                          </Typography>
                        </Stack>
                      }
                    />
                  </ListItem>
                  {index < sanctionHistory.length - 1 && <Divider />}
                </React.Fragment>
              ))}
              {sanctionHistory.length === 0 && (
                <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                  制裁履歴はありません
                </Typography>
              )}
            </List>
          </TabPanel>
          
          {/* 監査ログ */}
          <TabPanel value={tabValue} index={3}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>日時</TableCell>
                    <TableCell>アクション</TableCell>
                    <TableCell>管理者</TableCell>
                    <TableCell>詳細</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log._id}>
                      <TableCell>{formatDate(log.timestamp)}</TableCell>
                      <TableCell>
                        <Chip label={log.action} size="small" />
                      </TableCell>
                      <TableCell>{log.adminId}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {JSON.stringify(log.details, null, 2)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                  {auditLogs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        監査ログがありません
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>
        </Box>
      </Paper>
    </Container>
  );
}