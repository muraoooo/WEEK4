'use client';

import dynamic from 'next/dynamic';

// 動作版（テーブル表示あり）
const WorkingReportsPage = dynamic(
  () => import('./working-page'),
  { 
    ssr: false,
    loading: () => <div>Loading reports...</div>
  }
);

export default function ReportsPage() {
  return <WorkingReportsPage />;
}