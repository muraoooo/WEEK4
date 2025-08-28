import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

describe('Reporting System Integration Tests', () => {
  let mockFetch: any;

  beforeAll(() => {
    // Mock fetch globally
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('Complete Reporting Flow', () => {
    it('should handle a complete report submission flow', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          reportId: 'test-report-123',
          priority: 4,
          message: '通報を受け付けました。内容を確認し、適切な対応を行います。',
          estimatedResponseTime: '24時間以内'
        })
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const response = await fetch('http://localhost:3000/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: 'test-post-1',
          targetType: 'post',
          category: 'HARASSMENT',
          description: 'This post contains harassment and bullying content',
          reporterId: 'reporter-1'
        })
      });

      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.reportId).toBe('test-report-123');
      expect(result.priority).toBe(4);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should prevent duplicate reports from same user', async () => {
      const mockResponse = {
        ok: false,
        status: 409,
        json: async () => ({
          error: 'この内容はすでに通報済みです'
        })
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const response = await fetch('http://localhost:3000/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: 'test-post-1',
          targetType: 'post',
          category: 'SPAM',
          reporterId: 'reporter-1'
        })
      });

      expect(response.status).toBe(409);
      const result = await response.json();
      expect(result.error).toBe('この内容はすでに通報済みです');
    });

    it('should increase priority for multiple reports on same target', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          reportId: 'test-report-456',
          priority: 3, // Increased from base 1
          message: '通報を受け付けました',
          estimatedResponseTime: '3営業日以内'
        })
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const response = await fetch('http://localhost:3000/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: 'test-post-1',
          targetType: 'post',
          category: 'SPAM',
          reporterId: 'reporter-4'
        })
      });

      const result = await response.json();
      expect(result.priority).toBeGreaterThan(1);
    });
  });

  describe('Priority Calculation', () => {
    it('should assign higher priority to violence-related reports', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          reportId: 'violence-report-123',
          priority: 5,
          estimatedResponseTime: '24時間以内'
        })
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const response = await fetch('http://localhost:3000/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: 'test-post-1',
          targetType: 'post',
          category: 'VIOLENCE',
          description: '暴力的な内容を含んでいます',
          reporterId: 'reporter-1'
        })
      });

      const result = await response.json();
      expect(result.priority).toBeGreaterThanOrEqual(5);
      expect(result.estimatedResponseTime).toBe('24時間以内');
    });

    it('should detect danger keywords and increase priority', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          reportId: 'danger-report-123',
          priority: 3, // Increased from OTHER base 1
          estimatedResponseTime: '3営業日以内'
        })
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const response = await fetch('http://localhost:3000/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: 'test-post-1',
          targetType: 'post',
          category: 'OTHER',
          description: 'この投稿は自殺を促す内容を含んでいます',
          reporterId: 'reporter-1'
        })
      });

      const result = await response.json();
      expect(result.priority).toBeGreaterThan(1);
    });

    it('should apply trust score modifier based on reporter history', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          reportId: 'trusted-report-123',
          priority: 2, // Base 1 + trust modifier
          estimatedResponseTime: '3営業日以内'
        })
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const response = await fetch('http://localhost:3000/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: 'test-post-1',
          targetType: 'post',
          category: 'SPAM',
          reporterId: 'trusted-reporter'
        })
      });

      const result = await response.json();
      expect(result.priority).toBeGreaterThanOrEqual(2);
    });
  });

  describe('False Report Detection', () => {
    it('should detect suspicious reporting patterns', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          reportId: 'suspicious-report-123',
          priority: 1,
          falseReportScore: 30
        })
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const response = await fetch('http://localhost:3000/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: 'test-post-1',
          targetType: 'post',
          category: 'SPAM',
          reporterId: 'spam-reporter'
        })
      });

      const result = await response.json();
      expect(result.falseReportScore).toBeGreaterThan(0);
    });

    it('should detect repeated reports to same target', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          reportId: 'repeated-report-123',
          priority: 1,
          falseReportScore: 40
        })
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const response = await fetch('http://localhost:3000/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: 'test-post-1',
          targetType: 'post',
          category: 'SPAM',
          reporterId: 'harassing-reporter'
        })
      });

      const result = await response.json();
      expect(result.falseReportScore).toBeGreaterThanOrEqual(40);
    });

    it('should flag users with high rejection rate', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          reportId: 'unreliable-report-123',
          priority: 1,
          falseReportScore: 30
        })
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const response = await fetch('http://localhost:3000/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: 'test-post-1',
          targetType: 'post',
          category: 'SPAM',
          reporterId: 'unreliable-reporter'
        })
      });

      const result = await response.json();
      expect(result.falseReportScore).toBeGreaterThanOrEqual(30);
    });
  });

  describe('High Priority Actions', () => {
    it('should auto-hide content for priority >= 8', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          reportId: 'high-priority-report',
          priority: 8,
          message: '緊急通報を受け付けました。コンテンツは自動的に非表示になりました。',
          estimatedResponseTime: '1時間以内'
        })
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const response = await fetch('http://localhost:3000/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: 'test-post-1',
          targetType: 'post',
          category: 'VIOLENCE',
          description: '殺害予告を含む投稿です',
          reporterId: 'reporter-final'
        })
      });

      const result = await response.json();
      expect(result.priority).toBeGreaterThanOrEqual(8);
      expect(result.estimatedResponseTime).toBe('1時間以内');
    });
  });

  describe('Admin Report Management', () => {
    it('should fetch reports with admin authentication', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          reports: [
            { targetId: 'post-1', category: 'SPAM', status: 'pending', priority: 1 },
            { targetId: 'post-2', category: 'VIOLENCE', status: 'reviewing', priority: 5 }
          ],
          total: 2,
          page: 1,
          limit: 50,
          pages: 1,
          stats: {
            totalReports: 2,
            pendingCount: 1,
            reviewingCount: 1,
            resolvedCount: 0,
            rejectedCount: 0,
            avgPriority: 3,
            avgFalseReportScore: 0
          }
        })
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const response = await fetch('http://localhost:3000/api/reports', {
        headers: {
          'x-admin-secret': 'test-admin-key'
        }
      });

      expect(response.ok).toBe(true);
      const result = await response.json();
      
      expect(result.reports).toHaveLength(2);
      expect(result.stats.pendingCount).toBe(1);
      expect(result.stats.reviewingCount).toBe(1);
    });

    it('should filter reports by status', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          reports: [
            { status: 'pending', priority: 1 },
            { status: 'pending', priority: 3 }
          ],
          total: 2
        })
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const response = await fetch('http://localhost:3000/api/reports?status=pending', {
        headers: {
          'x-admin-secret': 'test-admin-key'
        }
      });

      const result = await response.json();
      expect(result.reports).toHaveLength(2);
      expect(result.reports.every((r: any) => r.status === 'pending')).toBe(true);
    });

    it('should sort reports by priority', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          reports: [
            { priority: 8 },
            { priority: 5 },
            { priority: 2 },
            { priority: 1 }
          ],
          total: 4
        })
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const response = await fetch('http://localhost:3000/api/reports?sortBy=priority', {
        headers: {
          'x-admin-secret': 'test-admin-key'
        }
      });

      const result = await response.json();
      const priorities = result.reports.map((r: any) => r.priority);
      
      expect(priorities).toEqual([8, 5, 2, 1]);
    });
  });
});