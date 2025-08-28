'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Container
} from '@mui/material';
import { Refresh, ReportProblem } from '@mui/icons-material';

export default function SafeReportsManagement() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  // CSR対応 - マウント確認
  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchReports = async () => {
    if (!mounted) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/reports');
      
      if (!response.ok) {
        throw new Error(`HTTPエラー: ${response.status}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : '通報データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted) {
      fetchReports();
    }
  }, [mounted]);

  // CSRレンダリング待機
  if (!mounted) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>読み込み中...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReportProblem color="error" />
          通報管理センター（セーフモード）
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            エラー: {error}
          </Alert>
        )}

        <Button
          variant="contained"
          startIcon={<Refresh />}
          onClick={fetchReports}
          disabled={loading}
          sx={{ mb: 3 }}
        >
          {loading ? '更新中...' : '更新'}
        </Button>

        <Paper sx={{ p: 3 }}>
          {loading ? (
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <CircularProgress />
              <Typography sx={{ mt: 2 }}>通報データを取得中...</Typography>
            </Box>
          ) : data ? (
            <Box>
              <Typography variant="h6" gutterBottom>
                通報データ
              </Typography>
              <Typography variant="body2" component="pre" sx={{ 
                bgcolor: 'grey.100', 
                p: 2, 
                borderRadius: 1,
                overflow: 'auto',
                maxHeight: 400
              }}>
                {JSON.stringify(data, null, 2)}
              </Typography>
            </Box>
          ) : (
            <Typography>データがありません</Typography>
          )}
        </Paper>
      </Box>
    </Container>
  );
}