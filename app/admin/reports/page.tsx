'use client';

import dynamic from 'next/dynamic';

// 安定版（MUIを使わない）
const StableReportsPage = dynamic(
  () => import('./stable-page'),
  { 
    ssr: false,
    loading: () => <div>Loading reports...</div>
  }
);

export default function ReportsPage() {
  return <StableReportsPage />;
}