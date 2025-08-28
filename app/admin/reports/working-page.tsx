'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import { Refresh } from '@mui/icons-material';

interface SimpleReport {
  _id: string;
  category: string;
  status: string;
  priority: number;
  createdAt: string;
}

export default function WorkingReportsPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<SimpleReport[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchReports = async () => {
    if (!mounted) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/reports');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      const reportsData = data.reports || [];
      
      // シンプルなデータ構造に変換
      const simpleReports: SimpleReport[] = reportsData.slice(0, 10).map((r: any) => ({
        _id: r._id || 'unknown',
        category: r.category || 'N/A',
        status: r.status || 'pending',
        priority: r.priority || 0,
        createdAt: r.createdAt || new Date().toISOString()
      }));
      
      setReports(simpleReports);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted) {
      fetchReports();
    }
  }, [mounted]);

  if (!mounted) {
    return (
      <Container>
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'resolved': return 'success';
      case 'rejected': return 'default';
      default: return 'info';
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 7) return 'error';
    if (priority >= 4) return 'warning';
    return 'default';
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          通報管理（動作版）
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            エラー: {error}
          </Alert>
        )}

        <Button
          variant="contained"
          startIcon={<Refresh />}
          onClick={fetchReports}
          disabled={loading}
          sx={{ mb: 3 }}
        >
          {loading ? '読み込み中...' : '更新'}
        </Button>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>カテゴリ</TableCell>
                <TableCell>ステータス</TableCell>
                <TableCell>優先度</TableCell>
                <TableCell>作成日</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <CircularProgress size={30} />
                  </TableCell>
                </TableRow>
              ) : reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    データがありません
                  </TableCell>
                </TableRow>
              ) : (
                reports.map((report) => (
                  <TableRow key={report._id}>
                    <TableCell>{report._id.slice(-6)}</TableCell>
                    <TableCell>{report.category}</TableCell>
                    <TableCell>
                      <Chip
                        label={report.status}
                        color={getStatusColor(report.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={report.priority}
                        color={getPriorityColor(report.priority)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(report.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Container>
  );
}