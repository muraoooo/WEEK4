'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Box, CircularProgress } from '@mui/material';

// DataGridを動的インポートしてSSRを無効化
const SessionDataGrid = dynamic(
  () => import('./SessionDataGrid'),
  {
    ssr: false,
    loading: () => (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%',
        minHeight: 400 
      }}>
        <CircularProgress />
      </Box>
    )
  }
);

export default function SafeSessionDataGrid(props: any) {
  return <SessionDataGrid {...props} />;
}