'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
} from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartsProps {
  userTrends: Array<{
    date: string;
    users: number;
  }>;
  deviceAccess: Array<{
    device: string;
    percentage: number;
    count: number;
  }>;
}

const Charts: React.FC<ChartsProps> = ({ userTrends, deviceAccess }) => {
  const theme = useTheme();
  const [chartType, setChartType] = useState<'line' | 'pie'>('line');

  const handleChartTypeChange = (
    event: React.MouseEvent<HTMLElement>,
    newType: 'line' | 'pie' | null
  ) => {
    if (newType !== null) {
      setChartType(newType);
    }
  };

  const lineChartData = {
    labels: userTrends.map(item => {
      const date = new Date(item.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }),
    datasets: [
      {
        label: 'ユーザー数',
        data: userTrends.map(item => item.users),
        borderColor: theme.palette.primary.main,
        backgroundColor: `${theme.palette.primary.main}20`,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: theme.palette.background.paper,
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.secondary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (context: any) => {
            return `ユーザー数: ${context.parsed.y.toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: theme.palette.text.secondary,
        },
      },
      y: {
        beginAtZero: false,
        grid: {
          color: theme.palette.divider,
        },
        ticks: {
          color: theme.palette.text.secondary,
          callback: function(value: any) {
            return value.toLocaleString();
          },
        },
      },
    },
  };

  const pieChartData = {
    labels: deviceAccess.map(item => item.device),
    datasets: [
      {
        data: deviceAccess.map(item => item.percentage),
        backgroundColor: [
          theme.palette.primary.main,
          theme.palette.success.main,
          theme.palette.warning.main,
        ],
        borderColor: [
          theme.palette.primary.dark,
          theme.palette.success.dark,
          theme.palette.warning.dark,
        ],
        borderWidth: 2,
      },
    ],
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          padding: 20,
          color: theme.palette.text.primary,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: theme.palette.background.paper,
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.secondary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const count = deviceAccess[context.dataIndex]?.count || 0;
            return [
              `${label}: ${value.toFixed(1)}%`,
              `ユーザー数: ${count.toLocaleString()}`,
            ];
          },
        },
      },
    },
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {chartType === 'line' ? 'ユーザー推移（過去7日間）' : 'デバイス別アクセス'}
        </Typography>
        <ToggleButtonGroup
          value={chartType}
          exclusive
          onChange={handleChartTypeChange}
          size="small"
        >
          <ToggleButton value="line">
            推移
          </ToggleButton>
          <ToggleButton value="pie">
            デバイス
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ height: 300, position: 'relative' }}>
        {chartType === 'line' ? (
          <Line data={lineChartData} options={lineChartOptions} />
        ) : (
          <Pie data={pieChartData} options={pieChartOptions} />
        )}
      </Box>

      {chartType === 'line' && (
        <Box mt={2}>
          <Typography variant="body2" color="text.secondary" align="center">
            平均: {Math.round(userTrends.reduce((acc, item) => acc + item.users, 0) / userTrends.length).toLocaleString()} ユーザー/日
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default Charts;