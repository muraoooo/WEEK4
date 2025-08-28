'use client';

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio,
  TextField,
  Box,
  Alert,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Fade,
  IconButton,
} from '@mui/material';
import {
  Flag,
  Warning,
  Block,
  PersonOff,
  ChatBubble,
  Article,
  CheckCircle,
  Close,
  ErrorOutline,
  SecurityOutlined,
  ChildCare,
  MonetizationOn,
  Copyright,
  Gavel,
} from '@mui/icons-material';

export type ReportCategory = 
  | 'spam'
  | 'harassment'
  | 'violence'
  | 'hate_speech'
  | 'misinformation'
  | 'inappropriate'
  | 'child_safety'
  | 'fraud'
  | 'copyright'
  | 'other';

interface ReportTarget {
  type: 'post' | 'comment' | 'user';
  id: string;
  content?: string;
  authorName?: string;
  authorId?: string;
}

interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
  target: ReportTarget;
  currentUserId: string;
  onSuccess?: (reportId: string) => void;
}

const reportCategories = [
  {
    value: 'spam' as ReportCategory,
    label: 'スパムまたは誤解を招くコンテンツ',
    icon: <Block />,
    priority: 2,
    description: '繰り返しの投稿、偽の情報、クリックベイトなど',
  },
  {
    value: 'harassment' as ReportCategory,
    label: 'いじめや嫌がらせ',
    icon: <PersonOff />,
    priority: 4,
    description: '個人への攻撃、脅迫、プライバシー侵害など',
  },
  {
    value: 'violence' as ReportCategory,
    label: '暴力的または危険なコンテンツ',
    icon: <Warning color="error" />,
    priority: 5,
    description: '暴力の描写、自傷行為、危険な行為の推奨など',
  },
  {
    value: 'hate_speech' as ReportCategory,
    label: 'ヘイトスピーチ',
    icon: <ErrorOutline color="error" />,
    priority: 5,
    description: '差別的な発言、特定のグループへの攻撃など',
  },
  {
    value: 'misinformation' as ReportCategory,
    label: '誤情報',
    icon: <ErrorOutline />,
    priority: 3,
    description: '明らかに虚偽の情報、陰謀論など',
  },
  {
    value: 'child_safety' as ReportCategory,
    label: '児童の安全',
    icon: <ChildCare color="error" />,
    priority: 5,
    description: '未成年者に関する不適切なコンテンツ',
  },
  {
    value: 'fraud' as ReportCategory,
    label: '詐欺や金銭的被害',
    icon: <MonetizationOn color="error" />,
    priority: 5,
    description: '金銭的詐欺、フィッシング、なりすましなど',
  },
  {
    value: 'copyright' as ReportCategory,
    label: '著作権侵害',
    icon: <Copyright />,
    priority: 2,
    description: '無断転載、著作権違反など',
  },
  {
    value: 'inappropriate' as ReportCategory,
    label: '不適切なコンテンツ',
    icon: <SecurityOutlined />,
    priority: 3,
    description: '性的なコンテンツ、グロテスクな内容など',
  },
  {
    value: 'other' as ReportCategory,
    label: 'その他',
    icon: <Flag />,
    priority: 1,
    description: '上記に該当しない問題',
  },
];

const steps = ['通報対象の確認', '理由の選択', '詳細と送信'];

