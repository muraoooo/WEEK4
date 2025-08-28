'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Box, CircularProgress } from '@mui/material';

// 動的インポートでSSRを無効化
const Charts = dynamic(
  () => import('./Charts'),
  { 
    ssr: false,
    loading: () => (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    )
  }
);

interface DynamicChartsProps {
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

export default function DynamicCharts(props: DynamicChartsProps) {
  return <Charts {...props} />;
}