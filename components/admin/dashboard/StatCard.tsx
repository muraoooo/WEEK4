import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
} from '@mui/icons-material';

interface StatCardProps {
  title: string;
  value: string;
  change?: number;
  changePercent?: number;
  status?: 'operational' | 'degraded' | 'down';
  icon: React.ReactNode;
  color: 'primary' | 'success' | 'warning' | 'info' | 'error';
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  changePercent,
  status,
  icon,
  color,
}) => {
  const getTrendIcon = () => {
    if (change === undefined) return null;
    if (change > 0) return <TrendingUp fontSize="small" />;
    if (change < 0) return <TrendingDown fontSize="small" />;
    return <TrendingFlat fontSize="small" />;
  };

  const getTrendColor = () => {
    if (change === undefined) return 'default';
    if (change > 0) return 'success';
    if (change < 0) return 'error';
    return 'default';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'success';
      case 'degraded':
        return 'warning';
      case 'down':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatChange = (value: number) => {
    return value > 0 ? `+${value}` : value.toString();
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box
            sx={{
              backgroundColor: (theme) => `${theme.palette[color].main}15`,
              borderRadius: 2,
              p: 1.5,
              color: (theme) => theme.palette[color].main,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
          {status && (
            <Chip
              label={status}
              color={getStatusColor(status) as any}
              size="small"
              sx={{ textTransform: 'capitalize' }}
            />
          )}
        </Box>

        <Typography color="textSecondary" gutterBottom variant="body2">
          {title}
        </Typography>
        
        <Typography variant="h4" component="div" sx={{ fontWeight: 600, mb: 1 }}>
          {value}
        </Typography>

        {changePercent !== undefined && (
          <Box display="flex" alignItems="center" gap={1}>
            <Box
              display="flex"
              alignItems="center"
              sx={{
                color: (theme) => 
                  change && change > 0 
                    ? theme.palette.success.main 
                    : change && change < 0 
                    ? theme.palette.error.main 
                    : theme.palette.text.secondary,
              }}
            >
              {getTrendIcon()}
              <Typography variant="body2" sx={{ ml: 0.5 }}>
                {formatChange(changePercent)}%
              </Typography>
            </Box>
            <Typography variant="body2" color="textSecondary">
              前日比
            </Typography>
            {change !== undefined && (
              <Typography variant="body2" color="textSecondary">
                ({formatChange(change)})
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;