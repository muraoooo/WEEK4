'use client';

import { useState, useEffect, use } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Stack,
  Avatar,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  Article as ArticleIcon,
  Comment as CommentIcon,
  Flag as FlagIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  History as HistoryIcon,
  Note as NoteIcon,
  Email as EmailIcon,
  Block as BlockIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

interface ReportDetails {
  report: {
    _id: string;
    reportType: string;
    targetId: string;
    targetContent?: string;
    reason: string;
    reasonDetails?: string;
    status: string;
    priority: string;
    resolution?: {
      action: string;
      notes: string;
      resolvedAt: string;
    };
    internalNotes: Array<{
      note: string;
      addedBy: string;
      addedAt: string;
    }>;
    evidence: string[];
    createdAt: string;
    updatedAt: string;
    assignedAt?: string;
    reviewedAt?: string;
  };
  reporter: {
    _id: string;
    email: string;
    name: string;
    status: string;
    warningCount: number;
  } | null;
  targetUser: {
    _id: string;
    email: string;
    name: string;
    status: string;
    warningCount: number;
    createdAt: string;
  } | null;
  targetDetails: any;
  reviewer: {
    _id: string;
    email: string;
    name: string;
  } | null;
  assignee: {
    _id: string;
    email: string;
    name: string;
  } | null;
  relatedReports: Array<{
    _id: string;
    reason: string;
    status: string;
    createdAt: string;
  }>;
}

