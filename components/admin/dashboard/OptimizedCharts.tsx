'use client';

import React, { useState, memo, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import dynamic from 'next/dynamic';

// Chart.jsのコンポーネントを登録
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

// Chart.js コンポーネントを登録
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Chart.jsを動的インポートで軽量化
const Chart = dynamic(() => import('react-chartjs-2').then(mod => ({ default: mod.Line })), {
  ssr: false,
  loading: () => (
    <Box sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Typography color="text.secondary">チャート読み込み中...</Typography>
    </Box>
  )
});

const PieChart = dynamic(() => import('react-chartjs-2').then(mod => ({ default: mod.Pie })), {
  ssr: false,
  loading: () => (
    <Box sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Typography color="text.secondary">チャート読み込み中...</Typography>
    </Box>
  )
});

interface OptimizedChartsProps {
  userTrends: Array<{
    date: string;
    users: number;
  }>;
  deviceAccess: Array<{
    device?: string;
    name?: string;
    percentage: number;
    count?: number;
    value?: number;
  }>;
}

// Chart.jsの設定をメモ化
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: 'index' as const,
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#fff',
      titleColor: '#333',
      bodyColor: '#666',
      borderColor: '#e0e0e0',
      borderWidth: 1,
      padding: 8,
      displayColors: false,
      cornerRadius: 6,
    },
  },
  scales: {
    x: {
      type: 'category' as const,
      grid: { display: false, drawBorder: false },
      ticks: { color: '#999', font: { size: 10 } },
    },
    y: {
      type: 'linear' as const,
      beginAtZero: true,
      grid: { color: '#f5f5f5', drawBorder: false },
      ticks: { color: '#999', font: { size: 10 } },
    },
  },
  animation: {
    duration: 750, // アニメーション時間を短縮
    easing: 'easeOutQuart' as const,
  },
};

const pieOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right' as const,
      labels: {
        padding: 12,
        color: '#666',
        font: { size: 10 },
        usePointStyle: true,
        pointStyle: 'circle',
      },
    },
    tooltip: {
      backgroundColor: '#fff',
      titleColor: '#333',
      bodyColor: '#666',
      borderColor: '#e0e0e0',
      borderWidth: 1,
      padding: 8,
      cornerRadius: 6,
    },
  },
  animation: {
    duration: 500,
  },
};

const OptimizedCharts = memo<OptimizedChartsProps>(({ userTrends, deviceAccess }) => {
  const [chartType, setChartType] = useState<'line' | 'pie'>('line');

  // データ変換をメモ化
  const lineChartData = useMemo(() => {
    if (!userTrends || userTrends.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    return {
      labels: userTrends.map(item => {
        const date = new Date(item.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }),
      datasets: [
        {
          label: 'ユーザー数',
          data: userTrends.map(item => item.users),
          borderColor: '#3f51b5',
          backgroundColor: 'rgba(63, 81, 181, 0.05)',
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 4,
          pointBackgroundColor: '#fff',
          pointBorderColor: '#3f51b5',
          pointBorderWidth: 2,
          fill: true,
          tension: 0.2,
        },
      ],
    };
  }, [userTrends]);

  const pieChartData = useMemo(() => {
    if (!deviceAccess || deviceAccess.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    // deviceAccessのデータ構造を正規化
    const normalizedData = deviceAccess.map(item => ({
      label: item.device || item.name || 'Unknown',
      value: item.percentage,
      count: item.count || item.value || 0
    }));

    return {
      labels: normalizedData.map(item => item.label),
      datasets: [
        {
          data: normalizedData.map(item => item.value),
          backgroundColor: [
            'rgba(63, 81, 181, 0.8)',
            'rgba(63, 81, 181, 0.6)',
            'rgba(63, 81, 181, 0.4)',
            'rgba(63, 81, 181, 0.2)',
          ],
          borderColor: '#fff',
          borderWidth: 2,
          hoverBackgroundColor: [
            'rgba(63, 81, 181, 0.9)',
            'rgba(63, 81, 181, 0.7)',
            'rgba(63, 81, 181, 0.5)',
            'rgba(63, 81, 181, 0.3)',
          ],
        },
      ],
    };
  }, [deviceAccess]);

  // イベントハンドラをメモ化
  const handleChartTypeChange = useCallback((
    event: React.MouseEvent<HTMLElement>,
    newType: 'line' | 'pie' | null
  ) => {
    if (newType !== null) {
      setChartType(newType);
    }
  }, []);

  // 統計計算をメモ化
  const averageUsers = useMemo(() => {
    if (!userTrends || userTrends.length === 0) return 0;
    const total = userTrends.reduce((acc, item) => acc + item.users, 0);
    return Math.round(total / userTrends.length);
  }, [userTrends]);

  return (
    <Box sx={{ height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="body1" sx={{ color: '#666', fontWeight: 500 }}>
          {chartType === 'line' ? 'ユーザー推移' : 'デバイス別'}
        </Typography>
        <ToggleButtonGroup
          value={chartType}
          exclusive
          onChange={handleChartTypeChange}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              border: '1px solid #e0e0e0',
              color: '#999',
              fontSize: '0.75rem',
              padding: '4px 12px',
              '&.Mui-selected': {
                backgroundColor: '#f5f5f5',
                color: '#3f51b5',
                borderColor: '#3f51b5',
              },
              '&:hover': {
                backgroundColor: '#fafafa',
              },
            },
          }}
        >
          <ToggleButton value="line">推移</ToggleButton>
          <ToggleButton value="pie">デバイス</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ height: 280, width: '100%', position: 'relative' }}>
        {chartType === 'line' ? (
          <Chart data={lineChartData} options={chartOptions} />
        ) : (
          <PieChart data={pieChartData} options={pieOptions} />
        )}
      </Box>

      {chartType === 'line' && userTrends && userTrends.length > 0 && (
        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid #f0f0f0' }}>
          <Typography variant="caption" sx={{ color: '#999', display: 'block', textAlign: 'center' }}>
            日平均: {averageUsers.toLocaleString()} ユーザー
          </Typography>
        </Box>
      )}
    </Box>
  );
}, (prevProps, nextProps) => {
  // カスタム比較関数で不要な再レンダリングを防止
  return (
    JSON.stringify(prevProps.userTrends) === JSON.stringify(nextProps.userTrends) &&
    JSON.stringify(prevProps.deviceAccess) === JSON.stringify(nextProps.deviceAccess)
  );
});

OptimizedCharts.displayName = 'OptimizedCharts';

export default OptimizedCharts;