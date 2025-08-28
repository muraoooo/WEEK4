'use client';

import dynamic from 'next/dynamic';

// MUIテスト版
const TestMUIPage = dynamic(
  () => import('./test-mui-page'),
  { 
    ssr: false,
    loading: () => <div>Loading MUI test...</div>
  }
);

export default function ReportsPage() {
  return <TestMUIPage />;
}