'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Chip,
  Avatar,
  Tooltip,
  Typography,
  IconButton,
  Stack,
  CircularProgress,
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridRowSelectionModel,
  GridToolbar,
  GridActionsCellItem,
} from '@mui/x-data-grid';
import {
  CheckCircle,
  Cancel,
  Warning,
  Security,
  Visibility,
  Block,
  Gavel,
  RestartAlt,
  Delete,
  AccessTime,
  Person,
  VerifiedUser,
} from '@mui/icons-material';
import UserActionsMenu from './UserActionsMenu';

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

interface AdvancedUsersDataGridProps {
  users: User[];
  loading: boolean;
  page: number;
  pageSize: number;
  totalCount: number;
  sortModel: any[];
  filterModel: any;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSortChange: (model: any[]) => void;
  onFilterChange: (model: any) => void;
  onRowClick: (userId: string) => void;
  onSelectionChange: (selection: GridRowSelectionModel) => void;
  selectionModel: GridRowSelectionModel;
  onUserAction: (userId: string, action: string, data?: any) => void;
}

export default function AdvancedUsersDataGrid({
  users,
  loading,
  page,
  pageSize,
  totalCount,
  sortModel,
  filterModel,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onFilterChange,
  onRowClick,
  onSelectionChange,
  selectionModel,
  onUserAction,
}: AdvancedUsersDataGridProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const handleRowHover = useCallback((id: string | null) => {
    setHoveredRow(id);
  }, []);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'error';
      case 'moderator': return 'warning';
      case 'user': return 'default';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'suspended': return 'warning';
      case 'banned': return 'error';
      case 'deleted': return 'default';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days > 0) return `${days}日前`;
    if (hours > 0) return `${hours}時間前`;
    if (minutes > 0) return `${minutes}分前`;
    return '今';
  };

  const columns: GridColDef[] = [
    {
      field: 'user',
      headerName: 'ユーザー',
      width: 280,
      renderCell: (params: GridRenderCellParams) => (
        <Stack direction="row" spacing={2} alignItems="center" sx={{ py: 1 }}>
          <Avatar
            sx={{
              width: 32,
              height: 32,
              bgcolor: getRoleColor(params.row.role) + '.main',
              fontSize: '14px',
            }}
          >
            {params.row.name ? params.row.name.charAt(0).toUpperCase() : 
             params.row.email ? params.row.email.charAt(0).toUpperCase() : '?'}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {params.row.name || 'N/A'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {params.row.email}
            </Typography>
          </Box>
        </Stack>
      ),
      sortable: true,
      filterable: true,
    },
    {
      field: 'role',
      headerName: '権限',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value}
          size="small"
          color={getRoleColor(params.value) as any}
          icon={
            params.value === 'admin' ? <VerifiedUser /> :
            params.value === 'moderator' ? <Security /> : 
            <Person />
          }
        />
      ),
      type: 'singleSelect',
      valueOptions: ['admin', 'moderator', 'user'],
    },
    {
      field: 'status',
      headerName: 'ステータス',
      width: 130,
      renderCell: (params: GridRenderCellParams) => {
        const statusLabels = {
          active: 'アクティブ',
          suspended: '停止中',
          banned: 'BAN',
          deleted: '削除済み',
        };
        
        return (
          <Chip
            label={statusLabels[params.value as keyof typeof statusLabels] || params.value}
            size="small"
            color={getStatusColor(params.value) as any}
          />
        );
      },
      type: 'singleSelect',
      valueOptions: ['active', 'suspended', 'banned', 'deleted'],
    },
    {
      field: 'verification',
      headerName: '認証',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Tooltip title={params.row.emailVerified ? 'メール認証済み' : 'メール未認証'}>
            <IconButton size="small">
              {params.row.emailVerified ? (
                <CheckCircle fontSize="small" color="success" />
              ) : (
                <Cancel fontSize="small" color="error" />
              )}
            </IconButton>
          </Tooltip>
          <Tooltip title={params.row.twoFactorEnabled ? '2FA有効' : '2FA無効'}>
            <IconButton size="small">
              <Security 
                fontSize="small" 
                color={params.row.twoFactorEnabled ? 'primary' : 'disabled'} 
              />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
      sortable: false,
      filterable: false,
    },
    {
      field: 'warningCount',
      headerName: '警告',
      width: 100,
      renderCell: (params: GridRenderCellParams) => {
        if (params.value === 0) return <Typography variant="body2">-</Typography>;
        return (
          <Chip
            label={params.value}
            size="small"
            color={params.value >= 3 ? 'error' : 'warning'}
            icon={<Warning />}
          />
        );
      },
      type: 'number',
    },
    {
      field: 'lastLogin',
      headerName: '最終ログイン',
      width: 160,
      renderCell: (params: GridRenderCellParams) => {
        if (!params.value) {
          return (
            <Typography variant="body2" color="text.secondary">
              未ログイン
            </Typography>
          );
        }
        return (
          <Tooltip title={formatDate(params.value)}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <AccessTime fontSize="small" color="action" />
              <Typography variant="body2">
                {getTimeAgo(params.value)}
              </Typography>
            </Stack>
          </Tooltip>
        );
      },
      type: 'dateTime',
      valueGetter: (params) => params.value ? new Date(params.value) : null,
    },
    {
      field: 'createdAt',
      headerName: '登録日',
      width: 140,
      renderCell: (params: GridRenderCellParams) => (
        <Tooltip title={formatDate(params.value)}>
          <Typography variant="body2">
            {getTimeAgo(params.value)}
          </Typography>
        </Tooltip>
      ),
      type: 'dateTime',
      valueGetter: (params) => new Date(params.value),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'アクション',
      width: 80,
      getActions: (params) => {
        const user = params.row as User;
        return [
          <UserActionsMenu
            key="actions"
            user={user}
            onAction={(action, data) => onUserAction(user._id, action, data)}
            onView={onRowClick}
          />,
        ];
      },
    },
  ];

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Box sx={{ 
        height: '100%', 
        width: '100%', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: 400
      }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      <DataGrid
        rows={users}
        columns={columns}
        getRowId={(row) => row._id}
        loading={loading}
        
        // Pagination
        paginationModel={{ page, pageSize }}
        onPaginationModelChange={(model) => {
          onPageChange(model.page);
          onPageSizeChange(model.pageSize);
        }}
        pageSizeOptions={[25, 50, 100, 200]}
        rowCount={totalCount}
        paginationMode="server"
        
        // Sorting
        sortModel={sortModel}
        onSortModelChange={onSortChange}
        sortingMode="server"
        
        // Filtering
        filterModel={filterModel}
        onFilterModelChange={onFilterChange}
        filterMode="server"
        
        // Selection
        checkboxSelection
        rowSelectionModel={selectionModel}
        onRowSelectionModelChange={onSelectionChange}
        disableRowSelectionOnClick
        
        // Row interaction
        onRowClick={(params) => onRowClick(params.id as string)}
        
        // Toolbar
        slots={{ toolbar: GridToolbar }}
        slotProps={{
          toolbar: {
            showQuickFilter: true,
            quickFilterProps: { debounceMs: 500 },
            csvOptions: {
              fileName: `users-export-${new Date().toISOString().split('T')[0]}`,
              utf8WithBom: true,
            },
          },
        }}
        
        // Styling
        sx={{
          '& .MuiDataGrid-row:hover': {
            backgroundColor: 'action.hover',
          },
          '& .MuiDataGrid-cell:focus': {
            outline: 'none',
          },
          '& .MuiDataGrid-columnHeader:focus': {
            outline: 'none',
          },
        }}
        
        // Performance
        rowHeight={72}
        headerHeight={56}
        
        // Localization
        localeText={{
          // Toolbar
          toolbarDensity: '表示密度',
          toolbarDensityLabel: '表示密度',
          toolbarDensityCompact: 'コンパクト',
          toolbarDensityStandard: '標準',
          toolbarDensityComfortable: '快適',
          toolbarColumns: '列',
          toolbarColumnsLabel: '列を選択',
          toolbarFilters: 'フィルター',
          toolbarFiltersLabel: 'フィルターを表示',
          toolbarFiltersTooltipHide: 'フィルターを非表示',
          toolbarFiltersTooltipShow: 'フィルターを表示',
          toolbarFiltersTooltipActive: (count) =>
            `${count} 個のアクティブなフィルター`,
          toolbarQuickFilterPlaceholder: '検索...',
          toolbarQuickFilterLabel: '検索',
          toolbarQuickFilterDeleteIconLabel: '消去',
          toolbarExport: 'エクスポート',
          toolbarExportLabel: 'エクスポート',
          toolbarExportCSV: 'CSVをダウンロード',
          toolbarExportPrint: '印刷',
          
          // Root
          noRowsLabel: 'データがありません',
          noResultsOverlayLabel: '結果が見つかりません',
          errorOverlayDefaultLabel: 'エラーが発生しました',
          
          // Pagination
          MuiTablePagination: {
            labelRowsPerPage: '表示件数',
            labelDisplayedRows: ({ from, to, count }) =>
              `${from}–${to} / ${count !== -1 ? count : `${to}以上`}`,
          },
          
          // Selection
          checkboxSelectionHeaderName: 'チェックボックス',
          checkboxSelectionSelectAllRows: 'すべての行を選択',
          checkboxSelectionUnselectAllRows: 'すべての行の選択を解除',
          checkboxSelectionSelectRow: '行を選択',
          checkboxSelectionUnselectRow: '行の選択を解除',
          
          // Boolean cell text
          booleanCellTrueLabel: 'はい',
          booleanCellFalseLabel: 'いいえ',
        }}
      />
    </Box>
  );
}