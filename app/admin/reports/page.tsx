'use client';

import dynamic from 'next/dynamic';

// 最終版（完全機能）
const FinalReportsPage = dynamic(
  () => import('./final-page'),
  { 
    ssr: false,
    loading: () => <div>Loading reports...</div>
  }
);

export default function ReportsPage() {
  return <FinalReportsPage />;
}