'use client';

import dynamic from 'next/dynamic';
import { Box, CircularProgress } from '@mui/material';

// セーフモード版を使用（エラーデバッグ用）
const SafeReportsManagement = dynamic(
  () => import('./safe-page'),
  { 
    ssr: false,
    loading: () => (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }
);

export default function ReportsPage() {
  return <SafeReportsManagement />;
}