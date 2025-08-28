'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Collapse from '@mui/material/Collapse';
import {
  Dashboard,
  People,
  Article,
  Assessment,
  Settings,
  ChevronLeft,
  ExpandLess,
  ExpandMore,
  Security,
} from '@mui/icons-material';

interface MenuItem {
  title: string;
  icon: React.ReactElement;
  href: string;
  children?: MenuItem[];
}

interface AdminSidebarProps {
  drawerWidth: number;
  isOpen: boolean;
  onClose: () => void;
  variant?: 'permanent' | 'persistent' | 'temporary';
}

const menuItems: MenuItem[] = [
  {
    title: 'ダッシュボード',
    icon: <Dashboard />,
    href: '/admin/dashboard',
  },
  {
    title: 'ユーザー管理',
    icon: <People />,
    href: '/admin/users',
    children: [
      {
        title: 'ユーザー一覧',
        icon: <People />,
        href: '/admin/users',
      },
      {
        title: 'セッション管理',
        icon: <Security />,
        href: '/admin/sessions',
      },
    ],
  },
  {
    title: '監査ログ',
    icon: <Assessment />,
    href: '/admin/audit-logs',
  },
  {
    title: 'コンテンツ管理',
    icon: <Article />,
    href: '/admin/content',
    children: [
      {
        title: '投稿管理',
        icon: <Article />,
        href: '/admin/posts',
      },
      {
        title: '通報管理',
        icon: <Security />,
        href: '/admin/reports',
      },
    ],
  },
  {
    title: 'システム',
    icon: <Settings />,
    href: '/admin/system',
    children: [
      {
        title: '設定',
        icon: <Settings />,
        href: '/admin/settings',
      },
    ],
  },
];

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  drawerWidth,
  isOpen,
  onClose,
  variant = 'persistent'
}) => {
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [expandedItems, setExpandedItems] = React.useState<Record<string, boolean>>({});

  // モバイル時は temporary variant を使用
  const drawerVariant = isMobile ? 'temporary' : variant;

  React.useEffect(() => {
    // 現在のパスに基づいて展開状態を設定
    const currentExpandedItems: Record<string, boolean> = {};
    menuItems.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some(child => pathname?.startsWith(child.href));
        if (hasActiveChild) {
          currentExpandedItems[item.title] = true;
        }
      }
    });
    setExpandedItems(currentExpandedItems);
  }, [pathname]);

  const handleItemClick = (href: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = href;
    }
    if (isMobile) {
      onClose();
    }
  };

  const handleExpandClick = (itemTitle: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemTitle]: !prev[itemTitle]
    }));
  };

  const isActive = (href: string) => {
    if (!pathname) return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const renderMenuItem = (item: MenuItem, depth = 0) => {
    const active = isActive(item.href);
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems[item.title];

    return (
      <React.Fragment key={item.title}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => {
              if (hasChildren) {
                handleExpandClick(item.title);
              } else {
                handleItemClick(item.href);
              }
            }}
            selected={active && !hasChildren}
            sx={{
              minHeight: 48,
              pl: depth * 2 + 2,
              pr: 2,
              '&.Mui-selected': {
                backgroundColor: theme.palette.primary.main + '20',
                borderRight: `3px solid ${theme.palette.primary.main}`,
                '&:hover': {
                  backgroundColor: theme.palette.primary.main + '30',
                },
              },
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 40,
                color: active && !hasChildren ? theme.palette.primary.main : 'inherit',
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.title}
              sx={{
                '& .MuiListItemText-primary': {
                  fontSize: depth > 0 ? '0.875rem' : '1rem',
                  fontWeight: active && !hasChildren ? 600 : 400,
                  color: active && !hasChildren ? theme.palette.primary.main : 'inherit',
                }
              }}
            />
            {hasChildren && (
              isExpanded ? <ExpandLess /> : <ExpandMore />
            )}
          </ListItemButton>
        </ListItem>
        
        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children?.map((child) => renderMenuItem(child, depth + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ヘッダー部分 */}
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: [1],
        }}
      >
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700 }}>
          Admin Panel
        </Typography>
        {!isMobile && variant === 'persistent' && (
          <IconButton onClick={onClose}>
            <ChevronLeft />
          </IconButton>
        )}
      </Toolbar>

      <Divider />

      {/* メニューリスト */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <List>
          {menuItems.map((item) => renderMenuItem(item))}
        </List>
      </Box>

      {/* フッター部分 */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary">
          Secure Session System
        </Typography>
        <br />
        <Typography variant="caption" color="text.secondary">
          v1.0.0
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={drawerVariant}
      open={isOpen}
      onClose={onClose}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
      ModalProps={{
        keepMounted: true, // モバイルでのパフォーマンス向上
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default AdminSidebar;