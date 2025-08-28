'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import {
  Breadcrumbs,
  Link,
  Typography,
  Box,
} from '@mui/material';
import {
  Home,
  NavigateNext,
} from '@mui/icons-material';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactElement;
}

interface AdminBreadcrumbsProps {
  customItems?: BreadcrumbItem[];
  maxItems?: number;
}

const AdminBreadcrumbs: React.FC<AdminBreadcrumbsProps> = ({
  customItems,
  maxItems = 8
}) => {
  const pathname = usePathname();

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    if (customItems) {
      return customItems;
    }

    const pathSegments = pathname?.split('/').filter(Boolean) || [];
    const breadcrumbs: BreadcrumbItem[] = [
      {
        label: 'ホーム',
        href: '/admin/dashboard',
        icon: <Home fontSize="inherit" />
      }
    ];

    // パス別のラベルマッピング
    const pathLabelMap: Record<string, string> = {
      admin: 'Admin',
      dashboard: 'ダッシュボード',
      users: 'ユーザー管理',
      posts: '投稿管理',
      reports: 'レポート',
      settings: '設定',
      analytics: 'アクセス統計',
      security: 'セキュリティ',
      sessions: 'セッション管理'
    };

    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // 最初の 'admin' セグメントはスキップ
      if (segment === 'admin') {
        return;
      }

      const label = pathLabelMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
      
      breadcrumbs.push({
        label,
        href: index === pathSegments.length - 1 ? undefined : currentPath
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  const handleBreadcrumbClick = (href?: string) => {
    if (href && typeof window !== 'undefined') {
      window.location.href = href;
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Breadcrumbs
        maxItems={maxItems}
        separator={<NavigateNext fontSize="small" />}
        aria-label="breadcrumb"
        sx={{
          '& .MuiBreadcrumbs-separator': {
            color: 'text.secondary',
          },
        }}
      >
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;
          
          if (isLast || !item.href) {
            return (
              <Typography
                key={item.label}
                color="text.primary"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  fontWeight: 500,
                }}
              >
                {item.icon && (
                  <Box sx={{ mr: 0.5, display: 'flex' }}>
                    {item.icon}
                  </Box>
                )}
                {item.label}
              </Typography>
            );
          }

          return (
            <Link
              key={item.label}
              color="inherit"
              onClick={() => handleBreadcrumbClick(item.href)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                  color: 'primary.main',
                },
              }}
            >
              {item.icon && (
                <Box sx={{ mr: 0.5, display: 'flex' }}>
                  {item.icon}
                </Box>
              )}
              {item.label}
            </Link>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
};

export default AdminBreadcrumbs;