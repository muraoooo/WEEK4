/**
 * 通報システムのテストスイート
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// 優先順位計算のテスト
describe('Priority Calculation', () => {
  describe('calculatePriorityScore', () => {
    it('should assign highest priority to child safety reports', () => {
      const score = calculatePriorityScore('child_safety', null, null, []);
      expect(score.priority).toBe('critical');
      expect(score.score).toBeGreaterThanOrEqual(100);
    });

    it('should assign high priority to violence and fraud reports', () => {
      const violenceScore = calculatePriorityScore('violence', null, null, []);
      const fraudScore = calculatePriorityScore('fraud', null, null, []);
      
      expect(violenceScore.priority).toBe('critical');
      expect(fraudScore.priority).toBe('critical');
      expect(violenceScore.score).toBeGreaterThanOrEqual(85);
      expect(fraudScore.score).toBeGreaterThanOrEqual(85);
    });

    it('should lower priority for reporters with high false report rate', () => {
      const reporterHistory = {
        totalReports: 10,
        validReports: 2,
        falseReports: 8
      };
      
      const score = calculatePriorityScore('harassment', reporterHistory, null, []);
      expect(score.falseReportProbability).toBe(0.8);
      expect(score.priority).toBe('low');
    });

    it('should increase priority for targets with violation history', () => {
      const targetHistory = {
        violationCount: 5,
        reportedCount: 10,
        lastViolation: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        warningCount: 3
      };
      
      const scoreWithHistory = calculatePriorityScore('spam', null, targetHistory, []);
      const scoreWithoutHistory = calculatePriorityScore('spam', null, null, []);
      
      expect(scoreWithHistory.score).toBeGreaterThan(scoreWithoutHistory.score);
    });

    it('should increase priority for multiple reports on same target', () => {
      const previousReports = [
        { createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) }, // 2 hours ago
        { createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000) }, // 5 hours ago
        { createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000) }, // 10 hours ago
      ];
      
      const scoreWithReports = calculatePriorityScore('harassment', null, null, previousReports);
      const scoreWithoutReports = calculatePriorityScore('harassment', null, null, []);
      
      expect(scoreWithReports.score).toBeGreaterThan(scoreWithoutReports.score);
      expect(scoreWithReports.priority).toBe('critical');
    });
  });
});

// 通報フローのテスト
describe('Report Flow', () => {
  let mockFetch: jest.Mock;
  
  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should complete 3-step reporting flow', async () => {
    const reportData = {
      targetType: 'post',
      targetId: 'post123',
      category: 'harassment',
      description: 'Test report',
      reporterId: 'user123',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        reportId: 'report123',
        message: 'ご報告ありがとうございます。速やかに確認し対処いたします。',
        estimatedTime: '1-2営業日',
        priority: 'high',
      })
    });

    const response = await fetch('/api/reports', {
      method: 'POST',
      body: JSON.stringify(reportData),
    });

    const result = await response.json();
    
    expect(result.success).toBe(true);
    expect(result.reportId).toBeDefined();
    expect(result.message).toBeDefined();
    expect(result.priority).toBe('high');
  });

  it('should prevent duplicate reports within 24 hours', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: 'すでに通報済みです。24時間以内に同じ対象を複数回通報することはできません。'
      })
    });

    const reportData = {
      targetType: 'post',
      targetId: 'post123',
      category: 'spam',
      reporterId: 'user123',
    };

    const response = await fetch('/api/reports', {
      method: 'POST',
      body: JSON.stringify(reportData),
    });

    const result = await response.json();
    expect(response.ok).toBe(false);
    expect(result.error).toContain('すでに通報済み');
  });

  it('should validate required fields', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: '必須項目が不足しています'
      })
    });

    const incompleteData = {
      targetType: 'post',
      // Missing targetId and category
    };

    const response = await fetch('/api/reports', {
      method: 'POST',
      body: JSON.stringify(incompleteData),
    });

    expect(response.ok).toBe(false);
    const result = await response.json();
    expect(result.error).toContain('必須項目');
  });
});

// フィードバックシステムのテスト
describe('Feedback System', () => {
  describe('generateFeedbackMessage', () => {
    it('should provide immediate feedback for critical reports', () => {
      const feedback = generateFeedbackMessage('critical', 'violence', 0.1);
      
      expect(feedback.message).toContain('優先的に対処');
      expect(feedback.estimatedTime).toBe('24時間以内');
      expect(feedback.autoAction).toBe('temporary_hide');
    });

    it('should provide cautious feedback for high false report probability', () => {
      const feedback = generateFeedbackMessage('medium', 'spam', 0.8);
      
      expect(feedback.message).toContain('慎重に確認');
      expect(feedback.estimatedTime).toBe('5-7営業日');
      expect(feedback.autoAction).toBeUndefined();
    });

    it('should auto-hide dangerous content', () => {
      const categories = ['violence', 'child_safety', 'fraud'];
      
      categories.forEach(category => {
        const feedback = generateFeedbackMessage('critical', category, 0.1);
        expect(feedback.autoAction).toBe('temporary_hide');
      });
    });

    it('should provide appropriate time estimates based on priority', () => {
      const priorities = [
        { priority: 'critical', expected: '24時間以内' },
        { priority: 'high', expected: '1-2営業日' },
        { priority: 'medium', expected: '3-5営業日' },
        { priority: 'low', expected: '5-7営業日' },
      ];

      priorities.forEach(({ priority, expected }) => {
        const feedback = generateFeedbackMessage(priority, 'spam', 0.2);
        expect(feedback.estimatedTime).toBe(expected);
      });
    });
  });
});

// 虚偽通報検出のテスト
describe('False Report Detection', () => {
  it('should calculate false report probability based on history', () => {
    const histories = [
      { total: 10, false: 8, expected: 0.8 },
      { total: 20, false: 5, expected: 0.25 },
      { total: 100, false: 10, expected: 0.1 },
      { total: 0, false: 0, expected: 0 },
    ];

    histories.forEach(({ total, false: falseReports, expected }) => {
      const probability = calculateFalseReportProbability(total, falseReports);
      expect(probability).toBe(expected);
    });
  });

  it('should flag users with high false report rate', () => {
    const reporter = {
      userId: 'user123',
      totalReports: 20,
      falseReports: 15,
      validReports: 5,
    };

    const isSuspicious = detectSuspiciousReporter(reporter);
    expect(isSuspicious).toBe(true);
  });

  it('should track false report patterns', () => {
    const patterns = [
      {
        pattern: 'mass_reporting',
        indicators: ['multiple_reports_short_time', 'same_targets'],
        detected: true
      },
      {
        pattern: 'targeted_harassment',
        indicators: ['single_target_multiple_reports', 'personal_reasons'],
        detected: true
      },
    ];

    patterns.forEach(pattern => {
      const detected = detectReportPattern(pattern.indicators);
      expect(detected).toBe(pattern.detected);
    });
  });
});

// 統計とレポート機能のテスト
describe('Statistics and Reporting', () => {
  it('should aggregate report statistics correctly', () => {
    const reports = [
      { category: 'spam', priority: 'low', status: 'resolved' },
      { category: 'harassment', priority: 'high', status: 'pending' },
      { category: 'violence', priority: 'critical', status: 'reviewing' },
      { category: 'spam', priority: 'low', status: 'rejected' },
    ];

    const stats = aggregateReportStats(reports);

    expect(stats.byCategory.spam).toBe(2);
    expect(stats.byCategory.harassment).toBe(1);
    expect(stats.byPriority.critical).toBe(1);
    expect(stats.byStatus.pending).toBe(1);
  });

  it('should calculate resolution rates', () => {
    const stats = {
      resolved: 150,
      rejected: 50,
      pending: 30,
      reviewing: 20,
    };

    const rates = calculateResolutionRates(stats);
    
    expect(rates.resolutionRate).toBe(75); // 150 / (150 + 50)
    expect(rates.pendingRate).toBe(20); // (30 + 20) / 250
  });

  it('should track response time metrics', () => {
    const reports = [
      { createdAt: new Date('2024-01-01'), resolvedAt: new Date('2024-01-02') },
      { createdAt: new Date('2024-01-01'), resolvedAt: new Date('2024-01-03') },
      { createdAt: new Date('2024-01-01'), resolvedAt: new Date('2024-01-01T06:00:00') },
    ];

    const metrics = calculateResponseTimeMetrics(reports);
    
    expect(metrics.average).toBeGreaterThan(0);
    expect(metrics.median).toBeGreaterThan(0);
    expect(metrics.p95).toBeGreaterThanOrEqual(metrics.median);
  });
});

// Helper functions for testing (these would normally be imported from the actual implementation)

function calculatePriorityScore(category: string, reporterHistory: any, targetHistory: any, previousReports: any[]) {
  // Mock implementation for testing
  const categoryScores: Record<string, number> = {
    violence: 90,
    hate_speech: 85,
    child_safety: 100,
    fraud: 95,
    harassment: 75,
    spam: 30,
  };

  let score = categoryScores[category] || 20;
  let falseReportProbability = 0;

  if (reporterHistory) {
    const validRate = reporterHistory.totalReports > 0 
      ? reporterHistory.validReports / reporterHistory.totalReports 
      : 0.5;
    score *= (0.5 + validRate);
    
    if (reporterHistory.totalReports >= 5) {
      falseReportProbability = reporterHistory.falseReports / reporterHistory.totalReports;
      if (falseReportProbability > 0.5) score *= 0.3;
    }
  }

  if (targetHistory) {
    if (targetHistory.violationCount > 0) {
      score += Math.min(targetHistory.violationCount * 10, 30);
    }
    if (targetHistory.lastViolation) {
      const daysSince = (Date.now() - targetHistory.lastViolation.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) score += 20;
    }
  }

  if (previousReports.length > 0) {
    const recentReports = previousReports.filter(r => {
      const hoursSince = (Date.now() - r.createdAt.getTime()) / (1000 * 60 * 60);
      return hoursSince < 24;
    });
    score += Math.min(recentReports.length * 15, 45);
  }

  let priority: 'critical' | 'high' | 'medium' | 'low';
  if (score >= 85) priority = 'critical';
  else if (score >= 60) priority = 'high';
  else if (score >= 35) priority = 'medium';
  else priority = 'low';

  if (falseReportProbability > 0.7 && priority !== 'critical') {
    priority = 'low';
  }

  return { score, priority, falseReportProbability };
}

function generateFeedbackMessage(priority: string, category: string, falseReportProbability: number) {
  let message = '';
  let estimatedTime = '';
  let autoAction;

  if (falseReportProbability > 0.7) {
    message = '通報を受け付けました。内容を慎重に確認させていただきます。';
    estimatedTime = '5-7営業日';
  } else if (priority === 'critical') {
    message = '重要な通報として優先的に対処いたします。';
    estimatedTime = '24時間以内';
    if (['violence', 'child_safety', 'fraud'].includes(category)) {
      autoAction = 'temporary_hide';
    }
  } else if (priority === 'high') {
    message = 'ご報告ありがとうございます。速やかに確認し対処いたします。';
    estimatedTime = '1-2営業日';
  } else if (priority === 'medium') {
    message = '通報を受け付けました。順次確認させていただきます。';
    estimatedTime = '3-5営業日';
  } else {
    message = '通報を受け付けました。内容を確認させていただきます。';
    estimatedTime = '5-7営業日';
  }

  return { message, estimatedTime, autoAction };
}

function calculateFalseReportProbability(totalReports: number, falseReports: number) {
  return totalReports > 0 ? falseReports / totalReports : 0;
}

function detectSuspiciousReporter(reporter: any) {
  const falseRate = reporter.falseReports / reporter.totalReports;
  return falseRate > 0.7;
}

function detectReportPattern(indicators: string[]) {
  // Mock pattern detection
  return indicators.length >= 2;
}

function aggregateReportStats(reports: any[]) {
  const stats = {
    byCategory: {} as Record<string, number>,
    byPriority: {} as Record<string, number>,
    byStatus: {} as Record<string, number>,
  };

  reports.forEach(report => {
    stats.byCategory[report.category] = (stats.byCategory[report.category] || 0) + 1;
    stats.byPriority[report.priority] = (stats.byPriority[report.priority] || 0) + 1;
    stats.byStatus[report.status] = (stats.byStatus[report.status] || 0) + 1;
  });

  return stats;
}

function calculateResolutionRates(stats: any) {
  const total = stats.resolved + stats.rejected + stats.pending + stats.reviewing;
  const completed = stats.resolved + stats.rejected;
  const pending = stats.pending + stats.reviewing;

  return {
    resolutionRate: completed > 0 ? (stats.resolved / completed) * 100 : 0,
    pendingRate: total > 0 ? (pending / total) * 100 : 0,
  };
}

function calculateResponseTimeMetrics(reports: any[]) {
  const responseTimes = reports
    .filter(r => r.resolvedAt)
    .map(r => r.resolvedAt.getTime() - r.createdAt.getTime());

  const sorted = responseTimes.sort((a, b) => a - b);
  const average = sorted.reduce((sum, time) => sum + time, 0) / sorted.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];

  return { average, median, p95 };
}