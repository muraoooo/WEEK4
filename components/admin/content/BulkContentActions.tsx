'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Stack,
  LinearProgress,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  CheckCircle,
  Cancel,
  Schedule,
  Visibility,
  Delete,
  Edit,
  Category,
  Flag,
  AutoAwesome,
  Download,
  Upload,
  Refresh,
  Warning,
  Info,
  Close,
} from '@mui/icons-material';

interface BulkAction {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'moderation' | 'content' | 'user' | 'system';
  requiresConfirmation: boolean;
  parameters?: Array<{
    name: string;
    type: 'text' | 'select' | 'multiselect' | 'date' | 'number';
    label: string;
    options?: string[];
    required: boolean;
    defaultValue?: any;
  }>;
}

interface BulkActionJob {
  id: string;
  action: BulkAction;
  targetCount: number;
  processedCount: number;
  successCount: number;
  errorCount: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt?: Date;
  completedAt?: Date;
  errors: Array<{
    itemId: string;
    error: string;
  }>;
  parameters: { [key: string]: any };
}

interface BulkContentActionsProps {
  selectedItems: string[];
  availableActions: BulkAction[];
  onExecuteAction: (actionId: string, parameters: any) => Promise<string>; // Returns job ID
  onCancelJob: (jobId: string) => Promise<void>;
  currentJobs: BulkActionJob[];
}

