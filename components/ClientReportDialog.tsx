'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  Button,
  Box,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Alert,
  Chip,
  Paper,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  Divider,
  Fade,
  Collapse
} from '@mui/material';
import {
  ReportProblem,
  CheckCircle,
  Warning,
  Info,
  Block,
  Gavel,
  ContentCopy,
  PersonOff,
  Security,
  NavigateNext,
  NavigateBefore
} from '@mui/icons-material';

interface ClientReportDialogProps {
  open: boolean;
  onClose: () => void;
  targetId: string;
  targetType: 'post' | 'comment' | 'user';
  targetContent?: string;
  onSuccess?: (reportId: string) => void;
}

const REPORT_CATEGORIES = [
  { 
    value: 'SPAM', 
    label: 'スパム・広告', 
    icon: <Block color="action" />,
    description: '無関係な広告、詐欺、繰り返し投稿',
    priority: 3,
    color: 'default' as const
  },
  { 
    value: 'HARASSMENT', 
    label: 'いじめ・嫌がらせ', 
    icon: <PersonOff color="warning" />,
    description: '個人への攻撃、脅迫、プライバシー侵害',
    priority: 7,
    color: 'warning' as const
  },
  { 
    value: 'VIOLENCE', 
    label: '暴力・危険行為', 
    icon: <Warning color="error" />,
    description: '暴力的、自傷、危険な行為の描写',
    priority: 8,
    color: 'error' as const
  },
  { 
    value: 'HATE_SPEECH', 
    label: 'ヘイトスピーチ', 
    icon: <Gavel color="error" />,
    description: '差別、偏見、憎悪を煽る内容',
    priority: 9,
    color: 'error' as const
  },
  { 
    value: 'MISINFORMATION', 
    label: '誤情報・フェイク', 
    icon: <Info color="info" />,
    description: '虚偽情報、誤解を招く内容',
    priority: 5,
    color: 'info' as const
  },
  { 
    value: 'INAPPROPRIATE', 
    label: '不適切なコンテンツ', 
    icon: <Security color="warning" />,
    description: '性的、グロテスク、不快な内容',
    priority: 6,
    color: 'warning' as const
  },
  { 
    value: 'COPYRIGHT', 
    label: '著作権侵害', 
    icon: <ContentCopy color="action" />,
    description: '無断転載、盗作、権利侵害',
    priority: 4,
    color: 'default' as const
  },
  { 
    value: 'OTHER', 
    label: 'その他の問題', 
    icon: <ReportProblem color="action" />,
    description: '上記に該当しない規約違反',
    priority: 2,
    color: 'default' as const
  }
];

