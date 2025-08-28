'use client';

import React, { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Divider from '@mui/material/Divider';
import {
  Menu as MenuIcon,
  AccountCircle,
  Logout,
  Settings,
  DarkMode,
  LightMode
} from '@mui/icons-material';

interface AdminHeaderProps {
  drawerWidth: number;
  isDrawerOpen: boolean;
  onDrawerToggle: () => void;
  isDarkMode: boolean;
  onDarkModeToggle: () => void;
  adminName?: string;
  adminRole?: string;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({
  drawerWidth,
  isDrawerOpen,
  onDrawerToggle,
  isDarkMode,
  onDarkModeToggle,
  adminName = 'Admin User',
  adminRole = 'Administrator'
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    
    try {
      // 既存のセッション管理システムと連携
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (response.ok) {
        // ローカルストレージのクリア
        if (typeof localStorage !== 'undefined') {
          localStorage.clear();
        }
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.clear();
        }

        // ログインページにリダイレクト
        if (typeof window !== 'undefined') {
          window.location.href = '/admin/login?reason=manual_logout';
        }
      }
    } catch (error) {
      console.error('Logout failed:', error);
      // エラーでもログインページにリダイレクト
      if (typeof window !== 'undefined') {
        window.location.href = '/admin/login?reason=logout_error';
      }
    }
  };

  const handleSettings = () => {
    handleMenuClose();
    if (typeof window !== 'undefined') {
      window.location.href = '/admin/settings';
    }
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { md: `calc(100% - ${isDrawerOpen ? drawerWidth : 0}px)` },
        ml: { md: isDrawerOpen ? `${drawerWidth}px` : 0 },
        transition: theme.transitions.create(['width', 'margin'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
        zIndex: theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar>
        {/* ハンバーガーメニュー */}
        <IconButton
          color="inherit"
          aria-label="toggle drawer"
          edge="start"
          onClick={onDrawerToggle}
          sx={{
            marginRight: 2,
            display: { md: isDrawerOpen ? 'none' : 'block' }
          }}
        >
          <MenuIcon />
        </IconButton>

        {/* タイトル */}
        <Typography 
          variant="h6" 
          noWrap 
          component="div" 
          sx={{ 
            flexGrow: 1,
            fontWeight: 600
          }}
        >
          Admin Dashboard
        </Typography>

        {/* ダークモード切り替え */}
        <FormControlLabel
          control={
            <Switch
              checked={isDarkMode}
              onChange={onDarkModeToggle}
              icon={<LightMode fontSize="small" />}
              checkedIcon={<DarkMode fontSize="small" />}
            />
          }
          label=""
          sx={{ 
            mr: 1,
            display: { xs: 'none', sm: 'flex' }
          }}
        />

        {/* プロファイルメニュー */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ display: { xs: 'none', sm: 'block' }, mr: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {adminName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {adminRole}
            </Typography>
          </Box>
          
          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="primary-search-account-menu"
            aria-haspopup="true"
            onClick={handleProfileMenuOpen}
            color="inherit"
          >
            <Avatar
              sx={{ 
                width: 32, 
                height: 32, 
                bgcolor: theme.palette.secondary.main 
              }}
            >
              {adminName.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
        </Box>

        {/* プロファイルドロップダウンメニュー */}
        <Menu
          anchorEl={anchorEl}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            elevation: 3,
            sx: {
              mt: 1,
              minWidth: 200,
              '& .MuiMenuItem-root': {
                px: 2,
                py: 1,
              },
            },
          }}
        >
          {/* モバイル時のユーザー情報表示 */}
          <Box sx={{ display: { xs: 'block', sm: 'none' }, px: 2, py: 1 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              {adminName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {adminRole}
            </Typography>
          </Box>
          
          <Divider sx={{ display: { xs: 'block', sm: 'none' } }} />

          {/* モバイル時のダークモード切り替え */}
          <MenuItem sx={{ display: { xs: 'flex', sm: 'none' } }}>
            <FormControlLabel
              control={
                <Switch
                  checked={isDarkMode}
                  onChange={onDarkModeToggle}
                  size="small"
                />
              }
              label={isDarkMode ? 'ダークモード' : 'ライトモード'}
              sx={{ width: '100%', m: 0 }}
            />
          </MenuItem>

          <Divider sx={{ display: { xs: 'block', sm: 'none' } }} />

          <MenuItem onClick={handleSettings}>
            <Settings sx={{ mr: 1 }} fontSize="small" />
            設定
          </MenuItem>
          
          <MenuItem onClick={handleLogout}>
            <Logout sx={{ mr: 1 }} fontSize="small" />
            ログアウト
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default AdminHeader;