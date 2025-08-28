'use client';

import React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import Devices from '@mui/icons-material/Devices';
import Smartphone from '@mui/icons-material/Smartphone';
import Tablet from '@mui/icons-material/Tablet';
import Computer from '@mui/icons-material/Computer';

interface DeviceData {
  name: string;
  value: number;
  percentage: number;
  color: string;
  icon?: React.ReactNode;
}

interface DeviceAccessChartProps {
  data: DeviceData[];
}

export default function DeviceAccessChart({ data }: DeviceAccessChartProps) {
  // デバイス別の色とアイコン設定
  const DEVICE_CONFIG: { [key: string]: { color: string; icon: React.ReactNode } } = {
    'Desktop': { color: '#2196F3', icon: <Computer /> },
    'Mobile': { color: '#4CAF50', icon: <Smartphone /> },
    'Tablet': { color: '#FF9800', icon: <Tablet /> },
    'Unknown': { color: '#9E9E9E', icon: <Devices /> }
  };

  // データに色とアイコンを追加
  const enrichedData = data.map(item => ({
    ...item,
    color: DEVICE_CONFIG[item.name]?.color || '#9E9E9E',
    icon: DEVICE_CONFIG[item.name]?.icon || <Devices />
  }));

  // カスタムラベル
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // 5%未満は表示しない

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={14}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // カスタムツールチップ
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <Box sx={{ 
          bgcolor: 'background.paper', 
          p: 1.5, 
          border: 1, 
          borderColor: 'divider', 
          borderRadius: 1,
          boxShadow: 2
        }}>
          <Typography variant="body2" fontWeight="bold">
            {data.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            アクセス数: {data.value.toLocaleString()}
          </Typography>
          <Typography variant="body2" color={data.payload.color}>
            割合: {data.payload.percentage}%
          </Typography>
        </Box>
      );
    }
    return null;
  };

  // カスタム凡例
  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 2, mt: 2 }}>
        {payload.map((entry: any, index: number) => {
          const deviceData = enrichedData.find(d => d.name === entry.value);
          return (
            <Box
              key={`item-${index}`}
              sx={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: 0.5
              }}
            >
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  bgcolor: entry.color,
                  borderRadius: '50%'
                }}
              />
              <Typography variant="body2" color="text.secondary">
                {entry.value}
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {deviceData?.percentage}%
              </Typography>
            </Box>
          );
        })}
      </Box>
    );
  };

  // 合計アクセス数
  const totalAccess = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Devices sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" component="div">
            デバイス別アクセス割合
          </Typography>
        </Box>

        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={enrichedData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              animationBegin={0}
              animationDuration={800}
            >
              {enrichedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={renderLegend} />
          </PieChart>
        </ResponsiveContainer>

        <Box sx={{ mt: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            デバイス別詳細
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {enrichedData.map((device) => (
              <Box
                key={device.name}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1,
                  borderRadius: 1,
                  bgcolor: 'grey.50',
                  '&:hover': {
                    bgcolor: 'grey.100'
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ color: device.color }}>
                    {device.icon}
                  </Box>
                  <Typography variant="body2" fontWeight="medium">
                    {device.name}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={`${device.value.toLocaleString()} 件`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={`${device.percentage}%`}
                    size="small"
                    sx={{ 
                      bgcolor: device.color,
                      color: 'white'
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        <Box sx={{ mt: 2, p: 1, bgcolor: 'primary.50', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            総アクセス数: 
          </Typography>
          <Typography variant="body2" fontWeight="bold" color="primary.main">
            {totalAccess.toLocaleString()} 件
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}