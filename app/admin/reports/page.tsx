'use client';

import dynamic from 'next/dynamic';
import { Box, CircularProgress } from '@mui/material';

// 権限チェックなしの公開版を使用
const PublicReportsManagement = dynamic(
  () => import('./public-page'),
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
  return <PublicReportsManagement />;
}