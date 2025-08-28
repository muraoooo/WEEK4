'use client';

import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Stack,
  Tooltip,
  Badge,
  LinearProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Visibility,
  Flag,
  Warning,
  AutoAwesome,
  Person,
  Schedule,
  TrendingUp,
  Assessment,
  ExpandMore,
  Speed,
  Psychology,
  Shield,
  Report,
  ThumbDown,
  Delete,
  Edit,
  Comment,
  Share,
} from '@mui/icons-material';

interface ModerationItem {
  id: string;
  type: 'post' | 'comment' | 'user';
  content: {
    id: string;
    text: string;
    author: {
      id: string;
      name: string;
      avatar?: string;
      reputation: number;
    };
    metadata: {
      createdAt: string;
      platform: string;
      location?: string;
    };
  };
  aiAnalysis: {
    riskScore: number;
    categories: Array<{
      type: string;
      confidence: number;
      severity: 'low' | 'medium' | 'high' | 'critical';
    }>;
    sentiment: {
      score: number;
      label: 'positive' | 'neutral' | 'negative';
    };
    language: {
      detected: string;
      confidence: number;
    };
    flags: string[];
  };
  reports?: Array<{
    id: string;
    reporterId: string;
    reason: string;
    timestamp: string;
  }>;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'reviewing' | 'approved' | 'rejected' | 'escalated';
  assignedTo?: string;
  reviewHistory?: Array<{
    reviewerId: string;
    action: string;
    timestamp: string;
    notes?: string;
  }>;
}

interface ContentModerationQueueProps {
  items: ModerationItem[];
  onAction: (itemId: string, action: string, notes?: string) => Promise<void>;
  onBulkAction: (itemIds: string[], action: string) => Promise<void>;
  onAssign: (itemId: string, assigneeId: string) => Promise<void>;
  loading?: boolean;
}

