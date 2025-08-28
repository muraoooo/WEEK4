'use client';

import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Chip, Button } from '@mui/material';
import { Warning } from '@mui/icons-material';

interface User {
  _id: string;
  email: string;
  name: string;
  role: 'admin' | 'moderator' | 'user';
  status: 'active' | 'suspended' | 'banned' | 'deleted';
  createdAt: string;
  updatedAt: string;
  lastLogin: string | null;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  warningCount: number;
  suspendedUntil: string | null;
  bannedAt: string | null;
}

interface UserDataGridClientProps {
  users: User[];
  loading: boolean;
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onRowClick: (userId: string) => void;
  onSelectionChange: (selection: any) => void;
  selectionModel: string[];
}

export default function UserDataGridClient({
  users,
  loading,
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  onSelectionChange,
  selectionModel,
}: UserDataGridClientProps) {
  const [DataGrid, setDataGrid] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // DataGridを動的インポート
    const loadDataGrid = async () => {
      try {
        const { DataGrid: GridComponent } = await import('@mui/x-data-grid');
        setDataGrid(() => GridComponent);
      } catch (error) {
        console.error('Failed to load DataGrid:', error);
      }
    };
    
    if (typeof window !== 'undefined') {
      loadDataGrid();
    }
  }, []);

  const columns = [
    {
      field: 'email',
      headerName: 'メールアドレス',
      width: 250,
    },
    {
      field: 'name',
      headerName: '名前',
      width: 150,
    },
    {
      field: 'role',
      headerName: '権限',
      width: 120,
      renderCell: (params: any) => {
        const roleColors: Record<string, any> = {
          admin: 'error',
          moderator: 'warning',
          user: 'default',
        };
        return (
          <Chip
            label={params.value}
            size="small"
            color={roleColors[params.value] || 'default'}
          />
        );
      },
    },
    {
      field: 'status',
      headerName: 'ステータス',
      width: 130,
      renderCell: (params: any) => {
        const statusConfig: Record<string, any> = {
          active: { label: 'アクティブ', color: 'success' },
          suspended: { label: '停止中', color: 'warning' },
          banned: { label: 'BAN', color: 'error' },
          deleted: { label: '削除済み', color: 'default' },
        };
        const config = statusConfig[params.value] || { label: params.value, color: 'default' };
        return (
          <Chip
            label={config.label}
            size="small"
            color={config.color}
          />
        );
      },
    },
    {
      field: 'warningCount',
      headerName: '警告',
      width: 80,
      renderCell: (params: any) => {
        if (params.value === 0) return '-';
        return (
          <Chip
            label={params.value}
            size="small"
            color={params.value >= 3 ? 'error' : 'warning'}
            icon={<Warning />}
          />
        );
      },
    },
    {
      field: 'lastLogin',
      headerName: '最終ログイン',
      width: 180,
      valueFormatter: (params: any) => {
        if (!params.value) return '未ログイン';
        return new Date(params.value).toLocaleString('ja-JP');
      },
    },
    {
      field: 'createdAt',
      headerName: '登録日',
      width: 180,
      valueFormatter: (params: any) => {
        return new Date(params.value).toLocaleString('ja-JP');
      },
    },
    {
      field: 'actions',
      headerName: 'アクション',
      width: 120,
      renderCell: (params: any) => (
        <Button
          size="small"
          onClick={() => onRowClick(params.row._id)}
        >
          詳細
        </Button>
      ),
    },
  ];

  // DataGridがロードされていない、またはマウントされていない場合
  if (!mounted || !DataGrid) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <CircularProgress />
      </Box>
    );
  }

  // DataGridコンポーネントをレンダリング
  try {
    return (
      <Box sx={{ height: '100%', width: '100%' }}>
        <DataGrid
          rows={users}
          columns={columns}
          getRowId={(row: any) => row._id}
          loading={loading}
          initialState={{
            pagination: {
              paginationModel: {
                page: page,
                pageSize: pageSize,
              },
            },
          }}
          paginationModel={{
            page: page,
            pageSize: pageSize,
          }}
          onPaginationModelChange={(model: any) => {
            onPageChange(model.page);
            onPageSizeChange(model.pageSize);
          }}
          pageSizeOptions={[25, 50, 100]}
          rowCount={totalCount}
          paginationMode="server"
          checkboxSelection
          rowSelectionModel={selectionModel}
          onRowSelectionModelChange={onSelectionChange}
          disableRowSelectionOnClick
        />
      </Box>
    );
  } catch (error) {
    console.error('DataGrid render error:', error);
    return (
      <Box p={2}>
        <div>データグリッドの読み込みに失敗しました</div>
      </Box>
    );
  }
}