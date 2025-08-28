'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Box, CircularProgress } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';

// DataGridProを動的にインポート（完全にクライアント側でのみ実行）
const DataGridDynamic = dynamic(
  () => import('@mui/x-data-grid').then((mod) => {
    // DataGridコンポーネントをラップして安全にする
    const OriginalDataGrid = mod.DataGrid;
    
    return function SafeDataGridInner(props: any) {
      // 必須プロパティのデフォルト値を設定
      const safeProps = {
        ...props,
        rows: props.rows || [],
        columns: props.columns || [],
        initialState: props.initialState || {
          pagination: {
            paginationModel: {
              page: props.page || 0,
              pageSize: props.pageSize || 50,
            },
          },
        },
        pageSizeOptions: props.pageSizeOptions || [25, 50, 100],
        disableRowSelectionOnClick: true,
        autoHeight: false,
        density: 'standard' as const,
      };
      
      // DataGridをエラーバウンダリでラップ
      try {
        return <OriginalDataGrid {...safeProps} />;
      } catch (error) {
        console.error('DataGrid render error:', error);
        return (
          <Box p={2}>
            <div>データグリッドの読み込みに失敗しました</div>
          </Box>
        );
      }
    };
  }),
  {
    ssr: false,
    loading: () => (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%" minHeight={400}>
        <CircularProgress />
      </Box>
    ),
  }
);

interface SafeDataGridProps {
  rows: any[];
  columns: GridColDef[];
  loading?: boolean;
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onRowClick?: (id: string) => void;
  onSelectionChange?: (selection: any) => void;
  selectionModel?: any;
  checkboxSelection?: boolean;
}

export default function SafeDataGrid({
  rows = [],
  columns = [],
  loading = false,
  page = 0,
  pageSize = 50,
  totalCount = 0,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  onSelectionChange,
  selectionModel = [],
  checkboxSelection = false,
}: SafeDataGridProps) {
  // クライアントサイドでのみレンダリング
  if (typeof window === 'undefined') {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', width: '100%', minHeight: 400 }}>
      <DataGridDynamic
        rows={rows}
        columns={columns}
        loading={loading}
        getRowId={(row: any) => row._id || row.id || `row-${Math.random()}`}
        paginationModel={{
          page: page,
          pageSize: pageSize,
        }}
        onPaginationModelChange={(model: any) => {
          if (model.page !== page) {
            onPageChange?.(model.page);
          }
          if (model.pageSize !== pageSize) {
            onPageSizeChange?.(model.pageSize);
          }
        }}
        pageSizeOptions={[25, 50, 100]}
        rowCount={totalCount}
        paginationMode="server"
        checkboxSelection={checkboxSelection}
        rowSelectionModel={selectionModel}
        onRowSelectionModelChange={onSelectionChange}
        disableRowSelectionOnClick
        onRowClick={(params: any) => {
          if (onRowClick) {
            onRowClick(params.row._id);
          }
        }}
        slots={{
          toolbar: () => null, // GridToolbarを一時的に無効化
        }}
      />
    </Box>
  );
}