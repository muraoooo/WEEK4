'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  Paper,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Warning,
  CheckCircle,
  Error,
  Info,
  Report,
  Security,
  Psychology,
  Block,
  Language,
  PersonOff,
  MoneyOff,
} from '@mui/icons-material';

interface ModerationResult {
  score: number;
  flags: string[];
  recommendations: string[];
  confidence: number;
  categories: {
    violence: number;
    harassment: number;
    hate: number;
    spam: number;
    adult: number;
    fraud: number;
  };
  summary: string;
}

interface PostModerationProps {
  open: boolean;
  onClose: () => void;
  post: any;
  onAction: () => void;
}

export default function PostModeration({ open, onClose, post, onAction }: PostModerationProps) {
  const [loading, setLoading] = useState(false);
  const [moderationResult, setModerationResult] = useState<ModerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && post) {
      performModeration();
    }
  }, [open, post]);

  const performModeration = async () => {
    if (!post) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' , 'x-admin-secret': 'admin-development-secret-key' },
        body: JSON.stringify({ postId: post._id, content: post.content }),
      });

      if (!response.ok) {
        throw new (Error as any)('Failed to perform moderation');
      }

      const result = await response.json();
      setModerationResult(result.moderation);
    } catch (err) {
      console.error('Error performing moderation:', err);
      setError('モデレーション分析に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string) => {
    try {
      const response = await fetch('/api/admin/posts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' , 'x-admin-secret': 'admin-development-secret-key' },
        body: JSON.stringify({ postId: post._id, action }),
      });

      if (!response.ok) {
        throw new (Error as any)('Failed to perform action');
      }

      onAction();
      onClose();
    } catch (err) {
      console.error('Error performing action:', err);
      setError('アクションの実行に失敗しました');
    }
  };

  const getRiskLevel = (score: number) => {
    if (score >= 0.8) return { label: '非常に高リスク', color: 'error' as const };
    if (score >= 0.6) return { label: '高リスク', color: 'warning' as const };
    if (score >= 0.4) return { label: '中リスク', color: 'info' as const };
    return { label: '低リスク', color: 'success' as const };
  };

  const getCategoryIcon = (category: string): React.ReactElement => {
    const icons: { [key: string]: React.ReactElement } = {
      violence: <Warning color="error" />,
      harassment: <PersonOff color="warning" />,
      hate: <Block color="error" />,
      spam: <Report color="warning" />,
      adult: <Security color="warning" />,
      fraud: <MoneyOff color="error" />,
    };
    return icons[category] || <Info />;
  };

  const getFlagIcon = (flag: string): React.ReactElement => {
    const icons: { [key: string]: React.ReactElement } = {
      'offensive_language': <Language color="warning" />,
      'potential_harassment': <PersonOff color="warning" />,
      'spam_content': <Report color="warning" />,
      'violent_content': <Warning color="error" />,
      'hate_speech': <Block color="error" />,
      'inappropriate_content': <Security color="warning" />,
    };
    return icons[flag] || <Info />;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <Psychology color="primary" />
          <Typography variant="h6">AIモデレーション分析</Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : moderationResult ? (
          <Box>
            <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                総合リスクスコア
              </Typography>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <LinearProgress
                  variant="determinate"
                  value={moderationResult.score * 100}
                  sx={{ 
                    flexGrow: 1, 
                    height: 10, 
                    borderRadius: 5,
                    backgroundColor: 'grey.300',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: getRiskLevel(moderationResult.score).color === 'error' ? 'error.main' :
                                       getRiskLevel(moderationResult.score).color === 'warning' ? 'warning.main' :
                                       getRiskLevel(moderationResult.score).color === 'info' ? 'info.main' : 'success.main'
                    }
                  }}
                />
                <Typography variant="h6" fontWeight="bold">
                  {Math.round(moderationResult.score * 100)}%
                </Typography>
              </Box>
              <Chip 
                label={getRiskLevel(moderationResult.score).label}
                color={getRiskLevel(moderationResult.score).color}
                size="small"
              />
              <Typography variant="body2" sx={{ mt: 1 }}>
                信頼度: {Math.round(moderationResult.confidence * 100)}%
              </Typography>
            </Paper>

            <Typography variant="subtitle1" gutterBottom sx={{ mt: 3, mb: 2 }}>
              カテゴリー別分析
            </Typography>
            <List dense>
              {Object.entries(moderationResult.categories).map(([category, score]) => (
                <ListItem key={category}>
                  <ListItemIcon>
                    {getCategoryIcon(category)}
                  </ListItemIcon>
                  <ListItemText
                    primary={category.charAt(0).toUpperCase() + category.slice(1)}
                    secondary={
                      <LinearProgress
                        variant="determinate"
                        value={score * 100}
                        sx={{ mt: 1, height: 4, borderRadius: 2 }}
                      />
                    }
                  />
                  <Typography variant="body2" color="text.secondary">
                    {Math.round(score * 100)}%
                  </Typography>
                </ListItem>
              ))}
            </List>

            {moderationResult.flags && moderationResult.flags.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" gutterBottom>
                  検出されたフラグ
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {moderationResult.flags.map((flag, index) => (
                    <Chip
                      key={index}
                      icon={getFlagIcon(flag)}
                      label={flag.replace(/_/g, ' ')}
                      color="warning"
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </Box>
              </>
            )}

            {moderationResult.summary && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" gutterBottom>
                  分析サマリー
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {moderationResult.summary}
                </Typography>
              </>
            )}

            {moderationResult.recommendations && moderationResult.recommendations.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" gutterBottom>
                  推奨アクション
                </Typography>
                <List dense>
                  {moderationResult.recommendations.map((rec, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <CheckCircle color="primary" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={rec} />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </Box>
        ) : null}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>閉じる</Button>
        {moderationResult && moderationResult.score > 0.6 && (
          <>
            <Button 
              onClick={() => handleAction('hide')} 
              color="warning"
              variant="outlined"
            >
              非表示にする
            </Button>
            <Button 
              onClick={() => handleAction('delete')} 
              color="error"
              variant="contained"
            >
              削除する
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}