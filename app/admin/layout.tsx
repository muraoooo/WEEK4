'use client';

import React, { useState, useEffect } from 'react';
import { Box, Toolbar, useMediaQuery, CircularProgress, Alert, Button } from '@mui/material';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import AdminThemeProvider, { useTheme } from '../../components/admin/ThemeProvider';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminSidebar from '../../components/admin/AdminSidebar';
import AdminBreadcrumbs from '../../components/admin/AdminBreadcrumbs';
import { checkAdminAuth } from '@/lib/admin-auth';

const DRAWER_WIDTH = 280;

interface AdminLayoutContentProps {
  children: React.ReactNode;
}

const AdminLayoutContent: React.FC<AdminLayoutContentProps> = ({ children }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const { isDarkMode, toggleDarkMode } = useTheme();
  const router = useRouter();

  // Authentication check
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const authResult = await checkAdminAuth();
        
        if (authResult.isAuthenticated && authResult.isAdmin) {
          setIsAuthenticated(true);
          setAuthError(null);
        } else {
          setIsAuthenticated(false);
          setAuthError(authResult.error || '管理者権限が必要です');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setAuthError('認証チェック中にエラーが発生しました。');
        setIsAuthenticated(false);
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuthentication();
  }, []);

  // CSR compatibility
  useEffect(() => {
    setMounted(true);
    
    // ローカルストレージからサイドバーの状態を復元
    if (typeof localStorage !== 'undefined') {
      const savedDrawerState = localStorage.getItem('admin-drawer-open');
      if (savedDrawerState !== null) {
        setIsDrawerOpen(JSON.parse(savedDrawerState));
      }
    }

    // モバイルでは初期状態を閉じる
    if (isMobile) {
      setIsDrawerOpen(false);
    }
  }, [isMobile]);

  const handleDrawerToggle = () => {
    const newState = !isDrawerOpen;
    setIsDrawerOpen(newState);
    
    // ローカルストレージに保存
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('admin-drawer-open', JSON.stringify(newState));
    }
  };

  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
    
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('admin-drawer-open', JSON.stringify(false));
    }
  };

  const handleLoginRedirect = () => {
    router.push('/login?from=' + encodeURIComponent(window.location.pathname));
  };

  // SSRとCSRのハイドレーション問題を回避
  if (!mounted || !authChecked) {
    return (
      <Box sx={{ 
        display: 'flex', 
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <CircularProgress size={40} />
      </Box>
    );
  }

  // Authentication failed
  if (!isAuthenticated) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3
      }}>
        <Alert severity="error" sx={{ mb: 3, maxWidth: 500 }}>
          {authError}
        </Alert>
        <Button 
          variant="contained" 
          color="primary"
          onClick={handleLoginRedirect}
        >
          ログインページへ
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* ヘッダー */}
      <AdminHeader
        drawerWidth={DRAWER_WIDTH}
        isDrawerOpen={isDrawerOpen}
        onDrawerToggle={handleDrawerToggle}
        isDarkMode={isDarkMode}
        onDarkModeToggle={toggleDarkMode}
        adminName="管理者"
        adminRole="Administrator"
      />

      {/* サイドバー */}
      <AdminSidebar
        drawerWidth={DRAWER_WIDTH}
        isOpen={isDrawerOpen}
        onClose={handleDrawerClose}
        variant={isMobile ? 'temporary' : 'persistent'}
      />

      {/* メインコンテンツエリア */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { 
            md: isDrawerOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%' 
          },
          transition: muiTheme.transitions.create(['width', 'margin'], {
            easing: muiTheme.transitions.easing.sharp,
            duration: muiTheme.transitions.duration.leavingScreen,
          }),
          backgroundColor: 'background.default',
          minHeight: '100vh',
        }}
      >
        {/* ヘッダーの高さ分のスペース */}
        <Toolbar />

        {/* コンテンツコンテナ */}
        <Box
          sx={{
            p: 3,
            maxWidth: '1200px',
            mx: 'auto',
          }}
        >
          {/* パンくずリスト */}
          <AdminBreadcrumbs />

          {/* ページコンテンツ */}
          <Box
            sx={{
              backgroundColor: 'background.paper',
              borderRadius: 2,
              boxShadow: muiTheme.shadows[1],
              p: 3,
              minHeight: 'calc(100vh - 200px)',
            }}
          >
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  return (
    <AdminThemeProvider>
      <AdminLayoutContent>
        {children}
      </AdminLayoutContent>
    </AdminThemeProvider>
  );
};

export default AdminLayout;