export default function ClientReportDialog({
  open,
  onClose,
  targetId,
  targetType,
  targetContent,
  onSuccess
}: ClientReportDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');

  const steps = ['カテゴリ選択', '詳細説明', '確認・送信'];

  // CSR対応
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleNext = () => {
    setError(null);
    
    if (activeStep === 0 && !category) {
      setError('通報理由を選択してください');
      return;
    }
    
    if (activeStep === 1 && description.length > 0 && description.length < 10) {
      setError('詳細は10文字以上で入力してください（または空欄のまま）');
      return;
    }
    
    if (activeStep === 2) {
      handleSubmit();
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!mounted) return;
    
    setLoading(true);
    setError(null);

    try {
      const selectedCategory = REPORT_CATEGORIES.find(c => c.value === category);
      
      // CSR環境でのみ実行
      const reportData = {
        targetId,
        targetType,
        category,
        description: description || `${selectedCategory?.label}の通報`,
        priority: selectedCategory?.priority || 1,
        reporterId: typeof window !== 'undefined' ? 
          localStorage.getItem('userId') || 'anonymous' : 'anonymous',
        metadata: {
          targetContent: targetContent?.substring(0, 500),
          timestamp: new Date().toISOString(),
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          screenResolution: typeof window !== 'undefined' ? 
            `${window.screen.width}x${window.screen.height}` : 'unknown'
        }
      };

      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reportData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '通報の送信に失敗しました');
      }

      setReportId(data.reportId);
      setResponseMessage(data.message || '通報を受け付けました');
      setEstimatedTime(data.estimatedResponseTime || '確認中');
      setSuccess(true);
      
      if (onSuccess) {
        onSuccess(data.reportId);
      }

      // 3秒後に自動的に閉じる
      setTimeout(() => {
        handleClose();
      }, 3000);
      
    } catch (err) {
      console.error('Error submitting report:', err);
      setError(err instanceof Error ? err.message : '通報の送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setCategory('');
    setDescription('');
    setError(null);
    setSuccess(false);
    setReportId(null);
    setResponseMessage('');
    setEstimatedTime('');
    onClose();
  };

  const getSelectedCategory = () => {
    return REPORT_CATEGORIES.find(c => c.value === category);
  };

  if (!mounted) {
    return null;
  }

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Fade in timeout={300}>
            <Box>
              <Typography variant="body1" gutterBottom sx={{ mb: 2 }}>
                最も適切な通報理由を選択してください
              </Typography>
              <RadioGroup 
                value={category} 
                onChange={(e) => {
                  setCategory(e.target.value);
                  setError(null);
                }}
              >
                <List sx={{ width: '100%' }}>
                  {REPORT_CATEGORIES.map((cat, index) => (
                    <React.Fragment key={cat.value}>
                      <ListItem
                        sx={{
                          borderRadius: 1,
                          mb: 1,
                          border: '1px solid',
                          borderColor: category === cat.value ? `${cat.color}.main` : 'divider',
                          bgcolor: category === cat.value ? `${cat.color}.light` : 'transparent',
                          '&:hover': {
                            bgcolor: 'action.hover',
                            cursor: 'pointer'
                          },
                          transition: 'all 0.3s ease'
                        }}
                        onClick={() => setCategory(cat.value)}
                      >
                        <FormControlLabel
                          value={cat.value}
                          control={<Radio color={cat.color} />}
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
                              <ListItemIcon sx={{ minWidth: 'auto' }}>
                                {cat.icon}
                              </ListItemIcon>
                              <Box flex={1}>
                                <Typography variant="subtitle1" fontWeight="medium">
                                  {cat.label}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {cat.description}
                                </Typography>
                              </Box>
                              <Chip
                                size="small"
                                label={`優先度${cat.priority}`}
                                color={cat.priority >= 7 ? 'error' : cat.priority >= 4 ? 'warning' : 'default'}
                                variant="outlined"
                              />
                            </Box>
                          }
                          sx={{ width: '100%', m: 0 }}
                        />
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              </RadioGroup>
            </Box>
          </Fade>
        );

      case 1:
        return (
          <Fade in timeout={300}>
            <Box>
              <Typography variant="body1" gutterBottom>
                詳細な説明（任意）
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                具体的な内容を記載いただくと、より迅速かつ適切な対応が可能です
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={5}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setError(null);
                }}
                placeholder="問題の詳細、背景、影響などを具体的に記載してください..."
                variant="outlined"
                helperText={`${description.length}/1000文字`}
                inputProps={{ maxLength: 1000 }}
              />
              {targetContent && (
                <Collapse in={Boolean(targetContent)}>
                  <Paper variant="outlined" sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="caption" color="text.secondary" gutterBottom>
                      通報対象のコンテンツ：
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                      "{targetContent.substring(0, 200)}
                      {targetContent.length > 200 && '...'}"
                    </Typography>
                  </Paper>
                </Collapse>
              )}
            </Box>
          </Fade>
        );

      case 2:
        const selectedCat = getSelectedCategory();
        return (
          <Fade in timeout={300}>
            <Box>
              {success ? (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <CheckCircle color="success" sx={{ fontSize: 72, mb: 2 }} />
                  <Typography variant="h5" gutterBottom fontWeight="medium">
                    通報を受け付けました
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    通報ID: {reportId}
                  </Typography>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    {responseMessage}
                  </Alert>
                  <Chip 
                    icon={<Info />}
                    label={`対応予定: ${estimatedTime}`}
                    color="info"
                    variant="outlined"
                  />
                </Box>
              ) : (
                <>
                  <Typography variant="h6" gutterBottom>
                    通報内容の最終確認
                  </Typography>
                  <Paper elevation={0} sx={{ p: 3, bgcolor: 'grey.50' }}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        カテゴリ
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        {selectedCat?.icon}
                        <Typography variant="body1" fontWeight="medium">
                          {selectedCat?.label}
                        </Typography>
                        <Chip
                          size="small"
                          label={`優先度 ${selectedCat?.priority}/10`}
                          color={selectedCat?.priority >= 7 ? 'error' : 
                                selectedCat?.priority >= 4 ? 'warning' : 'default'}
                        />
                      </Box>
                    </Box>
                    
                    {description && (
                      <>
                        <Divider sx={{ my: 2 }} />
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">
                            詳細説明
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                            {description}
                          </Typography>
                        </Box>
                      </>
                    )}
                    
                    <Divider sx={{ my: 2 }} />
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        対象
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {targetType === 'post' && '投稿'}
                        {targetType === 'comment' && 'コメント'}
                        {targetType === 'user' && 'ユーザー'}
                        （ID: {targetId.slice(-8)}）
                      </Typography>
                    </Box>
                  </Paper>
                  
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    虚偽の通報や悪意ある通報は、アカウント制限の対象となります。
                    内容をご確認の上、送信してください。
                  </Alert>
                </>
              )}
            </Box>
          </Fade>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={success ? undefined : handleClose}
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { 
          borderRadius: 2,
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        borderBottom: 1,
        borderColor: 'divider'
      }}>
        <ReportProblem color="error" />
        <Typography variant="h6">
          コンテンツを通報
        </Typography>
      </DialogTitle>
      
      <DialogContent sx={{ mt: 2 }}>
        {!success && (
          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        )}

        {error && (
          <Collapse in={Boolean(error)}>
            <Alert 
              severity="error" 
              sx={{ mb: 2 }} 
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          </Collapse>
        )}

        <Box sx={{ minHeight: 300 }}>
          {renderStepContent()}
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ 
        px: 3, 
        py: 2,
        borderTop: 1,
        borderColor: 'divider'
      }}>
        {!success && (
          <>
            <Button 
              onClick={handleClose}
              disabled={loading}
            >
              キャンセル
            </Button>
            <Box sx={{ flex: '1 1 auto' }} />
            {activeStep > 0 && (
              <Button 
                onClick={handleBack}
                disabled={loading}
                startIcon={<NavigateBefore />}
              >
                戻る
              </Button>
            )}
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={loading || (activeStep === 0 && !category)}
              color={activeStep === 2 ? 'error' : 'primary'}
              endIcon={activeStep < 2 ? <NavigateNext /> : null}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : activeStep === 2 ? (
                '通報を送信'
              ) : (
                '次へ'
              )}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}