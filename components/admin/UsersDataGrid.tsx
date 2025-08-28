'use client';

import React from 'react';
import { DataGrid, GridColDef, GridToolbar } from '@mui/x-data-grid';
import { Chip, Button, Box } from '@mui/material';
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

interface UsersDataGridProps {
  users: User[];
  loading: boolean;
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onRowClick: (userId: string) => void;
  onSelectionChange: (selection: any) => void;
  selectionModel: any;
}

export default function UsersDataGrid({
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
}: UsersDataGridProps) {
  const columns: GridColDef[] = [
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
      renderCell: (params) => {
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
      renderCell: (params) => {
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
      renderCell: (params) => {
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
      renderCell: (params) => (
        <Button
          size="small"
          onClick={() => onRowClick(params.row._id)}
        >
          詳細
        </Button>
      ),
    },
  ];

  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      <DataGrid
        rows={users}
        columns={columns}
        getRowId={(row) => row._id}
        loading={loading}
        paginationModel={{
          page,
          pageSize,
        }}
        onPaginationModelChange={(model) => {
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
        slots={{
          toolbar: GridToolbar,
        }}
        slotProps={{
          toolbar: {
            showQuickFilter: true,
            quickFilterProps: { debounceMs: 500 },
          },
        }}
      />
    </Box>
  );
}