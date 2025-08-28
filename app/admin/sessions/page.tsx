'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Alert,
  Stack,
  CircularProgress,
} from '@mui/material';
import {
  Refresh,
  Security,
  FileDownload,
  Block,
  DeleteSweep,
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';

// Advanced session management components
import SessionFilters from '@/components/admin/sessions/SessionFilters';
import SessionStatsPanel from '@/components/admin/sessions/SessionStats';
import SimpleSessionsTable from '@/components/admin/sessions/SimpleSessionsTable';

interface Session {
  _id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  deviceInfo: {
    userAgent: string;
    ip: string;
    deviceType: string;
    browser?: string;
    os?: string;
  };
  createdAt: string;
  lastActivity: string;
  expiresAt: string;
  isActive: boolean;
  location?: string;
  country?: string;
  city?: string;
  isSuspicious?: boolean;
  loginCount?: number;
}

interface SessionFilterState {
  search: string;
  deviceType: string;
  status: string;
  location: string;
  createdAfter: Dayjs | null;
  createdBefore: Dayjs | null;
  lastActivityAfter: Dayjs | null;
  lastActivityBefore: Dayjs | null;
  showExpiredOnly: boolean;
  showSuspiciousOnly: boolean;
}

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

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [selectionModel, setSelectionModel] = useState<string[]>([]);
  const [sortModel, setSortModel] = useState<any[]>([]);
  const [stats, setStats] = useState<SessionStats>({
    total: 0,
    active: 0,
    expired: 0,
    suspicious: 0,
    deviceStats: { desktop: 0, mobile: 0, tablet: 0 },
    locationStats: {},
    recentActivity: { last1h: 0, last24h: 0, last7d: 0 },
  });
  
  // Advanced filtering state
  const [filters, setFilters] = useState<SessionFilterState>({
    search: '',
    deviceType: '',
    status: '',
    location: '',
    createdAfter: null,
    createdBefore: null,
    lastActivityAfter: null,
    lastActivityBefore: null,
    showExpiredOnly: false,
    showSuspiciousOnly: false,
  });

  // Sessions data fetching
  const fetchSessions = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        limit: pageSize.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.deviceType && { deviceType: filters.deviceType }),
        ...(filters.status && { status: filters.status }),
        ...(filters.location && { location: filters.location }),
        ...(filters.createdAfter && { createdAfter: filters.createdAfter.toISOString() }),
        ...(filters.createdBefore && { createdBefore: filters.createdBefore.toISOString() }),
        ...(filters.lastActivityAfter && { lastActivityAfter: filters.lastActivityAfter.toISOString() }),
        ...(filters.lastActivityBefore && { lastActivityBefore: filters.lastActivityBefore.toISOString() }),
        ...(filters.showExpiredOnly && { showExpiredOnly: 'true' }),
        ...(filters.showSuspiciousOnly && { showSuspiciousOnly: 'true' }),
        ...(sortModel.length > 0 && {
          sortBy: sortModel[0].field,
          sortOrder: sortModel[0].sort,
        }),
      });

      const response = await fetch(`/api/admin/sessions?${params}`, { headers: { 'x-admin-secret': 'admin-development-secret-key' } });
      
      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }
      
      const data = await response.json();
      setSessions(data.sessions || []);
      setTotalCount(data.pagination?.totalCount || 0);
      
      // Update stats if available
      if (data.stats) {
        setStats(data.stats);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError('セッションデータの取得に失敗しました');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, pageSize, filters, sortModel]);

  // Fetch stats separately for real-time updates
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/sessions/stats', { headers: { 'x-admin-secret': 'admin-development-secret-key' } });
      if (response.ok) {
        const data = await response.json();
        
        // デバイス統計を集計（APIから返される形式を変換）
        const deviceCounts = { desktop: 0, mobile: 0, tablet: 0 };
        
        // devicesの配列から各デバイスタイプの数を取得
        if (data.devices && Array.isArray(data.devices)) {
          data.devices.forEach((device: any) => {
            const deviceType = device.type?.toLowerCase() || '';
            if (deviceType === 'desktop') {
              deviceCounts.desktop = device.count || 0;
            } else if (deviceType === 'mobile') {
              deviceCounts.mobile = device.count || 0;
            } else if (deviceType === 'tablet') {
              deviceCounts.tablet = device.count || 0;
            }
          });
        }
        
        // Map API response to component format
        const mappedStats = {
          total: data.overview?.total || 0,
          active: data.overview?.active || 0,
          expired: data.overview?.inactive || 0,
          suspicious: data.overview?.suspicious || 0,
          deviceStats: {
            desktop: deviceCounts.desktop,
            mobile: deviceCounts.mobile,
            tablet: deviceCounts.tablet,
          },
          locationStats: data.locations?.reduce((acc: any, loc: any) => {
            acc[loc.country] = loc.count;
            return acc;
          }, {}) || {},
          recentActivity: {
            last1h: data.timeStats?.lastHour || 0,
            last24h: data.timeStats?.last24Hours || 0,
            last7d: data.timeStats?.lastWeek || 0,
          },
        };
        setStats(mappedStats);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    fetchStats();
  }, [fetchSessions, fetchStats]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSessions(true);
      fetchStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchSessions, fetchStats]);

  // Handlers
  const handleRefresh = () => {
    fetchSessions(true);
    fetchStats();
  };

  const handleFiltersChange = (newFilters: SessionFilterState) => {
    setFilters(newFilters);
    setPage(0); // Reset to first page when filters change
  };

  const handleFiltersReset = () => {
    const emptyFilters: SessionFilterState = {
      search: '',
      deviceType: '',
      status: '',
      location: '',
      createdAfter: null,
      createdBefore: null,
      lastActivityAfter: null,
      lastActivityBefore: null,
      showExpiredOnly: false,
      showSuspiciousOnly: false,
    };
    setFilters(emptyFilters);
    setPage(0);
  };

  const handleTerminateSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/admin/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to terminate session');
      }

      setSuccess('セッションを終了しました');
      fetchSessions();
      fetchStats();
    } catch (err) {
      console.error('Error terminating session:', err);
      setError('セッションの終了に失敗しました');
    }
  };

  const handleTerminateAllUserSessions = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/sessions/user/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to terminate user sessions');
      }

      const data = await response.json();
      setSuccess(`${data.terminatedCount} 件のセッションを終了しました`);
      fetchSessions();
      fetchStats();
    } catch (err) {
      console.error('Error terminating user sessions:', err);
      setError('ユーザーセッションの終了に失敗しました');
    }
  };

  const handleBulkTerminate = async () => {
    if (selectionModel.length === 0) return;

    try {
      const response = await fetch('/api/admin/sessions/bulk-terminate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' , 'x-admin-secret': 'admin-development-secret-key' },
        body: JSON.stringify({ sessionIds: selectionModel }),
      });

      if (!response.ok) {
        throw new Error('Failed to terminate sessions');
      }

      const data = await response.json();
      setSuccess(`${data.terminatedCount} 件のセッションを終了しました`);
      setSelectionModel([]);
      fetchSessions();
      fetchStats();
    } catch (err) {
      console.error('Error bulk terminating sessions:', err);
      setError('一括終了に失敗しました');
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {/* ヘッダー */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">セッション管理</Typography>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? '更新中...' : '更新'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<Security />}
              disabled={stats.suspicious === 0}
              color="warning"
            >
              疑わしいセッション ({stats.suspicious})
            </Button>
            {selectionModel.length > 0 && (
              <Button
                variant="contained"
                color="error"
                startIcon={<DeleteSweep />}
                onClick={handleBulkTerminate}
              >
                選択したセッションを終了 ({selectionModel.length})
              </Button>
            )}
          </Stack>
        </Box>

        {/* エラー・成功メッセージ */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {/* 統計パネル */}
        <SessionStatsPanel stats={stats} loading={loading && stats.total === 0} />

        {/* 高度なフィルター */}
        <SessionFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onReset={handleFiltersReset}
          totalCount={totalCount}
          filteredCount={sessions.length}
          activeCount={stats.active}
        />

        {/* セッションテーブル */}
        <Paper>
          <SimpleSessionsTable
            sessions={sessions}
            loading={loading}
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            selectionModel={selectionModel}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onSelectionChange={setSelectionModel}
            onTerminateSession={handleTerminateSession}
            onTerminateAllUserSessions={handleTerminateAllUserSessions}
          />
        </Paper>
      </Container>
    </LocalizationProvider>
  );
}