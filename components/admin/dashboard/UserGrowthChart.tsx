'use client';

import React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import TrendingUp from '@mui/icons-material/TrendingUp';

interface UserGrowthData {
  date: string;
  newUsers: number;
  activeUsers: number;
  totalUsers: number;
}

interface UserGrowthChartProps {
  data: UserGrowthData[];
}

export default function UserGrowthChart({ data }: UserGrowthChartProps) {
  // 日付を短い形式に変換
  const formattedData = data.map(item => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
  }));

  // カスタムツールチップ
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box sx={{ bgcolor: 'background.paper', p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Typography variant="body2">{label}</Typography>
          {payload.map((entry: any, index: number) => (
            <Typography
              key={index}
              variant="body2"
              sx={{ color: entry.color }}
            >
              {entry.name}: {entry.value.toLocaleString()}
            </Typography>
          ))}
        </Box>
      );
    }
    return null;
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <TrendingUp sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" component="div">
            ユーザー数推移（過去7日間）
          </Typography>
        </Box>
        
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={formattedData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              stroke="#666"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#666"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
              iconType="line"
            />
            
            <Line
              type="monotone"
              dataKey="newUsers"
              name="新規ユーザー"
              stroke="#4CAF50"
              strokeWidth={2}
              dot={{ fill: '#4CAF50', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
            
            <Line
              type="monotone"
              dataKey="activeUsers"
              name="アクティブユーザー"
              stroke="#2196F3"
              strokeWidth={2}
              dot={{ fill: '#2196F3', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
            
            <Line
              type="monotone"
              dataKey="totalUsers"
              name="総ユーザー数"
              stroke="#FF9800"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: '#FF9800', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-around' }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              今週の新規
            </Typography>
            <Typography variant="h6" color="success.main">
              +{data[data.length - 1]?.newUsers || 0}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              成長率
            </Typography>
            <Typography variant="h6" color="primary.main">
              {data.length > 1 
                ? `+${Math.round(((data[data.length - 1].totalUsers - data[0].totalUsers) / data[0].totalUsers) * 100)}%`
                : '0%'
              }
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              アクティブ率
            </Typography>
            <Typography variant="h6" color="warning.main">
              {data[data.length - 1]?.totalUsers 
                ? `${Math.round((data[data.length - 1].activeUsers / data[data.length - 1].totalUsers) * 100)}%`
                : '0%'
              }
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}