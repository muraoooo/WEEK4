// 管理画面の重いコンポーネントを遅延読み込みで最適化
import { lazy, Suspense } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

// 共通のローディングコンポーネント
const LoadingSpinner = ({ text = '読み込み中...' }: { text?: string }) => (
  <Box sx={{ 
    display: 'flex', 
    flexDirection: 'column',
    alignItems: 'center', 
    justifyContent: 'center', 
    height: 200,
    gap: 2 
  }}>
    <CircularProgress size={24} />
    <Typography variant="body2" color="text.secondary">
      {text}
    </Typography>
  </Box>
);

// チャートコンポーネントの遅延読み込み
export const LazyOptimizedCharts = lazy(() => 
  import('./OptimizedCharts').then(module => ({
    default: module.default
  }))
);

// ユーザー管理ページの遅延読み込み
export const LazyUsersPage = lazy(() => 
  import('../../app/admin/users/page').then(module => ({
    default: module.default
  }))
);

// 投稿管理ページの遅延読み込み
export const LazyPostsPage = lazy(() => 
  import('../../app/admin/posts/page').then(module => ({
    default: module.default
  }))
);

// セッション管理ページの遅延読み込み
export const LazySessionsPage = lazy(() => 
  import('../../app/admin/sessions/page').then(module => ({
    default: module.default
  }))
);

// 監査ログページの遅延読み込み
export const LazyAuditLogsPage = lazy(() => 
  import('../../app/admin/audit-logs/page').then(module => ({
    default: module.default
  }))
);

// 通報管理ページの遅延読み込み
export const LazyReportsPage = lazy(() => 
  import('../../app/admin/reports/page').then(module => ({
    default: module.default
  }))
);

// HOC: Suspenseでラップする高階コンポーネント
export const withSuspense = (Component: React.ComponentType, loadingText?: string) => {
  return (props: any) => (
    <Suspense fallback={<LoadingSpinner text={loadingText} />}>
      <Component {...props} />
    </Suspense>
  );
};

// 使いやすいエクスポート
export const OptimizedChartsWithSuspense = withSuspense(LazyOptimizedCharts, 'チャートを読み込み中...');
export const UsersPageWithSuspense = withSuspense(LazyUsersPage, 'ユーザー管理画面を読み込み中...');
export const PostsPageWithSuspense = withSuspense(LazyPostsPage, '投稿管理画面を読み込み中...');
export const SessionsPageWithSuspense = withSuspense(LazySessionsPage, 'セッション管理画面を読み込み中...');
export const AuditLogsPageWithSuspense = withSuspense(LazyAuditLogsPage, '監査ログを読み込み中...');
export const ReportsPageWithSuspense = withSuspense(LazyReportsPage, '通報管理画面を読み込み中...');