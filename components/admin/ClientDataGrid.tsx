'use client';

import React, { useState, useEffect } from 'react';
import { DataGrid, GridColDef, GridToolbar } from '@mui/x-data-grid';
import { Box, CircularProgress } from '@mui/material';

interface ClientDataGridProps {
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

export default function ClientDataGrid({
  rows,
  columns,
  loading = false,
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  onSelectionChange,
  selectionModel,
  checkboxSelection = false,
}: ClientDataGridProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <DataGrid
      rows={rows || []}
      columns={columns || []}
      getRowId={(row) => row._id || row.id || Math.random().toString()}
      loading={loading}
      paginationModel={{
        page: page || 0,
        pageSize: pageSize || 50,
      }}
      onPaginationModelChange={(model) => {
        if (onPageChange && model.page !== undefined) {
          onPageChange(model.page);
        }
        if (onPageSizeChange && model.pageSize !== undefined) {
          onPageSizeChange(model.pageSize);
        }
      }}
      pageSizeOptions={[25, 50, 100]}
      rowCount={totalCount || 0}
      paginationMode="server"
      checkboxSelection={checkboxSelection}
      rowSelectionModel={selectionModel || []}
      onRowSelectionModelChange={onSelectionChange || (() => {})}
      disableRowSelectionOnClick
      onRowClick={(params) => {
        if (onRowClick) {
          onRowClick(params.row._id);
        }
      }}
      slots={{
        toolbar: GridToolbar,
      }}
      slotProps={{
        toolbar: {
          showQuickFilter: true,
          quickFilterProps: { debounceMs: 500 },
        },
      }}
      sx={{
        '& .MuiDataGrid-root': {
          border: 'none',
        },
      }}
    />
  );
}