import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';

// クライアントコンポーネントを動的インポート（SSRを無効化）
const SecureReportsManagement = dynamic(
  () => import('./secure-page'),
  { 
    ssr: false,
    loading: () => (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }
);

// サーバーコンポーネント
export default function ReportsPage() {
  return (
    <Suspense fallback={
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    }>
      <SecureReportsManagement />
    </Suspense>
  );
}