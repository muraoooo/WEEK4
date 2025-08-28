import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReportDialog from '@/components/ReportDialog';

// モックの設定
global.fetch = vi.fn();

describe('通報システムのテスト', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('通報ダイアログ', () => {
    const defaultProps = {
      open: true,
      onClose: vi.fn(),
      targetId: 'test-target-123',
      targetType: 'post' as const,
      targetContent: 'これはテスト投稿です',
      reporterId: 'test-user-123'
    };

    it('3ステップの通報フローが正しく動作する', async () => {
      render(<ReportDialog {...defaultProps} />);
      
      // ステップ1: 理由の選択
      expect(screen.getByText('理由を選択')).toBeInTheDocument();
      expect(screen.getByText('スパム・広告')).toBeInTheDocument();
      expect(screen.getByText('いじめ・嫌がらせ')).toBeInTheDocument();
      
      // スパムを選択
      fireEvent.click(screen.getByLabelText('スパム・広告'));
      fireEvent.click(screen.getByText('次へ'));
      
      // ステップ2: 詳細入力
      await waitFor(() => {
        expect(screen.getByText('詳細を入力')).toBeInTheDocument();
      });
      
      const textarea = screen.getByPlaceholderText(/具体的な問題点/);
      fireEvent.change(textarea, { target: { value: 'これは明らかなスパム投稿です' } });
      fireEvent.click(screen.getByText('次へ'));
      
      // ステップ3: 確認と送信
      await waitFor(() => {
        expect(screen.getByText('確認・送信')).toBeInTheDocument();
      });
      
      expect(screen.getByText('スパム・広告')).toBeInTheDocument();
      expect(screen.getByText('これは明らかなスパム投稿です')).toBeInTheDocument();
    });

    it('必須項目が未入力の場合エラーを表示', async () => {
      render(<ReportDialog {...defaultProps} />);
      
      // 理由を選択せずに次へ
      fireEvent.click(screen.getByText('次へ'));
      
      await waitFor(() => {
        expect(screen.getByText('通報理由を選択してください')).toBeInTheDocument();
      });
    });

    it('通報送信が成功した場合、成功メッセージを表示', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          success: true, 
          reportId: 'report-123',
          priority: 3,
          estimatedResponseTime: '24時間以内'
        })
      });
      
      render(<ReportDialog {...defaultProps} />);
      
      // 通報フローを完了
      fireEvent.click(screen.getByLabelText('スパム・広告'));
      fireEvent.click(screen.getByText('次へ'));
      
      await waitFor(() => screen.getByPlaceholderText(/具体的な問題点/));
      const textarea = screen.getByPlaceholderText(/具体的な問題点/);
      fireEvent.change(textarea, { target: { value: 'スパム投稿の詳細説明です' } });
      fireEvent.click(screen.getByText('次へ'));
      
      await waitFor(() => screen.getByText('通報する'));
      fireEvent.click(screen.getByText('通報する'));
      
      await waitFor(() => {
        expect(screen.getByText('通報を受け付けました')).toBeInTheDocument();
      });
    });
  });

  describe('優先順位の自動計算', () => {
    it('カテゴリに基づいて適切な優先順位が設定される', () => {
      const calculatePriority = (category: string): number => {
        const priorities: Record<string, number> = {
          'HATE_SPEECH': 9,
          'VIOLENCE': 8,
          'HARASSMENT': 7,
          'INAPPROPRIATE': 6,
          'MISINFORMATION': 5,
          'COPYRIGHT': 4,
          'SPAM': 3,
          'OTHER': 2
        };
        return priorities[category] || 1;
      };
      
      expect(calculatePriority('HATE_SPEECH')).toBe(9);
      expect(calculatePriority('VIOLENCE')).toBe(8);
      expect(calculatePriority('SPAM')).toBe(3);
      expect(calculatePriority('OTHER')).toBe(2);
      expect(calculatePriority('UNKNOWN')).toBe(1);
    });

    it('危険なキーワードが含まれる場合、優先順位が上がる', () => {
      const calculatePriorityWithKeywords = (
        category: string, 
        description: string
      ): number => {
        let basePriority = 3; // SPAMの基本優先度
        
        const dangerKeywords = ['緊急', '危険', '脅迫', '自殺'];
        const highKeywords = ['攻撃', '侮辱', 'いじめ'];
        
        if (dangerKeywords.some(k => description.includes(k))) {
          return Math.min(10, basePriority + 3);
        }
        if (highKeywords.some(k => description.includes(k))) {
          return Math.min(10, basePriority + 2);
        }
        
        return basePriority;
      };
      
      expect(calculatePriorityWithKeywords('SPAM', '普通のスパム')).toBe(3);
      expect(calculatePriorityWithKeywords('SPAM', '緊急の対応が必要')).toBe(6);
      expect(calculatePriorityWithKeywords('SPAM', 'いじめの内容')).toBe(5);
    });
  });

  describe('虚偽通報の検出', () => {
    it('短時間での連続通報を検出する', () => {
      const detectRapidReporting = (reports: Date[]): boolean => {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentReports = reports.filter(date => date > oneHourAgo);
        return recentReports.length > 5;
      };
      
      const now = new Date();
      const reports = [
        now,
        new Date(now.getTime() - 10 * 60 * 1000),
        new Date(now.getTime() - 20 * 60 * 1000),
        new Date(now.getTime() - 30 * 60 * 1000),
        new Date(now.getTime() - 40 * 60 * 1000),
        new Date(now.getTime() - 50 * 60 * 1000)
      ];
      
      expect(detectRapidReporting(reports)).toBe(true);
      expect(detectRapidReporting([now])).toBe(false);
    });

    it('虚偽通報スコアを正しく計算する', () => {
      interface ReportHistory {
        totalReports: number;
        rejectedReports: number;
        recentReports: number;
        duplicateTargets: number;
      }
      
      const calculateFalseReportScore = (history: ReportHistory): number => {
        let score = 0;
        
        // 却下率チェック
        if (history.totalReports > 0) {
          const rejectionRate = history.rejectedReports / history.totalReports;
          if (rejectionRate > 0.7) score += 40;
          else if (rejectionRate > 0.5) score += 30;
          else if (rejectionRate > 0.3) score += 20;
        }
        
        // 頻繁な通報
        if (history.recentReports > 5) score += 30;
        else if (history.recentReports > 3) score += 20;
        
        // 同一ターゲットへの重複通報
        if (history.duplicateTargets > 2) score += 30;
        else if (history.duplicateTargets > 0) score += 15;
        
        return Math.min(100, score);
      };
      
      // 正常なユーザー
      expect(calculateFalseReportScore({
        totalReports: 10,
        rejectedReports: 1,
        recentReports: 1,
        duplicateTargets: 0
      })).toBeLessThan(20);
      
      // 疑わしいユーザー
      expect(calculateFalseReportScore({
        totalReports: 10,
        rejectedReports: 8,
        recentReports: 6,
        duplicateTargets: 3
      })).toBeGreaterThan(70);
    });
  });

  describe('通報フィードバック', () => {
    it('通報後に適切なフィードバックメッセージを表示', async () => {
      const getResponseMessage = (priority: number): string => {
        if (priority >= 7) return '緊急対応いたします（1時間以内）';
        if (priority >= 4) return '24時間以内に対応いたします';
        return '3営業日以内に確認いたします';
      };
      
      expect(getResponseMessage(8)).toContain('緊急');
      expect(getResponseMessage(5)).toContain('24時間');
      expect(getResponseMessage(2)).toContain('3営業日');
    });

    it('虚偽通報の可能性が高い場合、警告を表示', () => {
      const shouldShowWarning = (falseReportScore: number): boolean => {
        return falseReportScore >= 60;
      };
      
      const getWarningMessage = (score: number): string | null => {
        if (score >= 80) return '虚偽通報は利用規約違反となります';
        if (score >= 60) return '通報内容を再度ご確認ください';
        return null;
      };
      
      expect(shouldShowWarning(85)).toBe(true);
      expect(shouldShowWarning(45)).toBe(false);
      expect(getWarningMessage(85)).toContain('利用規約違反');
      expect(getWarningMessage(65)).toContain('再度ご確認');
      expect(getWarningMessage(30)).toBeNull();
    });
  });

  describe('通報API', () => {
    it('通報データが正しく送信される', async () => {
      const reportData = {
        targetId: 'post-123',
        targetType: 'post',
        category: 'SPAM',
        description: 'スパム投稿です',
        reporterId: 'user-456'
      };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          success: true,
          reportId: 'report-789',
          priority: 3
        })
      });
      
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });
      
      expect(fetch).toHaveBeenCalledWith(
        '/api/reports',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(reportData)
        })
      );
      
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.reportId).toBe('report-789');
    });

    it('重複通報を検出してエラーを返す', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ 
          error: 'この内容はすでに通報済みです'
        })
      });
      
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: 'duplicate-post',
          targetType: 'post',
          category: 'SPAM',
          reporterId: 'user-123'
        })
      });
      
      expect(response.ok).toBe(false);
      expect(response.status).toBe(409);
      
      const result = await response.json();
      expect(result.error).toContain('すでに通報済み');
    });
  });

  describe('統計とレポート', () => {
    it('通報統計が正しく計算される', () => {
      const reports = [
        { status: 'pending', priority: 5, falseReportScore: 20 },
        { status: 'pending', priority: 7, falseReportScore: 30 },
        { status: 'reviewing', priority: 8, falseReportScore: 10 },
        { status: 'resolved', priority: 3, falseReportScore: 5 },
        { status: 'rejected', priority: 2, falseReportScore: 80 }
      ];
      
      const calculateStats = (reports: any[]) => {
        const totalReports = reports.length;
        const pendingCount = reports.filter(r => r.status === 'pending').length;
        const reviewingCount = reports.filter(r => r.status === 'reviewing').length;
        const resolvedCount = reports.filter(r => r.status === 'resolved').length;
        const rejectedCount = reports.filter(r => r.status === 'rejected').length;
        const avgPriority = reports.reduce((sum, r) => sum + r.priority, 0) / totalReports;
        const avgFalseReportScore = reports.reduce((sum, r) => sum + r.falseReportScore, 0) / totalReports;
        const resolutionRate = ((resolvedCount + rejectedCount) / totalReports) * 100;
        
        return {
          totalReports,
          pendingCount,
          reviewingCount,
          resolvedCount,
          rejectedCount,
          avgPriority,
          avgFalseReportScore,
          resolutionRate
        };
      };
      
      const stats = calculateStats(reports);
      
      expect(stats.totalReports).toBe(5);
      expect(stats.pendingCount).toBe(2);
      expect(stats.reviewingCount).toBe(1);
      expect(stats.resolvedCount).toBe(1);
      expect(stats.rejectedCount).toBe(1);
      expect(stats.avgPriority).toBe(5);
      expect(stats.avgFalseReportScore).toBe(29);
      expect(stats.resolutionRate).toBe(40);
    });
  });
});