const ContentModerationQueue: React.FC<ContentModerationQueueProps> = ({
  items,
  onAction,
  onBulkAction,
  onAssign,
  loading = false
}) => {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ModerationItem | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'escalate'>('approve');
  const [actionNotes, setActionNotes] = useState('');
  const [filter, setFilter] = useState({
    status: 'all',
    priority: 'all',
    type: 'all',
    riskLevel: 'all'
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'reviewing': return 'info';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'escalated': return 'warning';
      default: return 'default';
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 0.8) return 'error';
    if (score >= 0.6) return 'warning';
    if (score >= 0.4) return 'info';
    return 'success';
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <Warning color="error" />;
      case 'high': return <Warning color="warning" />;
      case 'medium': return <Flag color="info" />;
      case 'low': return <Flag color="success" />;
      default: return <Flag />;
    }
  };

  const filteredItems = items.filter(item => {
    if (filter.status !== 'all' && item.status !== filter.status) return false;
    if (filter.priority !== 'all' && item.priority !== filter.priority) return false;
    if (filter.type !== 'all' && item.type !== filter.type) return false;
    if (filter.riskLevel !== 'all') {
      const riskLevel = item.aiAnalysis.riskScore >= 0.8 ? 'high' :
                       item.aiAnalysis.riskScore >= 0.6 ? 'medium' :
                       item.aiAnalysis.riskScore >= 0.4 ? 'low' : 'minimal';
      if (riskLevel !== filter.riskLevel) return false;
    }
    return true;
  });

  const handleItemDetails = (item: ModerationItem) => {
    setSelectedItem(item);
    setDetailsOpen(true);
  };

  const handleAction = async (action: string) => {
    if (!selectedItem) return;

    try {
      await onAction(selectedItem.id, action, actionNotes);
      setActionDialogOpen(false);
      setActionNotes('');
      setDetailsOpen(false);
    } catch (error) {
      console.error('Action failed:', error);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedItems.length === 0) return;

    try {
      await onBulkAction(selectedItems, action);
      setSelectedItems([]);
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAIFlagDescription = (flag: string) => {
    const descriptions: { [key: string]: string } = {
      'toxic_language': '有害な言語',
      'hate_speech': 'ヘイトスピーチ',
      'spam': 'スパム',
      'harassment': 'ハラスメント',
      'violence': '暴力的内容',
      'adult_content': '成人向けコンテンツ',
      'misinformation': '誤情報',
      'copyright': '著作権侵害',
    };
    return descriptions[flag] || flag;
  };

  if (loading) {
    return (
      <Box p={3}>
        <LinearProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          モデレーションキューを読み込んでいます...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header with Stats */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          コンテンツモデレーションキュー
        </Typography>
        <Stack direction="row" spacing={2}>
          <Chip 
            label={`未処理: ${items.filter(i => i.status === 'pending').length}`}
            color="warning" 
            size="small" 
          />
          <Chip 
            label={`レビュー中: ${items.filter(i => i.status === 'reviewing').length}`}
            color="info" 
            size="small" 
          />
          <Chip 
            label={`高リスク: ${items.filter(i => i.aiAnalysis.riskScore >= 0.8).length}`}
            color="error" 
            size="small" 
          />
        </Stack>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>ステータス</InputLabel>
                <Select
                  value={filter.status}
                  label="ステータス"
                  onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                >
                  <MenuItem value="all">すべて</MenuItem>
                  <MenuItem value="pending">未処理</MenuItem>
                  <MenuItem value="reviewing">レビュー中</MenuItem>
                  <MenuItem value="approved">承認済み</MenuItem>
                  <MenuItem value="rejected">却下済み</MenuItem>
                  <MenuItem value="escalated">エスカレーション</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>優先度</InputLabel>
                <Select
                  value={filter.priority}
                  label="優先度"
                  onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
                >
                  <MenuItem value="all">すべて</MenuItem>
                  <MenuItem value="critical">緊急</MenuItem>
                  <MenuItem value="high">高</MenuItem>
                  <MenuItem value="medium">中</MenuItem>
                  <MenuItem value="low">低</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>タイプ</InputLabel>
                <Select
                  value={filter.type}
                  label="タイプ"
                  onChange={(e) => setFilter({ ...filter, type: e.target.value })}
                >
                  <MenuItem value="all">すべて</MenuItem>
                  <MenuItem value="post">投稿</MenuItem>
                  <MenuItem value="comment">コメント</MenuItem>
                  <MenuItem value="user">ユーザー</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>リスクレベル</InputLabel>
                <Select
                  value={filter.riskLevel}
                  label="リスクレベル"
                  onChange={(e) => setFilter({ ...filter, riskLevel: e.target.value })}
                >
                  <MenuItem value="all">すべて</MenuItem>
                  <MenuItem value="high">高リスク (80%+)</MenuItem>
                  <MenuItem value="medium">中リスク (60-80%)</MenuItem>
                  <MenuItem value="low">低リスク (40-60%)</MenuItem>
                  <MenuItem value="minimal">最小リスク (~40%)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Stack direction="row" spacing={1}>
                {selectedItems.length > 0 && (
                  <>
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      startIcon={<CheckCircle />}
                      onClick={() => handleBulkAction('approve')}
                    >
                      一括承認 ({selectedItems.length})
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      size="small"
                      startIcon={<Cancel />}
                      onClick={() => handleBulkAction('reject')}
                    >
                      一括却下
                    </Button>
                  </>
                )}
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Moderation Items */}
      <TableContainer component={Card}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                {/* Select All Checkbox would go here */}
              </TableCell>
              <TableCell>コンテンツ</TableCell>
              <TableCell>投稿者</TableCell>
              <TableCell align="center">AIスコア</TableCell>
              <TableCell align="center">優先度</TableCell>
              <TableCell align="center">ステータス</TableCell>
              <TableCell align="center">作成日時</TableCell>
              <TableCell align="center">アクション</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredItems.map((item) => (
              <TableRow 
                key={item.id}
                hover
                sx={{ '&:hover': { bgcolor: 'action.hover' } }}
              >
                <TableCell padding="checkbox">
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedItems([...selectedItems, item.id]);
                      } else {
                        setSelectedItems(selectedItems.filter(id => id !== item.id));
                      }
                    }}
                  />
                </TableCell>

                <TableCell>
                  <Box sx={{ maxWidth: 300 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        mb: 1
                      }}
                    >
                      {item.content.text}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {item.aiAnalysis.flags.slice(0, 2).map((flag) => (
                        <Chip
                          key={flag}
                          label={getAIFlagDescription(flag)}
                          size="small"
                          color="warning"
                          variant="outlined"
                        />
                      ))}
                      {item.aiAnalysis.flags.length > 2 && (
                        <Chip
                          label={`+${item.aiAnalysis.flags.length - 2}`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Stack>
                  </Box>
                </TableCell>

                <TableCell>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar 
                      src={item.content.author.avatar}
                      sx={{ width: 32, height: 32 }}
                    >
                      <Person />
                    </Avatar>
                    <Box>
                      <Typography variant="body2">
                        {item.content.author.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        信頼度: {item.content.author.reputation}%
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>

                <TableCell align="center">
                  <Box>
                    <Chip
                      label={`${Math.round(item.aiAnalysis.riskScore * 100)}%`}
                      color={getRiskColor(item.aiAnalysis.riskScore)}
                      size="small"
                      icon={<Psychology />}
                    />
                    <LinearProgress
                      variant="determinate"
                      value={item.aiAnalysis.riskScore * 100}
                      color={getRiskColor(item.aiAnalysis.riskScore)}
                      sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                    />
                  </Box>
                </TableCell>

                <TableCell align="center">
                  <Chip
                    label={item.priority}
                    color={getPriorityColor(item.priority)}
                    size="small"
                    sx={{ textTransform: 'capitalize' }}
                  />
                </TableCell>

                <TableCell align="center">
                  <Chip
                    label={item.status}
                    color={getStatusColor(item.status)}
                    size="small"
                    sx={{ textTransform: 'capitalize' }}
                  />
                </TableCell>

                <TableCell align="center">
                  <Typography variant="body2">
                    {formatDate(item.content.metadata.createdAt)}
                  </Typography>
                </TableCell>

                <TableCell align="center">
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="詳細を表示">
                      <IconButton
                        size="small"
                        onClick={() => handleItemDetails(item)}
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    
                    {item.status === 'pending' && (
                      <>
                        <Tooltip title="承認">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => {
                              setSelectedItem(item);
                              setActionType('approve');
                              setActionDialogOpen(true);
                            }}
                          >
                            <CheckCircle />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="却下">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setSelectedItem(item);
                              setActionType('reject');
                              setActionDialogOpen(true);
                            }}
                          >
                            <Cancel />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredItems.length === 0 && (
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="center" py={4}>
              <Typography variant="body2" color="text.secondary">
                表示するアイテムがありません
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedItem && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center" gap={2}>
                <Typography variant="h6">
                  コンテンツ詳細
                </Typography>
                <Chip
                  label={selectedItem.type}
                  size="small"
                  color="primary"
                />
                <Chip
                  label={`リスク: ${Math.round(selectedItem.aiAnalysis.riskScore * 100)}%`}
                  size="small"
                  color={getRiskColor(selectedItem.aiAnalysis.riskScore)}
                />
              </Box>
            </DialogTitle>
            
            <DialogContent>
              <Grid container spacing={3}>
                <Grid size={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        コンテンツ内容
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {selectedItem.content.text}
                      </Typography>
                      <Divider sx={{ my: 2 }} />
                      <Grid container spacing={2}>
                        <Grid size={6}>
                          <Typography variant="caption" color="text.secondary">
                            投稿者: {selectedItem.content.author.name}
                          </Typography>
                        </Grid>
                        <Grid size={6}>
                          <Typography variant="caption" color="text.secondary">
                            作成: {formatDate(selectedItem.content.metadata.createdAt)}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        AI分析結果
                      </Typography>
                      
                      <Box mb={2}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          総合リスクスコア
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={selectedItem.aiAnalysis.riskScore * 100}
                          color={getRiskColor(selectedItem.aiAnalysis.riskScore)}
                          sx={{ height: 8, borderRadius: 4, mb: 1 }}
                        />
                        <Typography variant="caption">
                          {Math.round(selectedItem.aiAnalysis.riskScore * 100)}% - 
                          {selectedItem.aiAnalysis.riskScore >= 0.8 ? ' 高リスク' :
                           selectedItem.aiAnalysis.riskScore >= 0.6 ? ' 中リスク' :
                           selectedItem.aiAnalysis.riskScore >= 0.4 ? ' 低リスク' : ' 安全'}
                        </Typography>
                      </Box>

                      <Box mb={2}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          感情分析
                        </Typography>
                        <Chip
                          label={`${selectedItem.aiAnalysis.sentiment.label} (${selectedItem.aiAnalysis.sentiment.score.toFixed(2)})`}
                          size="small"
                          color={
                            selectedItem.aiAnalysis.sentiment.label === 'positive' ? 'success' :
                            selectedItem.aiAnalysis.sentiment.label === 'negative' ? 'error' : 'default'
                          }
                        />
                      </Box>

                      <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          検出フラグ
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {selectedItem.aiAnalysis.flags.map((flag) => (
                            <Chip
                              key={flag}
                              label={getAIFlagDescription(flag)}
                              size="small"
                              color="warning"
                              variant="outlined"
                            />
                          ))}
                        </Stack>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        カテゴリ別分析
                      </Typography>
                      
                      {selectedItem.aiAnalysis.categories.map((category) => (
                        <Box key={category.type} mb={2}>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="body2">
                              {category.type}
                            </Typography>
                            <Box display="flex" alignItems="center" gap={1}>
                              {getSeverityIcon(category.severity)}
                              <Typography variant="caption">
                                {Math.round(category.confidence * 100)}%
                              </Typography>
                            </Box>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={category.confidence * 100}
                            color={
                              category.severity === 'critical' ? 'error' :
                              category.severity === 'high' ? 'warning' :
                              category.severity === 'medium' ? 'info' : 'success'
                            }
                            sx={{ height: 4, borderRadius: 2 }}
                          />
                        </Box>
                      ))}
                    </CardContent>
                  </Card>
                </Grid>

                {selectedItem.reports && selectedItem.reports.length > 0 && (
                  <Grid size={12}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" gutterBottom>
                          ユーザー通報 ({selectedItem.reports.length}件)
                        </Typography>
                        <List dense>
                          {selectedItem.reports.map((report) => (
                            <ListItem key={report.id}>
                              <ListItemIcon>
                                <Report fontSize="small" />
                              </ListItemIcon>
                              <ListItemText
                                primary={report.reason}
                                secondary={`通報者ID: ${report.reporterId} - ${formatDate(report.timestamp)}`}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            
            <DialogActions>
              <Button onClick={() => setDetailsOpen(false)}>
                閉じる
              </Button>
              {selectedItem.status === 'pending' && (
                <>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircle />}
                    onClick={() => {
                      setActionType('approve');
                      setActionDialogOpen(true);
                    }}
                  >
                    承認
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<Cancel />}
                    onClick={() => {
                      setActionType('reject');
                      setActionDialogOpen(true);
                    }}
                  >
                    却下
                  </Button>
                </>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Action Dialog */}
      <Dialog
        open={actionDialogOpen}
        onClose={() => setActionDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {actionType === 'approve' ? 'コンテンツを承認' :
           actionType === 'reject' ? 'コンテンツを却下' : 'エスカレーション'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="処理理由・メモ"
            multiline
            rows={3}
            value={actionNotes}
            onChange={(e) => setActionNotes(e.target.value)}
            placeholder="処理の理由やメモを入力してください（任意）"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialogOpen(false)}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            color={actionType === 'approve' ? 'success' : 'error'}
            onClick={() => handleAction(actionType)}
          >
            {actionType === 'approve' ? '承認する' :
             actionType === 'reject' ? '却下する' : 'エスカレーション'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ContentModerationQueue;