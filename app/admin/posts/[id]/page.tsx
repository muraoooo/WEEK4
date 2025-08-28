'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Paper,
  Card,
  CardContent,
  Avatar,
  Chip,
  Button,
  IconButton,
  Divider,
  Alert,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  ArrowBack,
  Person,
  ThumbUp,
  Comment,
  Report,
  Edit,
  Delete,
  Visibility,
  VisibilityOff,
  RestoreFromTrash,
  Warning,
  AccessTime,
  Update,
  MoreVert,
  Flag,
  Block,
  CheckCircle,
} from '@mui/icons-material';

interface Comment {
  _id: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  content: string;
  createdAt: string;
}

interface Report {
  _id: string;
  reporterId: string;
  reporterName: string;
  reporterEmail: string;
  reason: string;
  description: string;
  createdAt: string;
  status: 'pending' | 'reviewed' | 'resolved';
}

interface Post {
  _id: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  content: string;
  likes: string[];
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  isHidden: boolean;
  deletedAt?: string;
  hiddenAt?: string;
  reported: boolean;
  reports?: Report[];
  reportCount: number;
}

interface AuditLog {
  _id: string;
  action: string;
  adminId: string;
  targetId: string;
  details: any;
  timestamp: string;
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;
  
  const [post, setPost] = useState<Post | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'delete' | 'hide' | 'unhide' | 'restore'>('delete');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const fetchPostDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/posts/${postId}`, { headers: { 'x-admin-secret': 'admin-development-secret-key' } });
      
      if (!response.ok) {
        throw new Error('Failed to fetch post details');
      }
      
      const data = await response.json();
      setPost(data.post);
      setAuditLogs(data.auditLogs || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching post details:', err);
      setError('投稿詳細の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPostDetails();
  }, [postId]);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleAction = (type: 'delete' | 'hide' | 'unhide' | 'restore') => {
    setActionType(type);
    setActionDialogOpen(true);
    handleMenuClose();
  };

  const handleActionConfirm = async () => {
    if (!post) return;

    try {
      const endpoint = actionType === 'delete' 
        ? `/api/admin/posts?id=${post._id}`
        : '/api/admin/posts';
      
      const response = await fetch(endpoint, {
        method: actionType === 'delete' ? 'DELETE' : 'PUT',
        headers: actionType !== 'delete' ? { 'Content-Type': 'application/json' } : undefined,
        body: actionType !== 'delete' ? JSON.stringify({ postId: post._id, action: actionType }) : undefined,
      });

      if (!response.ok) {
        throw new Error('Failed to perform action');
      }

      await fetchPostDetails();
      setActionDialogOpen(false);
    } catch (err) {
      console.error('Error performing action:', err);
      setError('操作に失敗しました');
    }
  };

  const handleReportAction = async (reportId: string, action: 'reviewed' | 'resolved') => {
    try {
      const response = await fetch(`/api/admin/posts/${postId}/reports`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' , 'x-admin-secret': 'admin-development-secret-key' },
        body: JSON.stringify({ reportId, action }),
      });

      if (!response.ok) {
        throw new Error('Failed to update report');
      }

      await fetchPostDetails();
      setReportDialogOpen(false);
      setSelectedReport(null);
    } catch (err) {
      console.error('Error updating report:', err);
      setError('通報ステータスの更新に失敗しました');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = () => {
    if (post?.isDeleted) return 'error';
    if (post?.isHidden) return 'warning';
    return 'success';
  };

  const getStatusText = () => {
    if (post?.isDeleted) return '削除済み';
    if (post?.isHidden) return '非表示';
    return 'アクティブ';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!post) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">投稿が見つかりません</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={() => router.push('/admin/posts')}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4">投稿詳細</Typography>
        </Box>
        <IconButton onClick={handleMenuClick}>
          <MoreVert />
        </IconButton>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
        <Box>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ width: 48, height: 48 }}>
                    <Person />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{post.authorName}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {post.authorEmail}
                    </Typography>
                  </Box>
                </Box>
                <Chip
                  label={getStatusText()}
                  color={getStatusColor() as any}
                  size="small"
                />
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 3 }}>
                {post.content}
              </Typography>

              <Box display="flex" gap={2} mb={2}>
                <Chip
                  icon={<ThumbUp />}
                  label={`${post.likes?.length || 0} いいね`}
                  variant="outlined"
                />
                <Chip
                  icon={<Comment />}
                  label={`${post.comments?.length || 0} コメント`}
                  variant="outlined"
                />
                {post.reported && (
                  <Chip
                    icon={<Report />}
                    label={`${post.reportCount} 通報`}
                    color="error"
                    variant="outlined"
                  />
                )}
              </Box>

              <Box display="flex" gap={2} sx={{ color: 'text.secondary' }}>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <AccessTime fontSize="small" />
                  <Typography variant="caption">
                    作成日: {formatDate(post.createdAt)}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Update fontSize="small" />
                  <Typography variant="caption">
                    更新日: {formatDate(post.updatedAt)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {post.comments && post.comments.length > 0 && (
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  コメント ({post.comments.length})
                </Typography>
                <List>
                  {post.comments.map((comment) => (
                    <ListItem key={comment._id} alignItems="flex-start">
                      <ListItemIcon>
                        <Avatar sx={{ width: 32, height: 32 }}>
                          <Person fontSize="small" />
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box display="flex" justifyContent="space-between">
                            <Typography variant="subtitle2">
                              {comment.authorName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(comment.createdAt)}
                            </Typography>
                          </Box>
                        }
                        secondary={comment.content}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}
        </Box>

        {post.reported && post.reports && post.reports.length > 0 && (
          <Box>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  通報履歴 ({post.reports.length})
                </Typography>
                <List dense>
                  {post.reports.map((report) => (
                    <ListItem
                      key={report._id}
                      button
                      onClick={() => {
                        setSelectedReport(report);
                        setReportDialogOpen(true);
                      }}
                    >
                      <ListItemIcon>
                        {report.status === 'pending' ? (
                          <Warning color="warning" />
                        ) : report.status === 'reviewed' ? (
                          <Flag color="info" />
                        ) : (
                          <CheckCircle color="success" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={report.reason}
                        secondary={
                          <React.Fragment>
                            {report.reporterName} • {formatDate(report.createdAt)}
                          </React.Fragment>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Box>
        )}

        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                アクション履歴
              </Typography>
              {auditLogs.length > 0 ? (
                <List dense>
                  {auditLogs.map((log) => (
                    <ListItem key={log._id}>
                      <ListItemText
                        primary={log.action}
                        secondary={formatDate(log.timestamp)}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  履歴がありません
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {!post.isHidden && !post.isDeleted && (
          <MenuItem onClick={() => handleAction('hide')}>
            <VisibilityOff fontSize="small" sx={{ mr: 1 }} />
            非表示にする
          </MenuItem>
        )}
        {post.isHidden && !post.isDeleted && (
          <MenuItem onClick={() => handleAction('unhide')}>
            <Visibility fontSize="small" sx={{ mr: 1 }} />
            表示する
          </MenuItem>
        )}
        {post.isDeleted && (
          <MenuItem onClick={() => handleAction('restore')}>
            <RestoreFromTrash fontSize="small" sx={{ mr: 1 }} />
            復元する
          </MenuItem>
        )}
        {!post.isDeleted && (
          <MenuItem onClick={() => handleAction('delete')}>
            <Delete fontSize="small" sx={{ mr: 1 }} />
            削除する
          </MenuItem>
        )}
      </Menu>

      <Dialog
        open={actionDialogOpen}
        onClose={() => setActionDialogOpen(false)}
      >
        <DialogTitle>
          {actionType === 'delete' ? '投稿を削除' :
           actionType === 'hide' ? '投稿を非表示' :
           actionType === 'unhide' ? '投稿を表示' : '投稿を復元'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {actionType === 'delete' ? 
              'この投稿を削除しますか？削除後も復元可能です。' :
             actionType === 'hide' ?
              'この投稿を非表示にしますか？ユーザーには表示されなくなります。' :
             actionType === 'unhide' ?
              'この投稿を再表示しますか？' :
              'この投稿を復元しますか？'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialogOpen(false)}>キャンセル</Button>
          <Button onClick={handleActionConfirm} color="error" variant="contained">
            確認
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>通報詳細</DialogTitle>
        <DialogContent>
          {selectedReport && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                通報者: {selectedReport.reporterName}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {selectedReport.reporterEmail}
              </Typography>
              <Typography variant="subtitle2" sx={{ mt: 2 }} gutterBottom>
                理由: {selectedReport.reason}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                {selectedReport.description}
              </Typography>
              <Typography variant="caption" display="block" sx={{ mt: 2 }} color="text.secondary">
                通報日時: {formatDate(selectedReport.createdAt)}
              </Typography>
              <Chip
                label={
                  selectedReport.status === 'pending' ? '未対応' :
                  selectedReport.status === 'reviewed' ? '確認済み' : '解決済み'
                }
                color={
                  selectedReport.status === 'pending' ? 'warning' :
                  selectedReport.status === 'reviewed' ? 'info' : 'success'
                }
                size="small"
                sx={{ mt: 1 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportDialogOpen(false)}>閉じる</Button>
          {selectedReport?.status === 'pending' && (
            <Button
              onClick={() => handleReportAction(selectedReport._id, 'reviewed')}
              color="primary"
            >
              確認済みにする
            </Button>
          )}
          {selectedReport?.status !== 'resolved' && (
            <Button
              onClick={() => handleReportAction(selectedReport._id, 'resolved')}
              color="success"
              variant="contained"
            >
              解決済みにする
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
}