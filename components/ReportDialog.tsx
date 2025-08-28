'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Alert,
  Box,
  Typography,
  Chip,
  CircularProgress,
  Fade,
  IconButton,
  Paper
} from '@mui/material';
import {
  Close,
  ReportProblem,
  CheckCircle,
  Warning,
  Info
} from '@mui/icons-material';

interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
  targetId: string;
  targetType: 'post' | 'comment' | 'user';
  targetContent?: string;
  reporterId: string;
}

interface ReportCategory {
  id: string;
  label: string;
  description: string;
  priority: number;
  icon?: React.ReactNode;
}

const REPORT_CATEGORIES: ReportCategory[] = [
  {
    id: 'SPAM',
    label: 'スパム・広告',
    description: '無関係な広告や繰り返しの投稿',
    priority: 1,
    icon: <Warning sx={{ fontSize: 20 }} />
  },
  {
    id: 'HARASSMENT',
    label: 'いじめ・嫌がらせ',
    description: '他のユーザーへの攻撃的な行為',
    priority: 4,
    icon: <ReportProblem sx={{ fontSize: 20 }} />
  },
  {
    id: 'VIOLENCE',
    label: '暴力的な内容',
    description: '暴力を助長または描写する内容',
    priority: 5,
    icon: <ReportProblem sx={{ fontSize: 20, color: 'error.main' }} />
  },
  {
    id: 'HATE_SPEECH',
    label: 'ヘイトスピーチ',
    description: '差別的または憎悪を煽る内容',
    priority: 5,
    icon: <ReportProblem sx={{ fontSize: 20, color: 'error.main' }} />
  },
  {
    id: 'MISINFORMATION',
    label: '誤情報・デマ',
    description: '虚偽の情報や誤解を招く内容',
    priority: 2,
    icon: <Info sx={{ fontSize: 20 }} />
  },
  {
    id: 'INAPPROPRIATE',
    label: '不適切な内容',
    description: '性的または不快な内容',
    priority: 3,
    icon: <Warning sx={{ fontSize: 20 }} />
  },
  {
    id: 'COPYRIGHT',
    label: '著作権侵害',
    description: '他者の知的財産権を侵害する内容',
    priority: 2,
    icon: <Info sx={{ fontSize: 20 }} />
  },
  {
    id: 'OTHER',
    label: 'その他',
    description: '上記に該当しない問題',
    priority: 1,
    icon: <Info sx={{ fontSize: 20 }} />
  }
];

const STEPS = ['理由を選択', '詳細を入力', '確認・送信'];

