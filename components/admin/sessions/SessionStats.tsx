'use client';

import React from 'react';
import {
  Paper,
  Grid,
  Box,
  Typography,
  Stack,
  Chip,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  DeviceHub,
  Security,
  Warning,
  AccessTime,
  Computer,
  Smartphone,
  Tablet,
  LocationOn,
  TrendingUp,
  People,
} from '@mui/icons-material';

interface SessionStats {
  total: number;
  active: number;
  expired: number;
  suspicious: number;
  deviceStats: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  locationStats: {
    [country: string]: number;
  };
  recentActivity: {
    last1h: number;
    last24h: number;
    last7d: number;
  };
}

interface SessionStatsProps {
  stats: SessionStats;
  loading?: boolean;
}

export default function SessionStatsPanel({ stats, loading = false }: SessionStatsProps) {
  // Ensure stats has proper defaults
  const safeStats = {
    total: stats?.total || 0,
    active: stats?.active || 0,
    expired: stats?.expired || 0,
    suspicious: stats?.suspicious || 0,
    deviceStats: stats?.deviceStats || { desktop: 0, mobile: 0, tablet: 0 },
    locationStats: stats?.locationStats || {},
    recentActivity: stats?.recentActivity || { last1h: 0, last24h: 0, last7d: 0 },
  };

  const getDevicePercentage = (device: keyof SessionStats['deviceStats']) => {
    return safeStats.total > 0 && safeStats.deviceStats && safeStats.deviceStats[device] !== undefined
      ? Math.round((safeStats.deviceStats[device] / safeStats.total) * 100) 
      : 0;
  };

  const getStatusPercentage = (value: number) => {
    return safeStats.total > 0 ? Math.round((value / safeStats.total) * 100) : 0;
  };

  const topLocations = safeStats.locationStats && typeof safeStats.locationStats === 'object' 
    ? Object.entries(safeStats.locationStats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
    : [];

  if (loading) {
    return (
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          セッション統計
        </Typography>
        <LinearProgress />
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
        <DeviceHub />
        セッション統計
      </Typography>
      
      <Grid container spacing={2}>
        {/* Overall Stats */}
        <Grid item xs={12} md={6}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              全体統計
            </Typography>
            <Stack spacing={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Stack direction="row" spacing={1} alignItems="center">
                  <People fontSize="small" />
                  <Typography variant="body2">総セッション数</Typography>
                </Stack>
                <Chip label={safeStats.total} color="primary" />
              </Box>
              
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Stack direction="row" spacing={1} alignItems="center">
                  <DeviceHub fontSize="small" color="success" />
                  <Typography variant="body2">アクティブ</Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip label={safeStats.active} color="success" size="small" />
                  <Typography variant="caption" color="text.secondary">
                    {getStatusPercentage(safeStats.active)}%
                  </Typography>
                </Stack>
              </Box>
              
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Stack direction="row" spacing={1} alignItems="center">
                  <AccessTime fontSize="small" color="error" />
                  <Typography variant="body2">期限切れ</Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip label={safeStats.expired} color="error" size="small" />
                  <Typography variant="caption" color="text.secondary">
                    {getStatusPercentage(safeStats.expired)}%
                  </Typography>
                </Stack>
              </Box>
              
              {safeStats.suspicious > 0 && (
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Warning fontSize="small" color="warning" />
                    <Typography variant="body2">疑わしい</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label={safeStats.suspicious} color="warning" size="small" />
                    <Typography variant="caption" color="text.secondary">
                      {getStatusPercentage(safeStats.suspicious)}%
                    </Typography>
                  </Stack>
                </Box>
              )}
            </Stack>
          </Box>
        </Grid>

        {/* Device Stats */}
        <Grid item xs={12} md={6}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              デバイス別
            </Typography>
            <Stack spacing={2}>
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Computer fontSize="small" />
                    <Typography variant="body2">デスクトップ</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2">{safeStats.deviceStats.desktop}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {getDevicePercentage('desktop')}%
                    </Typography>
                  </Stack>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={getDevicePercentage('desktop')} 
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
              
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Smartphone fontSize="small" />
                    <Typography variant="body2">モバイル</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2">{safeStats.deviceStats.mobile}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {getDevicePercentage('mobile')}%
                    </Typography>
                  </Stack>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={getDevicePercentage('mobile')} 
                  color="secondary"
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
              
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Tablet fontSize="small" />
                    <Typography variant="body2">タブレット</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2">{safeStats.deviceStats.tablet}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {getDevicePercentage('tablet')}%
                    </Typography>
                  </Stack>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={getDevicePercentage('tablet')} 
                  color="info"
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
            </Stack>
          </Box>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Box>
            <Typography variant="subtitle2" gutterBottom display="flex" alignItems="center" gap={1}>
              <TrendingUp fontSize="small" />
              最近の活動
            </Typography>
            <Stack spacing={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2">過去1時間</Typography>
                <Chip label={safeStats.recentActivity.last1h} size="small" color="primary" />
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2">過去24時間</Typography>
                <Chip label={safeStats.recentActivity.last24h} size="small" color="primary" />
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2">過去7日間</Typography>
                <Chip label={safeStats.recentActivity.last7d} size="small" color="primary" />
              </Box>
            </Stack>
          </Box>
        </Grid>

        {/* Top Locations */}
        <Grid item xs={12} md={6}>
          <Box>
            <Typography variant="subtitle2" gutterBottom display="flex" alignItems="center" gap={1}>
              <LocationOn fontSize="small" />
              上位の接続元
            </Typography>
            <Stack spacing={1}>
              {topLocations.map(([location, count], index) => (
                <Box key={location} display="flex" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      #{index + 1}
                    </Typography>
                    <Typography variant="body2">
                      {location}
                    </Typography>
                  </Stack>
                  <Chip label={count} size="small" variant="outlined" />
                </Box>
              ))}
              {topLocations.length === 0 && (
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  データがありません
                </Typography>
              )}
            </Stack>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
}