const BulkContentActions: React.FC<BulkContentActionsProps> = ({
  selectedItems,
  availableActions,
  onExecuteAction,
  onCancelJob,
  currentJobs,
}) => {
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<BulkAction | null>(null);
  const [actionParameters, setActionParameters] = useState<{ [key: string]: any }>({});
  const [confirmationStep, setConfirmationStep] = useState(0);
  const [executing, setExecuting] = useState(false);

  const handleActionSelect = (action: BulkAction) => {
    setSelectedAction(action);
    
    // Set default parameter values
    const defaultParams: { [key: string]: any } = {};
    action.parameters?.forEach(param => {
      if (param.defaultValue !== undefined) {
        defaultParams[param.name] = param.defaultValue;
      }
    });
    setActionParameters(defaultParams);
    
    setActionDialogOpen(true);
    setConfirmationStep(0);
  };

  const handleParameterChange = (paramName: string, value: any) => {
    setActionParameters(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  const validateParameters = () => {
    if (!selectedAction?.parameters) return true;
    
    return selectedAction.parameters.every(param => {
      if (param.required) {
        const value = actionParameters[param.name];
        return value !== undefined && value !== null && value !== '';
      }
      return true;
    });
  };

  const handleExecuteAction = async () => {
    if (!selectedAction) return;

    setExecuting(true);
    try {
      await onExecuteAction(selectedAction.id, actionParameters);
      setActionDialogOpen(false);
      setSelectedAction(null);
      setActionParameters({});
      setConfirmationStep(0);
    } catch (error) {
      console.error('Failed to execute bulk action:', error);
    } finally {
      setExecuting(false);
    }
  };

  const getActionsByCategory = (category: string) => {
    return availableActions.filter(action => action.category === category);
  };

  const getJobStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'running': return 'info';
      case 'failed': return 'error';
      case 'cancelled': return 'warning';
      default: return 'primary';
    }
  };

  const formatDuration = (start: Date, end?: Date) => {
    const endTime = end || new Date();
    const duration = endTime.getTime() - start.getTime();
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}分${seconds % 60}秒`;
    }
    return `${seconds}秒`;
  };

  const renderParameterInput = (param: any) => {
    const value = actionParameters[param.name] || '';

    switch (param.type) {
      case 'select':
        return (
          <FormControl fullWidth>
            <InputLabel>{param.label}</InputLabel>
            <Select
              value={value}
              label={param.label}
              onChange={(e) => handleParameterChange(param.name, e.target.value)}
            >
              {param.options?.map((option: string) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'multiselect':
        return (
          <FormControl fullWidth>
            <InputLabel>{param.label}</InputLabel>
            <Select
              multiple
              value={Array.isArray(value) ? value : []}
              label={param.label}
              onChange={(e) => handleParameterChange(param.name, e.target.value)}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((val) => (
                    <Chip key={val} label={val} size="small" />
                  ))}
                </Box>
              )}
            >
              {param.options?.map((option: string) => (
                <MenuItem key={option} value={option}>
                  <Checkbox checked={(Array.isArray(value) ? value : []).indexOf(option) > -1} />
                  <ListItemText primary={option} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'number':
        return (
          <TextField
            fullWidth
            type="number"
            label={param.label}
            value={value}
            onChange={(e) => handleParameterChange(param.name, Number(e.target.value))}
          />
        );

      case 'date':
        return (
          <TextField
            fullWidth
            type="datetime-local"
            label={param.label}
            value={value}
            onChange={(e) => handleParameterChange(param.name, e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        );

      default:
        return (
          <TextField
            fullWidth
            label={param.label}
            value={value}
            onChange={(e) => handleParameterChange(param.name, e.target.value)}
            multiline={param.name.includes('note') || param.name.includes('reason')}
            rows={param.name.includes('note') || param.name.includes('reason') ? 3 : 1}
          />
        );
    }
  };

  const steps = selectedAction ? [
    'アクションを選択',
    'パラメータを設定',
    selectedAction.requiresConfirmation ? '実行を確認' : '実行'
  ] : [];

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        一括操作
      </Typography>

      {selectedItems.length === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          一括操作を行うには、まず対象のアイテムを選択してください。
        </Alert>
      )}

      {/* Action Categories */}
      {selectedItems.length > 0 && (
        <Grid container spacing={3} mb={4}>
          {/* Moderation Actions */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                  <Flag sx={{ mr: 1, verticalAlign: 'middle' }} />
                  モデレーション ({selectedItems.length}件選択中)
                </Typography>
                <Stack spacing={2}>
                  {getActionsByCategory('moderation').map((action) => (
                    <Button
                      key={action.id}
                      fullWidth
                      variant="outlined"
                      startIcon={action.icon}
                      onClick={() => handleActionSelect(action)}
                      sx={{ justifyContent: 'flex-start' }}
                    >
                      <Box textAlign="left" sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {action.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {action.description}
                        </Typography>
                      </Box>
                    </Button>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Content Actions */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                  <Edit sx={{ mr: 1, verticalAlign: 'middle' }} />
                  コンテンツ操作
                </Typography>
                <Stack spacing={2}>
                  {getActionsByCategory('content').map((action) => (
                    <Button
                      key={action.id}
                      fullWidth
                      variant="outlined"
                      startIcon={action.icon}
                      onClick={() => handleActionSelect(action)}
                      sx={{ justifyContent: 'flex-start' }}
                    >
                      <Box textAlign="left" sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {action.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {action.description}
                        </Typography>
                      </Box>
                    </Button>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* System Actions */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                  <AutoAwesome sx={{ mr: 1, verticalAlign: 'middle' }} />
                  システム操作
                </Typography>
                <Stack spacing={2}>
                  {getActionsByCategory('system').map((action) => (
                    <Button
                      key={action.id}
                      fullWidth
                      variant="outlined"
                      startIcon={action.icon}
                      onClick={() => handleActionSelect(action)}
                      sx={{ justifyContent: 'flex-start' }}
                    >
                      <Box textAlign="left" sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {action.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {action.description}
                        </Typography>
                      </Box>
                    </Button>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* User Actions */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                  <AutoAwesome sx={{ mr: 1, verticalAlign: 'middle' }} />
                  ユーザー操作
                </Typography>
                <Stack spacing={2}>
                  {getActionsByCategory('user').map((action) => (
                    <Button
                      key={action.id}
                      fullWidth
                      variant="outlined"
                      startIcon={action.icon}
                      onClick={() => handleActionSelect(action)}
                      sx={{ justifyContent: 'flex-start' }}
                    >
                      <Box textAlign="left" sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {action.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {action.description}
                        </Typography>
                      </Box>
                    </Button>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Current Jobs */}
      {currentJobs.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              実行中のジョブ
            </Typography>
            {currentJobs.map((job) => (
              <Box key={job.id} sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {job.action.name}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Chip
                      label={job.status}
                      color={getJobStatusColor(job.status)}
                      size="small"
                    />
                    {job.status === 'running' && (
                      <IconButton
                        size="small"
                        onClick={() => onCancelJob(job.id)}
                        color="error"
                      >
                        <Stop />
                      </IconButton>
                    )}
                  </Box>
                </Box>

                <Box mb={2}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="caption" color="text.secondary">
                      進行状況: {job.processedCount} / {job.targetCount}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {Math.round((job.processedCount / job.targetCount) * 100)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(job.processedCount / job.targetCount) * 100}
                    color={getJobStatusColor(job.status)}
                  />
                </Box>

                <Grid container spacing={2}>
                  <Grid size={4}>
                    <Typography variant="caption" color="text.secondary">
                      成功: {job.successCount}
                    </Typography>
                  </Grid>
                  <Grid size={4}>
                    <Typography variant="caption" color="text.secondary">
                      エラー: {job.errorCount}
                    </Typography>
                  </Grid>
                  <Grid size={4}>
                    <Typography variant="caption" color="text.secondary">
                      所要時間: {job.startedAt ? formatDuration(job.startedAt, job.completedAt) : '-'}
                    </Typography>
                  </Grid>
                </Grid>

                {job.errors.length > 0 && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    <Typography variant="caption">
                      {job.errors.length}件のエラーが発生しました。詳細はログを確認してください。
                    </Typography>
                  </Alert>
                )}
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Action Dialog */}
      <Dialog
        open={actionDialogOpen}
        onClose={() => setActionDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              一括操作: {selectedAction?.name}
            </Typography>
            <IconButton onClick={() => setActionDialogOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          {selectedAction && (
            <Box>
              <Stepper activeStep={confirmationStep} orientation="vertical">
                <Step>
                  <StepLabel>アクション情報</StepLabel>
                  <StepContent>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        {selectedAction.description}
                      </Typography>
                    </Alert>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      対象アイテム数: {selectedItems.length}件
                    </Typography>
                    <Button onClick={() => setConfirmationStep(1)} sx={{ mt: 1 }}>
                      次へ
                    </Button>
                  </StepContent>
                </Step>

                <Step>
                  <StepLabel>パラメータ設定</StepLabel>
                  <StepContent>
                    {selectedAction.parameters && selectedAction.parameters.length > 0 ? (
                      <Grid container spacing={2}>
                        {selectedAction.parameters.map((param) => (
                          <Grid size={12} key={param.name}>
                            {renderParameterInput(param)}
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        このアクションには追加のパラメータは必要ありません。
                      </Typography>
                    )}
                    <Box sx={{ mt: 2 }}>
                      <Button onClick={() => setConfirmationStep(0)} sx={{ mr: 1 }}>
                        戻る
                      </Button>
                      <Button
                        onClick={() => setConfirmationStep(2)}
                        disabled={!validateParameters()}
                      >
                        次へ
                      </Button>
                    </Box>
                  </StepContent>
                </Step>

                <Step>
                  <StepLabel>実行確認</StepLabel>
                  <StepContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        この操作は{selectedItems.length}件のアイテムに適用されます。
                        実行後は元に戻すことができません。よろしいですか？
                      </Typography>
                    </Alert>

                    {Object.keys(actionParameters).length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          設定されたパラメータ:
                        </Typography>
                        {Object.entries(actionParameters).map(([key, value]) => (
                          <Typography key={key} variant="body2" color="text.secondary">
                            {key}: {Array.isArray(value) ? value.join(', ') : String(value)}
                          </Typography>
                        ))}
                      </Box>
                    )}

                    <Box sx={{ mt: 2 }}>
                      <Button onClick={() => setConfirmationStep(1)} sx={{ mr: 1 }}>
                        戻る
                      </Button>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleExecuteAction}
                        disabled={executing}
                        startIcon={executing ? <Schedule /> : <PlayArrow />}
                      >
                        {executing ? '実行中...' : '実行する'}
                      </Button>
                    </Box>
                  </StepContent>
                </Step>
              </Stepper>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default BulkContentActions;