export default function ReportDialog({
  open,
  onClose,
  targetId,
  targetType,
  targetContent,
  reporterId
}: ReportDialogProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedCategory = REPORT_CATEGORIES.find(c => c.id === category);

  const handleNext = () => {
    if (activeStep === 0 && !category) {
      setError('通報理由を選択してください');
      return;
    }
    if (activeStep === 1 && description.length < 10) {
      setError('詳細を10文字以上入力してください');
      return;
    }
    setError(null);
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setError(null);
    setActiveStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId,
          targetType,
          category,
          description,
          reporterId,
          metadata: {
            targetContent: targetContent?.substring(0, 200),
            timestamp: new Date().toISOString()
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '通報の送信に失敗しました');
      }

      setSuccess(true);
      setTimeout(() => {
        handleReset();
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '通報の送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setCategory('');
    setDescription('');
    setError(null);
    setSuccess(false);
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 4) return 'error';
    if (priority >= 3) return 'warning';
    return 'default';
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 5) return '緊急';
    if (priority >= 4) return '高';
    if (priority >= 3) return '中';
    return '低';
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">
            {targetType === 'post' && '投稿を通報'}
            {targetType === 'comment' && 'コメントを通報'}
            {targetType === 'user' && 'ユーザーを通報'}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {success ? (
          <Fade in={success}>
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              py={4}
            >
              <CheckCircle color="success" sx={{ fontSize: 64, mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                通報を受け付けました
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center">
                内容を確認し、適切な対応を行います。
                ご協力ありがとうございました。
              </Typography>
            </Box>
          </Fade>
        ) : (
          <>
            <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
              {STEPS.map(label => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {activeStep === 0 && (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  最も適切な理由を選択してください
                </Typography>
                <RadioGroup value={category} onChange={(e) => setCategory(e.target.value)}>
                  {REPORT_CATEGORIES.map(cat => (
                    <Paper
                      key={cat.id}
                      variant="outlined"
                      sx={{
                        mb: 1,
                        p: 1.5,
                        cursor: 'pointer',
                        borderColor: category === cat.id ? 'primary.main' : 'divider',
                        borderWidth: category === cat.id ? 2 : 1,
                        '&:hover': {
                          borderColor: 'primary.main',
                          bgcolor: 'action.hover'
                        }
                      }}
                      onClick={() => setCategory(cat.id)}
                    >
                      <FormControlLabel
                        value={cat.id}
                        control={<Radio />}
                        label={
                          <Box>
                            <Box display="flex" alignItems="center" gap={1}>
                              {cat.icon}
                              <Typography variant="subtitle2">{cat.label}</Typography>
                              <Chip
                                size="small"
                                label={`優先度: ${getPriorityLabel(cat.priority)}`}
                                color={getPriorityColor(cat.priority)}
                                sx={{ ml: 'auto' }}
                              />
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {cat.description}
                            </Typography>
                          </Box>
                        }
                        sx={{ width: '100%', m: 0 }}
                      />
                    </Paper>
                  ))}
                </RadioGroup>
              </Box>
            )}

            {activeStep === 1 && (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  詳細な情報を提供してください（任意ですが推奨）
                </Typography>
                <TextField
                  multiline
                  rows={4}
                  fullWidth
                  placeholder="具体的な問題点や背景情報を記入してください..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  variant="outlined"
                  helperText={`${description.length}/500文字`}
                  inputProps={{ maxLength: 500 }}
                />
                {targetContent && (
                  <Box mt={2}>
                    <Typography variant="caption" color="text.secondary">
                      通報対象の内容：
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 1, mt: 0.5 }}>
                      <Typography variant="body2" noWrap>
                        {targetContent}
                      </Typography>
                    </Paper>
                  </Box>
                )}
              </Box>
            )}

            {activeStep === 2 && (
              <Box>
                <Alert severity="info" sx={{ mb: 2 }}>
                  虚偽の通報は利用規約違反となる場合があります
                </Alert>
                <Typography variant="subtitle2" gutterBottom>
                  通報内容の確認
                </Typography>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Box display="flex" flexDirection="column" gap={1}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        通報理由：
                      </Typography>
                      <Typography variant="body1">
                        {selectedCategory?.label}
                      </Typography>
                    </Box>
                    {description && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          詳細：
                        </Typography>
                        <Typography variant="body2">
                          {description}
                        </Typography>
                      </Box>
                    )}
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        優先度：
                      </Typography>
                      <Chip
                        size="small"
                        label={getPriorityLabel(selectedCategory?.priority || 1)}
                        color={getPriorityColor(selectedCategory?.priority || 1)}
                      />
                    </Box>
                  </Box>
                </Paper>
              </Box>
            )}
          </>
        )}
      </DialogContent>

      {!success && (
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={loading}>
            キャンセル
          </Button>
          {activeStep > 0 && (
            <Button onClick={handleBack} disabled={loading}>
              戻る
            </Button>
          )}
          {activeStep < STEPS.length - 1 && (
            <Button variant="contained" onClick={handleNext} disabled={loading}>
              次へ
            </Button>
          )}
          {activeStep === STEPS.length - 1 && (
            <Button
              variant="contained"
              color="error"
              onClick={handleSubmit}
              disabled={loading}
              startIcon={loading && <CircularProgress size={20} />}
            >
              通報する
            </Button>
          )}
        </DialogActions>
      )}
    </Dialog>
  );
}