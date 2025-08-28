'use client';

import { useEffect, useState } from 'react';
import { Box, Chip, Typography, Alert, Paper } from '@mui/material';
import { Speed, Warning, CheckCircle } from '@mui/icons-material';

interface PerformanceMetrics {
  pageLoad: number;
  apiResponse: number;
  renderTime: number;
  memoryUsage: number;
  networkLatency: number;
}

export default function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    // Web Performance APIを使用してメトリクスを収集
    const collectMetrics = () => {
      if (typeof window !== 'undefined' && 'performance' in window) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const memory = (performance as any).memory;
        
        const pageLoad = navigation.loadEventEnd - navigation.fetchStart;
        const renderTime = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
        
        const newMetrics: PerformanceMetrics = {
          pageLoad: Math.round(pageLoad),
          apiResponse: 0, // APIから動的に更新
          renderTime: Math.round(renderTime),
          memoryUsage: memory ? Math.round(memory.usedJSHeapSize / 1048576) : 0, // MB
          networkLatency: Math.round(navigation.responseStart - navigation.requestStart),
        };

        setMetrics(newMetrics);
        
        // パフォーマンスが悪い場合はアラート表示
        if (pageLoad > 3000 || renderTime > 1000) {
          setShowAlert(true);
        }
      }
    };

    // DOMが完全に読み込まれた後にメトリクスを収集
    if (document.readyState === 'complete') {
      collectMetrics();
    } else {
      window.addEventListener('load', collectMetrics);
    }

    return () => {
      window.removeEventListener('load', collectMetrics);
    };
  }, []);

  // API レスポンス時間を測定する関数
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        const apiTime = Math.round(endTime - startTime);
        
        setMetrics(prev => prev ? { ...prev, apiResponse: apiTime } : null);
        
        return response;
      } catch (error) {
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'success';
    if (value <= thresholds.warning) return 'warning';
    return 'error';
  };

  if (!metrics) return null;

  return (
    <Box sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1000 }}>
      {showAlert && (
        <Alert 
          severity="warning" 
          onClose={() => setShowAlert(false)}
          sx={{ mb: 2, maxWidth: 300 }}
          icon={<Warning />}
        >
          ページの読み込みが遅くなっています
        </Alert>
      )}
      
      <Paper 
        sx={{ 
          p: 2, 
          minWidth: 280,
          bgcolor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0, 0, 0, 0.1)'
        }}
        elevation={3}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Speed sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontSize: '0.9rem', fontWeight: 600 }}>
            パフォーマンス
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
              ページ読み込み
            </Typography>
            <Chip
              label={`${metrics.pageLoad}ms`}
              size="small"
              color={getStatusColor(metrics.pageLoad, { good: 1500, warning: 3000 })}
              sx={{ minWidth: 70, fontSize: '0.7rem' }}
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
              API レスポンス
            </Typography>
            <Chip
              label={`${metrics.apiResponse}ms`}
              size="small"
              color={getStatusColor(metrics.apiResponse, { good: 300, warning: 1000 })}
              sx={{ minWidth: 70, fontSize: '0.7rem' }}
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
              レンダリング
            </Typography>
            <Chip
              label={`${metrics.renderTime}ms`}
              size="small"
              color={getStatusColor(metrics.renderTime, { good: 100, warning: 500 })}
              sx={{ minWidth: 70, fontSize: '0.7rem' }}
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
              メモリ使用量
            </Typography>
            <Chip
              label={`${metrics.memoryUsage}MB`}
              size="small"
              color={getStatusColor(metrics.memoryUsage, { good: 50, warning: 100 })}
              sx={{ minWidth: 70, fontSize: '0.7rem' }}
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
              ネットワーク
            </Typography>
            <Chip
              label={`${metrics.networkLatency}ms`}
              size="small"
              color={getStatusColor(metrics.networkLatency, { good: 100, warning: 300 })}
              sx={{ minWidth: 70, fontSize: '0.7rem' }}
            />
          </Box>
        </Box>

        <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid #f0f0f0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {metrics.pageLoad <= 1500 && metrics.apiResponse <= 300 ? (
              <>
                <CheckCircle sx={{ color: 'success.main', mr: 0.5, fontSize: '1rem' }} />
                <Typography variant="caption" sx={{ color: 'success.main', fontSize: '0.7rem' }}>
                  高速
                </Typography>
              </>
            ) : (
              <>
                <Warning sx={{ color: 'warning.main', mr: 0.5, fontSize: '1rem' }} />
                <Typography variant="caption" sx={{ color: 'warning.main', fontSize: '0.7rem' }}>
                  最適化が必要
                </Typography>
              </>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}