export default function ReportDialog({
  open,
  onClose,
  target,
  currentUserId,
  onSuccess,
}: ReportDialogProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | ''>('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);

  const handleNext = () => {
    if (activeStep === 0) {
      setActiveStep(1);
    } else if (activeStep === 1 && selectedCategory) {
      setActiveStep(2);
    } else if (activeStep === 2) {
      handleSubmit();
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setSelectedCategory('');
    setDescription('');
    setError(null);
    setSuccess(false);
    setReportId(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedCategory) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetType: target.type,
          targetId: target.id,
          category: selectedCategory,
          description,
          reporterId: currentUserId,
          targetAuthorId: target.authorId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '通報の送信に失敗しました');
      }

      setReportId(data.reportId);
      setSuccess(true);
      
      if (onSuccess) {
        onSuccess(data.reportId);
      }

      // 3秒後に自動的に閉じる
      setTimeout(() => {
        handleClose();
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '通報の送信に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const getTargetTypeLabel = () => {
    switch (target.type) {
      case 'post':
        return '投稿';
      case 'comment':
        return 'コメント';
      case 'user':
        return 'ユーザー';
      default:
        return 'コンテンツ';
    }
  };

  const getTargetIcon = () => {
    switch (target.type) {
      case 'post':
        return <Article />;
      case 'comment':
        return <ChatBubble />;
      case 'user':
        return <PersonOff />;
      default:
        return <Flag />;
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              虚偽の通報は利用規約違反となり、アカウント制限の対象となる場合があります。
            </Alert>
            
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Box display="flex" alignItems="center" mb={1}>
                {getTargetIcon()}
                <Typography variant="subtitle1" ml={1}>
                  通報対象: {getTargetTypeLabel()}
                </Typography>
              </Box>
              
              {target.authorName && (
                <Typography variant="body2" color="text.secondary" mb={1}>
                  投稿者: {target.authorName}
                </Typography>
              )}
              
              {target.content && (
                <Box sx={{ p: 1, bgcolor: 'grey.100', borderRadius: 1, mt: 1 }}>
                  <Typography variant="body2" sx={{ 
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                  }}>
                    {target.content}
                  </Typography>
                </Box>
              )}
            </Paper>

            <Typography variant="body2" color="text.secondary">
              この{getTargetTypeLabel()}を通報する理由を次のステップで選択してください。
            </Typography>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              通報理由を選択してください
            </Typography>
            
            <FormControl component="fieldset" fullWidth>
              <RadioGroup
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as ReportCategory)}
              >
                <List>
                  {reportCategories.map((category) => (
                    <ListItem
                      key={category.value}
                      sx={{
                        border: 1,
                        borderColor: selectedCategory === category.value ? 'primary.main' : 'grey.300',
                        borderRadius: 1,
                        mb: 1,
                        transition: 'all 0.2s',
                        '&:hover': {
                          borderColor: 'primary.light',
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      <FormControlLabel
                        value={category.value}
                        control={<Radio />}
                        label=""
                        sx={{ mr: 0 }}
                      />
                      <ListItemIcon>{category.icon}</ListItemIcon>
                      <ListItemText
                        primary={category.label}
                        secondary={category.description}
                      />
                      {category.priority >= 4 && (
                        <Chip
                          label="優先"
                          size="small"
                          color="error"
                          variant="outlined"
                        />
                      )}
                    </ListItem>
                  ))}
                </List>
              </RadioGroup>
            </FormControl>
          </Box>
        );

      case 2:
        return (
          <Box>
            {success ? (
              <Fade in={success}>
                <Box textAlign="center" py={3}>
                  <CheckCircle color="success" sx={{ fontSize: 60, mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    通報を受け付けました
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    通報ID: {reportId}
                  </Typography>
                  <Alert severity="success" sx={{ mt: 2 }}>
                    ご報告ありがとうございます。内容を確認し、適切に対処いたします。
                    必要に応じて、登録されたメールアドレスに結果をお知らせします。
                  </Alert>
                </Box>
              </Fade>
            ) : (
              <>
                <Typography variant="subtitle1" gutterBottom>
                  詳細情報（任意）
                </Typography>
                
                <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                  <Box display="flex" alignItems="center" mb={1}>
                    {reportCategories.find(c => c.value === selectedCategory)?.icon}
                    <Typography variant="subtitle2" ml={1}>
                      選択した理由: {reportCategories.find(c => c.value === selectedCategory)?.label}
                    </Typography>
                  </Box>
                </Paper>

                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  variant="outlined"
                  label="詳細説明（任意）"
                  placeholder="問題の詳細や、管理者に伝えたい追加情報があれば記入してください"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  helperText={`${description.length}/500文字`}
                  inputProps={{ maxLength: 500 }}
                  sx={{ mb: 2 }}
                />

                <Alert severity="warning">
                  送信後は取り消しできません。内容を確認の上、送信してください。
                </Alert>

                {error && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                  </Alert>
                )}
              </>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { minHeight: 500 }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">コンテンツの通報</Typography>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {renderStepContent(activeStep)}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {!success && (
          <>
            <Button
              disabled={activeStep === 0 || submitting}
              onClick={handleBack}
            >
              戻る
            </Button>
            <Box sx={{ flex: '1 1 auto' }} />
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={
                (activeStep === 1 && !selectedCategory) ||
                submitting
              }
              endIcon={submitting && <CircularProgress size={20} />}
            >
              {activeStep === steps.length - 1 ? '送信' : '次へ'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}