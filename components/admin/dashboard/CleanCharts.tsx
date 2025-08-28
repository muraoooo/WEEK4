'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
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

interface CleanChartsProps {
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

const CleanCharts: React.FC<CleanChartsProps> = ({ userTrends, deviceAccess }) => {
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
        borderColor: '#3f51b5',
        backgroundColor: 'rgba(63, 81, 181, 0.05)',
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#3f51b5',
        pointBorderWidth: 2,
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        left: 10,
        right: 20,
        top: 10,
        bottom: 10,
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#fff',
        titleColor: '#333',
        bodyColor: '#666',
        borderColor: '#e0e0e0',
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        callbacks: {
          label: (context: any) => {
            return `${context.parsed.y.toLocaleString()} ユーザー`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          color: '#999',
          font: {
            size: 11,
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: '#f5f5f5',
          drawBorder: false,
        },
        ticks: {
          color: '#999',
          font: {
            size: 11,
          },
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
          'rgba(63, 81, 181, 0.9)',
          'rgba(63, 81, 181, 0.6)',
          'rgba(63, 81, 181, 0.3)',
        ],
        borderColor: '#fff',
        borderWidth: 2,
      },
    ],
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        left: 10,
        right: 10,
        top: 10,
        bottom: 10,
      },
    },
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          padding: 15,
          color: '#666',
          font: {
            size: 11,
          },
        },
      },
      tooltip: {
        backgroundColor: '#fff',
        titleColor: '#333',
        bodyColor: '#666',
        borderColor: '#e0e0e0',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const count = deviceAccess[context.dataIndex]?.count || 0;
            return [
              `${label}: ${value.toFixed(1)}%`,
              `${count.toLocaleString()} ユーザー`,
            ];
          },
        },
      },
    },
  };

  return (
    <Box>
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
              '&.Mui-selected': {
                backgroundColor: 'white',
                color: '#3f51b5',
                borderColor: '#3f51b5',
              },
              '&:hover': {
                backgroundColor: '#fafafa',
              },
            },
          }}
        >
          <ToggleButton value="line">
            推移
          </ToggleButton>
          <ToggleButton value="pie">
            デバイス
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ height: 280, width: '100%', position: 'relative' }}>
        {chartType === 'line' ? (
          <Line data={lineChartData} options={lineChartOptions} />
        ) : (
          <Pie data={pieChartData} options={pieChartOptions} />
        )}
      </Box>

      {chartType === 'line' && userTrends.length > 0 && (
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #f0f0f0' }}>
          <Typography variant="caption" sx={{ color: '#999', display: 'block', textAlign: 'center' }}>
            日平均: {Math.round(userTrends.reduce((acc, item) => acc + item.users, 0) / userTrends.length).toLocaleString()} ユーザー
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default CleanCharts;