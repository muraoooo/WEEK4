'use client';

import dynamic from 'next/dynamic';
import { Box, CircularProgress } from '@mui/material';

// クライアントコンポーネントを動的インポート（SSRを無効化して秘密情報の露出を防ぐ）
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

// クライアントコンポーネントとして定義
export default function ReportsPage() {
  return <SecureReportsManagement />;
}