'use client';

import dynamic from 'next/dynamic';

// 最小限の動作確認版
const MinimalReportsPage = dynamic(
  () => import('./minimal-page'),
  { 
    ssr: false,
    loading: () => <div>Loading component...</div>
  }
);

export default function ReportsPage() {
  return <MinimalReportsPage />;
}