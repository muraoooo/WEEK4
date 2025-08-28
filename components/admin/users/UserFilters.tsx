'use client';

import React, { useState } from 'react';
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Search,
  FilterList,
  ClearAll,
  ExpandMore,
  CalendarMonth,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';

interface FilterState {
  search: string;
  role: string;
  status: string;
  emailVerified: boolean | null;
  twoFactorEnabled: boolean | null;
  createdAfter: Dayjs | null;
  createdBefore: Dayjs | null;
  lastLoginAfter: Dayjs | null;
  lastLoginBefore: Dayjs | null;
  warningCountMin: number | null;
  warningCountMax: number | null;
  hasNeverLoggedIn: boolean;
}

interface UserFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onReset: () => void;
  totalCount: number;
  filteredCount: number;
}

export default function UserFilters({
  filters,
  onFiltersChange,
  onReset,
  totalCount,
  filteredCount,
}: UserFiltersProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const handleFilterChange = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.role) count++;
    if (filters.status) count++;
    if (filters.emailVerified !== null) count++;
    if (filters.twoFactorEnabled !== null) count++;
    if (filters.createdAfter) count++;
    if (filters.createdBefore) count++;
    if (filters.lastLoginAfter) count++;
    if (filters.lastLoginBefore) count++;
    if (filters.warningCountMin !== null) count++;
    if (filters.warningCountMax !== null) count++;
    if (filters.hasNeverLoggedIn) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Paper sx={{ p: 2, mb: 3 }}>
        {/* Basic Filters */}
        <Stack direction="row" spacing={2} alignItems="center" mb={2}>
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
            placeholder="メール、名前、ユーザーIDで検索"
          />
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="role-filter-label" shrink>
              権限
            </InputLabel>
            <Select
              labelId="role-filter-label"
              value={filters.role}
              label="権限"
              onChange={(e) => handleFilterChange('role', e.target.value)}
              displayEmpty
              renderValue={(selected) => {
                if (selected === '') return <span style={{ color: '#999' }}>すべて</span>;
                if (selected === 'admin') return 'Admin';
                if (selected === 'moderator') return 'Moderator';
                if (selected === 'user') return 'User';
                return selected;
              }}
              notched
            >
              <MenuItem value="">すべて</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="moderator">Moderator</MenuItem>
              <MenuItem value="user">User</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="status-filter-label" shrink>
              ステータス
            </InputLabel>
            <Select
              labelId="status-filter-label"
              value={filters.status}
              label="ステータス"
              onChange={(e) => handleFilterChange('status', e.target.value)}
              displayEmpty
              renderValue={(selected) => {
                if (selected === '') return <span style={{ color: '#999' }}>すべて</span>;
                if (selected === 'active') return 'アクティブ';
                if (selected === 'suspended') return '停止中';
                if (selected === 'banned') return 'BAN';
                if (selected === 'deleted') return '削除済み';
                return selected;
              }}
              notched
            >
              <MenuItem value="">すべて</MenuItem>
              <MenuItem value="active">アクティブ</MenuItem>
              <MenuItem value="suspended">停止中</MenuItem>
              <MenuItem value="banned">BAN</MenuItem>
              <MenuItem value="deleted">削除済み</MenuItem>
            </Select>
          </FormControl>
          
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => setAdvancedOpen(!advancedOpen)}
            endIcon={activeFiltersCount > 0 && (
              <Chip
                label={activeFiltersCount}
                size="small"
                color="primary"
              />
            )}
          >
            詳細フィルター
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

        {/* Results Summary */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="body2" color="text.secondary">
            {totalCount} 件中 {filteredCount} 件を表示
          </Typography>
          <Stack direction="row" spacing={1}>
            {filters.search && (
              <Chip
                label={`検索: "${filters.search}"`}
                size="small"
                onDelete={() => handleFilterChange('search', '')}
              />
            )}
            {filters.role && (
              <Chip
                label={`権限: ${filters.role}`}
                size="small"
                onDelete={() => handleFilterChange('role', '')}
              />
            )}
            {filters.status && (
              <Chip
                label={`ステータス: ${filters.status}`}
                size="small"
                onDelete={() => handleFilterChange('status', '')}
              />
            )}
          </Stack>
        </Box>

        {/* Advanced Filters */}
        <Accordion expanded={advancedOpen} onChange={() => setAdvancedOpen(!advancedOpen)}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>詳細フィルター</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={3}>
              {/* Authentication Filters */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  認証設定
                </Typography>
                <Stack direction="row" spacing={2}>
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>メール認証</InputLabel>
                    <Select
                      value={filters.emailVerified === null ? '' : filters.emailVerified ? 'true' : 'false'}
                      label="メール認証"
                      onChange={(e) => handleFilterChange('emailVerified', 
                        e.target.value === '' ? null : e.target.value === 'true'
                      )}
                    >
                      <MenuItem value="">すべて</MenuItem>
                      <MenuItem value="true">認証済み</MenuItem>
                      <MenuItem value="false">未認証</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>2FA設定</InputLabel>
                    <Select
                      value={filters.twoFactorEnabled === null ? '' : filters.twoFactorEnabled ? 'true' : 'false'}
                      label="2FA設定"
                      onChange={(e) => handleFilterChange('twoFactorEnabled', 
                        e.target.value === '' ? null : e.target.value === 'true'
                      )}
                    >
                      <MenuItem value="">すべて</MenuItem>
                      <MenuItem value="true">有効</MenuItem>
                      <MenuItem value="false">無効</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={filters.hasNeverLoggedIn}
                        onChange={(e) => handleFilterChange('hasNeverLoggedIn', e.target.checked)}
                      />
                    }
                    label="未ログイン"
                  />
                </Stack>
              </Box>

              {/* Date Filters */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  日付範囲
                </Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap">
                  <DatePicker
                    label="登録日開始"
                    value={filters.createdAfter}
                    onChange={(date) => handleFilterChange('createdAfter', date)}
                    slotProps={{ textField: { size: 'small' } }}
                  />
                  <DatePicker
                    label="登録日終了"
                    value={filters.createdBefore}
                    onChange={(date) => handleFilterChange('createdBefore', date)}
                    slotProps={{ textField: { size: 'small' } }}
                  />
                  <DatePicker
                    label="最終ログイン開始"
                    value={filters.lastLoginAfter}
                    onChange={(date) => handleFilterChange('lastLoginAfter', date)}
                    slotProps={{ textField: { size: 'small' } }}
                  />
                  <DatePicker
                    label="最終ログイン終了"
                    value={filters.lastLoginBefore}
                    onChange={(date) => handleFilterChange('lastLoginBefore', date)}
                    slotProps={{ textField: { size: 'small' } }}
                  />
                </Stack>
              </Box>

              {/* Warning Count Filters */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  警告回数
                </Typography>
                <Stack direction="row" spacing={2}>
                  <TextField
                    label="最小"
                    type="number"
                    size="small"
                    value={filters.warningCountMin || ''}
                    onChange={(e) => handleFilterChange('warningCountMin', 
                      e.target.value ? parseInt(e.target.value) : null
                    )}
                    sx={{ width: 100 }}
                  />
                  <TextField
                    label="最大"
                    type="number"
                    size="small"
                    value={filters.warningCountMax || ''}
                    onChange={(e) => handleFilterChange('warningCountMax', 
                      e.target.value ? parseInt(e.target.value) : null
                    )}
                    sx={{ width: 100 }}
                  />
                </Stack>
              </Box>
            </Stack>
          </AccordionDetails>
        </Accordion>
      </Paper>
    </LocalizationProvider>
  );
}