export default function ReportDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [reportDetails, setReportDetails] = useState<ReportDetails | null>(null);
  const [loading, setLoading] = useState(true);
  
  // ダイアログ
  const [actionDialog, setActionDialog] = useState({
    open: false,
    action: '',
    notes: '',
    resolutionAction: 'warning_issued'
  });
  const [noteDialog, setNoteDialog] = useState({
    open: false,
    note: ''
  });

  useEffect(() => {
    fetchReportDetails();
  }, [resolvedParams.id]);

  const fetchReportDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/reports/${resolvedParams.id}`, {
        headers: {
          'x-admin-secret': process.env.NEXT_PUBLIC_ADMIN_SECRET_KEY || 'admin-development-secret-key'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setReportDetails(data);
      }
    } catch (error) {
      console.error('Error fetching report details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    try {
      const response = await fetch('/api/admin/reports', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': process.env.NEXT_PUBLIC_ADMIN_SECRET_KEY || 'admin-development-secret-key'
        },
        body: JSON.stringify({
          reportId: params.id,
          action: actionDialog.action,
          adminId: 'admin-user',
          notes: actionDialog.notes,
          resolutionAction: actionDialog.resolutionAction
        })
      });

      if (response.ok) {
        fetchReportDetails();
        setActionDialog({ open: false, action: '', notes: '', resolutionAction: 'warning_issued' });
      }
    } catch (error) {
      console.error('Error performing action:', error);
    }
  };

  const handleAddNote = async () => {
    try {
      const response = await fetch('/api/admin/reports', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': process.env.NEXT_PUBLIC_ADMIN_SECRET_KEY || 'admin-development-secret-key'
        },
        body: JSON.stringify({
          reportId: params.id,
          action: 'add_note',
          adminId: 'admin-user',
          notes: noteDialog.note
        })
      });

      if (response.ok) {
        fetchReportDetails();
        setNoteDialog({ open: false, note: '' });
      }
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'reviewing': return 'info';
      case 'approved': return 'success';
      case 'rejected': return 'default';
      case 'resolved': return 'success';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getReasonLabel = (reason: string) => {
    const reasonMap: { [key: string]: string } = {
      spam: 'スパム',
      harassment: 'ハラスメント',
      inappropriate_content: '不適切なコンテンツ',
      hate_speech: 'ヘイトスピーチ',
      violence: '暴力的な内容',
      misinformation: '誤情報',
      copyright: '著作権侵害',
      other: 'その他'
    };
    return reasonMap[reason] || reason;
  };

  const getUserStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'suspended': return 'warning';
      case 'banned': return 'error';
      default: return 'default';
    }
  };

  if (loading || !reportDetails) {
    return <Box sx={{ p: 3 }}>Loading...</Box>;
  }

  const { report, reporter, targetUser, targetDetails, reviewer, assignee, relatedReports } = reportDetails;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <IconButton onClick={() => router.push('/admin/reports')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          通報詳細
        </Typography>
        <Chip
          label={report.status}
          color={getStatusColor(report.status) as any}
        />
        <Chip
          label={report.priority}
          color={getPriorityColor(report.priority) as any}
        />
      </Box>

      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }>
        {/* 通報内容 */}
        <Box>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              通報内容
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Box>
                <Typography variant="caption" color="textSecondary">
                  通報タイプ
                </Typography>
                <Typography variant="body1">
                  {report.reportType === 'post' && '投稿'}
                  {report.reportType === 'user' && 'ユーザー'}
                  {report.reportType === 'comment' && 'コメント'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="textSecondary">
                  通報理由
                </Typography>
                <Typography variant="body1">
                  {getReasonLabel(report.reason)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="textSecondary">
                  詳細理由
                </Typography>
                <Typography variant="body1">
                  {report.reasonDetails || '詳細なし'}
                </Typography>
              </Box>
              {report.targetContent && (
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    対象コンテンツ
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, mt: 1, backgroundColor: '#f5f5f5' }}>
                    <Typography variant="body2">
                      {report.targetContent}
                    </Typography>
                  </Paper>
                </Box>
              )}
            </Box>
          </Paper>

          {targetUser && (
            <Box>
              <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                対象ユーザー
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar sx={{ width: 56, height: 56 }}>
                  {targetUser.name?.charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h6">
                    {targetUser.name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {targetUser.email}
                  </Typography>
                </Box>
                <Chip
                  label={targetUser.status}
                  color={getUserStatusColor(targetUser.status) as any}
                  size="small"
                />
              </Box>

              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    警告回数
                  </Typography>
                  <Typography variant="body1">
                    {targetUser.warningCount}回
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    アカウント作成日
                  </Typography>
                  <Typography variant="body1">
                    {new Date(targetUser.createdAt).toLocaleDateString('ja-JP')}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<PersonIcon />}
                  onClick={() => router.push(`/admin/users/${targetUser._id}`)}
                >
                  ユーザー詳細を表示
                </Button>
              </Box>
              </Paper>
            </Box>
          )}

          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                内部メモ
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<NoteIcon />}
                onClick={() => setNoteDialog({ open: true, note: '' })}
              >
                メモを追加
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            {report.internalNotes?.length > 0 ? (
              <List>
                {report.internalNotes.map((note, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <NoteIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={note.note}
                      secondary={`${new Date(note.addedAt).toLocaleString('ja-JP')} - 管理者`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="textSecondary">
                メモはまだありません
              </Typography>
            )}
          </Paper>
        </Box>

        <Box>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                アクション
              </Typography>
              <Stack spacing={2}>
                {report.status === 'pending' && (
                  <>
                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      startIcon={<AssignmentIcon />}
                      onClick={() => setActionDialog({
                        open: true,
                        action: 'assign',
                        notes: '',
                        resolutionAction: 'warning_issued'
                      })}
                    >
                      自分にアサイン
                    </Button>
                    <Button
                      fullWidth
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => setActionDialog({
                        open: true,
                        action: 'approve',
                        notes: '',
                        resolutionAction: 'warning_issued'
                      })}
                    >
                      承認する
                    </Button>
                    <Button
                      fullWidth
                      variant="contained"
                      color="error"
                      startIcon={<CancelIcon />}
                      onClick={() => setActionDialog({
                        open: true,
                        action: 'reject',
                        notes: '',
                        resolutionAction: 'no_action'
                      })}
                    >
                      却下する
                    </Button>
                  </>
                )}
                {report.status === 'reviewing' && (
                  <>
                    <Button
                      fullWidth
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => setActionDialog({
                        open: true,
                        action: 'approve',
                        notes: '',
                        resolutionAction: 'warning_issued'
                      })}
                    >
                      承認する
                    </Button>
                    <Button
                      fullWidth
                      variant="contained"
                      color="error"
                      startIcon={<CancelIcon />}
                      onClick={() => setActionDialog({
                        open: true,
                        action: 'reject',
                        notes: '',
                        resolutionAction: 'no_action'
                      })}
                    >
                      却下する
                    </Button>
                  </>
                )}
              </Stack>
            </CardContent>
          </Card>

          {/* 通報者情報 */}
          {reporter && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  通報者
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Avatar sx={{ width: 40, height: 40 }}>
                    {reporter.name?.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="body1">
                      {reporter.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {reporter.email}
                    </Typography>
                  </Box>
                </Box>
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  onClick={() => router.push(`/admin/users/${reporter._id}`)}
                >
                  詳細を表示
                </Button>
              </CardContent>
            </Card>
          )}

          {/* タイムライン */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                タイムライン
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <FlagIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="通報作成"
                    secondary={new Date(report.createdAt).toLocaleString('ja-JP')}
                  />
                </ListItem>
                {report.assignedAt && (
                  <ListItem>
                    <ListItemIcon>
                      <AssignmentIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={`${assignee?.name}にアサイン`}
                      secondary={new Date(report.assignedAt).toLocaleString('ja-JP')}
                    />
                  </ListItem>
                )}
                {report.reviewedAt && (
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircleIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={`${reviewer?.name}がレビュー`}
                      secondary={new Date(report.reviewedAt).toLocaleString('ja-JP')}
                    />
                  </ListItem>
                )}
                {report.resolution?.resolvedAt && (
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircleIcon fontSize="small" color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary="解決済み"
                      secondary={new Date(report.resolution.resolvedAt).toLocaleString('ja-JP')}
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>

          {/* 関連する通報 */}
          {relatedReports.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  関連する通報
                </Typography>
                <List dense>
                  {relatedReports.map((related) => (
                    <ListItem
                      key={related._id}
                      button
                      onClick={() => router.push(`/admin/reports/${related._id}`)}
                    >
                      <ListItemText
                        primary={getReasonLabel(related.reason)}
                        secondary={`${related.status} - ${new Date(related.createdAt).toLocaleDateString('ja-JP')}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>

      {/* アクションダイアログ */}
      <Dialog
        open={actionDialog.open}
        onClose={() => setActionDialog({ open: false, action: '', notes: '', resolutionAction: 'warning_issued' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {actionDialog.action === 'assign' && '通報をアサイン'}
          {actionDialog.action === 'approve' && '通報を承認'}
          {actionDialog.action === 'reject' && '通報を却下'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {actionDialog.action === 'approve' && (
              <FormControl fullWidth>
                <InputLabel>処置内容</InputLabel>
                <Select
                  value={actionDialog.resolutionAction}
                  label="処置内容"
                  onChange={(e) => setActionDialog({
                    ...actionDialog,
                    resolutionAction: e.target.value
                  })}
                >
                  <MenuItem value="warning_issued">警告を発行</MenuItem>
                  <MenuItem value="content_removed">コンテンツを削除</MenuItem>
                  <MenuItem value="user_suspended">ユーザーを停止</MenuItem>
                  <MenuItem value="user_banned">ユーザーをBAN</MenuItem>
                  <MenuItem value="no_action">対応なし</MenuItem>
                </Select>
              </FormControl>
            )}
            <TextField
              fullWidth
              label="処理メモ"
              multiline
              rows={3}
              value={actionDialog.notes}
              onChange={(e) => setActionDialog({
                ...actionDialog,
                notes: e.target.value
              })}
              placeholder="処理の理由や詳細を記入してください"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setActionDialog({ open: false, action: '', notes: '', resolutionAction: 'warning_issued' })}
          >
            キャンセル
          </Button>
          <Button
            variant="contained"
            color={actionDialog.action === 'reject' ? 'error' : 'primary'}
            onClick={handleAction}
          >
            確定
          </Button>
        </DialogActions>
      </Dialog>

      {/* メモ追加ダイアログ */}
      <Dialog
        open={noteDialog.open}
        onClose={() => setNoteDialog({ open: false, note: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>内部メモを追加</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="メモ"
            multiline
            rows={4}
            value={noteDialog.note}
            onChange={(e) => setNoteDialog({
              ...noteDialog,
              note: e.target.value
            })}
            placeholder="内部用のメモを記入してください"
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setNoteDialog({ open: false, note: '' })}
          >
            キャンセル
          </Button>
          <Button
            variant="contained"
            onClick={handleAddNote}
          >
            追加
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}