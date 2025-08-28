'use client';

import React, { useState, useEffect } from 'react';

export default function StableReportsPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchReports = async () => {
    if (!mounted) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // シンプルなAPIエンドポイントを使用
      const response = await fetch('/api/reports/simple');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Fetched data:', data);
      
      const reportsData = data.reports || [];
      setReports(reportsData.slice(0, 20)); // 最初の20件のみ
      
      // 統計を計算
      const statsData = {
        total: reportsData.length,
        pending: reportsData.filter((r: any) => r.status === 'pending').length,
        resolved: reportsData.filter((r: any) => r.status === 'resolved').length
      };
      setStats(statsData);
      
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
    return <div style={{ padding: '20px' }}>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>通報管理システム（安定版）</h1>
      
      {error && (
        <div style={{ 
          padding: '10px', 
          background: '#fee', 
          border: '1px solid #fcc', 
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          エラー: {error}
        </div>
      )}
      
      {stats && (
        <div style={{ 
          display: 'flex', 
          gap: '20px', 
          marginBottom: '20px',
          flexWrap: 'wrap'
        }}>
          <div style={{ 
            padding: '15px', 
            background: '#f5f5f5', 
            borderRadius: '8px',
            minWidth: '150px'
          }}>
            <div style={{ fontSize: '14px', color: '#666' }}>総通報数</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.total}</div>
          </div>
          <div style={{ 
            padding: '15px', 
            background: '#fff5e6', 
            borderRadius: '8px',
            minWidth: '150px'
          }}>
            <div style={{ fontSize: '14px', color: '#666' }}>未処理</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff9800' }}>{stats.pending}</div>
          </div>
          <div style={{ 
            padding: '15px', 
            background: '#e8f5e9', 
            borderRadius: '8px',
            minWidth: '150px'
          }}>
            <div style={{ fontSize: '14px', color: '#666' }}>解決済</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4caf50' }}>{stats.resolved}</div>
          </div>
        </div>
      )}
      
      <button 
        onClick={fetchReports}
        disabled={loading}
        style={{
          padding: '10px 20px',
          background: loading ? '#ccc' : '#1976d2',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '20px'
        }}
      >
        {loading ? '読み込み中...' : '更新'}
      </button>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          background: 'white',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>ID</th>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>対象</th>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>報告者</th>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>理由</th>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>ステータス</th>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>作成日</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: '20px', textAlign: 'center' }}>
                  読み込み中...
                </td>
              </tr>
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '20px', textAlign: 'center' }}>
                  データがありません
                </td>
              </tr>
            ) : (
              reports.map((report: any) => (
                <tr key={report._id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px' }}>
                    {report._id ? report._id.toString().slice(-6) : '-'}
                  </td>
                  <td style={{ padding: '10px' }}>
                    {report.targetType || '-'}/{report.targetId ? report.targetId.toString().slice(-6) : '-'}
                  </td>
                  <td style={{ padding: '10px' }}>
                    {report.reporterEmail || report.reporterName || (report.reporterId ? report.reporterId.toString().slice(-6) : '-')}
                  </td>
                  <td style={{ padding: '10px' }}>
                    {report.reason || report.description || '-'}
                  </td>
                  <td style={{ padding: '10px' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      background: report.status === 'pending' ? '#fff3e0' : 
                                 report.status === 'resolved' ? '#e8f5e9' : '#f5f5f5',
                      color: report.status === 'pending' ? '#ff9800' : 
                             report.status === 'resolved' ? '#4caf50' : '#666'
                    }}>
                      {report.status === 'pending' ? '未処理' : 
                       report.status === 'resolved' ? '解決済' : report.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px' }}>
                    {report.createdAt ? new Date(report.createdAt).toLocaleDateString('ja-JP') : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <div style={{ marginTop: '20px', padding: '10px', background: '#f5f5f5', borderRadius: '4px' }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
          表示: {reports.length}件 / 全{stats?.total || 0}件
        </p>
      </div>
    </div>
  );
}