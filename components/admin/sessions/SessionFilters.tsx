'use client';

import React from 'react';
import {
  Paper,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  Box,
  InputAdornment,
  Typography,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Search,
  FilterList,
  ClearAll,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';

interface SessionFilterState {
  search: string;
  deviceType: string;
  status: string;
  location: string;
  createdAfter: Dayjs | null;
  createdBefore: Dayjs | null;
  lastActivityAfter: Dayjs | null;
  lastActivityBefore: Dayjs | null;
  showExpiredOnly: boolean;
  showSuspiciousOnly: boolean;
}

interface SessionFiltersProps {
  filters: SessionFilterState;
  onFiltersChange: (filters: SessionFilterState) => void;
  onReset: () => void;
  totalCount: number;
  filteredCount: number;
  activeCount: number;
}

export default function SessionFilters({
  filters,
  onFiltersChange,
  onReset,
  totalCount,
  filteredCount,
  activeCount,
}: SessionFiltersProps) {
  const handleFilterChange = <K extends keyof SessionFilterState>(
    key: K,
    value: SessionFilterState[K]
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.deviceType) count++;
    if (filters.status) count++;
    if (filters.location) count++;
    if (filters.createdAfter) count++;
    if (filters.createdBefore) count++;
    if (filters.lastActivityAfter) count++;
    if (filters.lastActivityBefore) count++;
    if (filters.showExpiredOnly) count++;
    if (filters.showSuspiciousOnly) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Paper sx={{ p: 2, mb: 3 }}>
        {/* Basic Filters */}
        <Stack direction="row" spacing={2} alignItems="center" mb={2} flexWrap="wrap">
          <TextField
            label="検索"
            variant="outlined"
            size="small"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 300 }}
            placeholder="メール、IP、場所で検索"
          />
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>デバイス</InputLabel>
            <Select
              value={filters.deviceType}
              label="デバイス"
              onChange={(e) => handleFilterChange('deviceType', e.target.value)}
            >
              <MenuItem value="">すべて</MenuItem>
              <MenuItem value="desktop">デスクトップ</MenuItem>
              <MenuItem value="mobile">モバイル</MenuItem>
              <MenuItem value="tablet">タブレット</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>ステータス</InputLabel>
            <Select
              value={filters.status}
              label="ステータス"
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <MenuItem value="">すべて</MenuItem>
              <MenuItem value="active">アクティブ</MenuItem>
              <MenuItem value="expired">期限切れ</MenuItem>
              <MenuItem value="terminated">終了済み</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            label="場所"
            variant="outlined"
            size="small"
            value={filters.location}
            onChange={(e) => handleFilterChange('location', e.target.value)}
            sx={{ minWidth: 150 }}
            placeholder="国や都市"
          />
          
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            disabled={activeFiltersCount === 0}
            endIcon={activeFiltersCount > 0 && (
              <Chip
                label={activeFiltersCount}
                size="small"
                color="primary"
              />
            )}
          >
            フィルター {activeFiltersCount > 0 && `(${activeFiltersCount})`}
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<ClearAll />}
            onClick={onReset}
            disabled={activeFiltersCount === 0}
          >
            リセット
          </Button>
        </Stack>

        {/* Advanced Options */}
        <Stack direction="row" spacing={2} alignItems="center" mb={2} flexWrap="wrap">
          <FormControlLabel
            control={
              <Checkbox
                checked={filters.showExpiredOnly}
                onChange={(e) => handleFilterChange('showExpiredOnly', e.target.checked)}
              />
            }
            label="期限切れのみ"
          />
          
          <FormControlLabel
            control={
              <Checkbox
                checked={filters.showSuspiciousOnly}
                onChange={(e) => handleFilterChange('showSuspiciousOnly', e.target.checked)}
              />
            }
            label="疑わしいセッション"
          />
        </Stack>

        {/* Date Filters */}
        <Stack direction="row" spacing={2} alignItems="center" mb={2} flexWrap="wrap">
          <DatePicker
            label="開始日時（開始）"
            value={filters.createdAfter}
            onChange={(date) => handleFilterChange('createdAfter', date)}
            slotProps={{ textField: { size: 'small' } }}
          />
          <DatePicker
            label="開始日時（終了）"
            value={filters.createdBefore}
            onChange={(date) => handleFilterChange('createdBefore', date)}
            slotProps={{ textField: { size: 'small' } }}
          />
          <DatePicker
            label="最終活動（開始）"
            value={filters.lastActivityAfter}
            onChange={(date) => handleFilterChange('lastActivityAfter', date)}
            slotProps={{ textField: { size: 'small' } }}
          />
          <DatePicker
            label="最終活動（終了）"
            value={filters.lastActivityBefore}
            onChange={(date) => handleFilterChange('lastActivityBefore', date)}
            slotProps={{ textField: { size: 'small' } }}
          />
        </Stack>

        {/* Results Summary */}
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">
            {totalCount} 件中 {filteredCount} 件を表示 （アクティブ: {activeCount} 件）
          </Typography>
          <Stack direction="row" spacing={1}>
            {filters.search && (
              <Chip
                label={`検索: "${filters.search}"`}
                size="small"
                onDelete={() => handleFilterChange('search', '')}
              />
            )}
            {filters.deviceType && (
              <Chip
                label={`デバイス: ${filters.deviceType}`}
                size="small"
                onDelete={() => handleFilterChange('deviceType', '')}
              />
            )}
            {filters.status && (
              <Chip
                label={`ステータス: ${filters.status}`}
                size="small"
                onDelete={() => handleFilterChange('status', '')}
              />
            )}
            {filters.location && (
              <Chip
                label={`場所: ${filters.location}`}
                size="small"
                onDelete={() => handleFilterChange('location', '')}
              />
            )}
          </Stack>
        </Box>
      </Paper>
    </LocalizationProvider>
  );
}