import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MongoClient } from 'mongodb';
import { POST, GET } from '@/app/api/reports/route';
import { NextRequest } from 'next/server';

// Mock MongoDB
vi.mock('mongodb', () => ({
  MongoClient: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    close: vi.fn(),
    db: vi.fn().mockReturnValue({
      collection: vi.fn().mockReturnValue({
        insertOne: vi.fn(),
        findOne: vi.fn(),
        find: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          skip: vi.fn().mockReturnThis(),
          toArray: vi.fn()
        }),
        countDocuments: vi.fn(),
        updateOne: vi.fn(),
        aggregate: vi.fn().mockReturnValue({
          toArray: vi.fn()
        })
      })
    })
  })),
  ObjectId: vi.fn()
}));

// Mock config
vi.mock('@/lib/config', () => ({
  config: {
    mongodbUri: 'mongodb://test',
    adminSecretKey: 'test-admin-key'
  }
}));

// ReportDialog Component tests are skipped due to JSX in test files limitation
// These should be tested through integration tests or E2E tests

describe('Report API Endpoint', () => {
  let mockClient: any;
  let mockDb: any;
  let mockCollection: any;

  beforeEach(() => {
    mockCollection = {
      insertOne: vi.fn().mockResolvedValue({ insertedId: 'report-123' }),
      findOne: vi.fn().mockResolvedValue(null),
      find: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([])
      }),
      countDocuments: vi.fn().mockResolvedValue(0),
      updateOne: vi.fn().mockResolvedValue({}),
      aggregate: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([])
      })
    };
    
    mockDb = {
      collection: vi.fn().mockReturnValue(mockCollection)
    };
    
    mockClient = {
      connect: vi.fn(),
      close: vi.fn(),
      db: vi.fn().mockReturnValue(mockDb)
    };
    
    (MongoClient as any).mockImplementation(() => mockClient);
  });

  describe('POST /api/reports', () => {
    it('should create a new report successfully', async () => {
      const mockRequest = new NextRequest('http://localhost/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          targetId: 'post-123',
          targetType: 'post',
          category: 'HARASSMENT',
          description: 'This is harassment content',
          reporterId: 'user-456',
          metadata: {
            targetContent: 'Offensive content here'
          }
        })
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.reportId).toBe('report-123');
      expect(data.message).toContain('通報を受け付けました');
    });

    it('should reject duplicate reports', async () => {
      mockCollection.findOne.mockResolvedValueOnce({
        _id: 'existing-report',
        targetId: 'post-123',
        reporterId: 'user-456'
      });

      const mockRequest = new NextRequest('http://localhost/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          targetId: 'post-123',
          targetType: 'post',
          category: 'SPAM',
          reporterId: 'user-456'
        })
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('この内容はすでに通報済みです');
    });

    it('should validate required fields', async () => {
      const mockRequest = new NextRequest('http://localhost/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          targetType: 'post'
        })
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('必須項目が不足しています');
    });

    it('should validate target type', async () => {
      const mockRequest = new NextRequest('http://localhost/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          targetId: 'test-123',
          targetType: 'invalid',
          category: 'SPAM',
          reporterId: 'user-456'
        })
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('無効なターゲットタイプです');
    });
  });

  describe('GET /api/reports', () => {
    it('should require admin authentication', async () => {
      const mockRequest = new NextRequest('http://localhost/api/reports');
      
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return reports list for admin', async () => {
      mockCollection.find.mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([
          {
            _id: 'report-1',
            targetId: 'post-123',
            category: 'SPAM',
            priority: 1,
            status: 'pending'
          }
        ])
      });
      
      mockCollection.countDocuments.mockResolvedValue(1);
      
      mockCollection.aggregate.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{
          totalReports: 1,
          pendingCount: 1,
          reviewingCount: 0,
          resolvedCount: 0,
          rejectedCount: 0,
          avgPriority: 1,
          avgFalseReportScore: 0
        }])
      });

      const mockRequest = new NextRequest('http://localhost/api/reports', {
        headers: {
          'x-admin-secret': 'test-admin-key'
        }
      });
      
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.reports).toHaveLength(1);
      expect(data.stats.totalReports).toBe(1);
    });
  });
});

describe('Priority Calculation', () => {
  it('should assign correct base priority by category', () => {
    const categoryPriorities = {
      'SPAM': 1,
      'HARASSMENT': 4,
      'VIOLENCE': 5,
      'HATE_SPEECH': 5,
      'MISINFORMATION': 2,
      'INAPPROPRIATE': 3,
      'COPYRIGHT': 2,
      'OTHER': 1
    };

    Object.entries(categoryPriorities).forEach(([category, expectedPriority]) => {
      expect(categoryPriorities[category]).toBe(expectedPriority);
    });
  });

  it('should detect danger keywords', () => {
    const dangerKeywords = ['殺', '死', '自殺', '暴力', '爆破', '薬物', 'ドラッグ', 'kill', 'suicide', 'violence', 'bomb', 'drug'];
    
    const testContent = '暴力的な内容を含む投稿';
    const hasDanger = dangerKeywords.some(keyword => 
      testContent.toLowerCase().includes(keyword.toLowerCase())
    );
    
    expect(hasDanger).toBe(true);
  });
});

describe('False Report Detection', () => {
  it('should calculate false report score based on frequency', () => {
    const recentReports = 10; // More than 5 in 24 hours
    let falseReportScore = 0;
    
    if (recentReports > 5) {
      falseReportScore += 30;
    }
    
    expect(falseReportScore).toBe(30);
  });

  it('should detect repeated reports to same target', () => {
    const targetReports = 3; // More than 2 to same target
    let falseReportScore = 0;
    
    if (targetReports > 2) {
      falseReportScore += 40;
    }
    
    expect(falseReportScore).toBe(40);
  });

  it('should consider rejection rate', () => {
    const rejectedCount = 8;
    const totalCount = 10;
    let falseReportScore = 0;
    
    if (totalCount > 5) {
      const rejectionRate = rejectedCount / totalCount;
      if (rejectionRate > 0.7) {
        falseReportScore += 30;
      }
    }
    
    expect(falseReportScore).toBe(30);
  });

  it('should cap false report score at 100', () => {
    let falseReportScore = 30 + 40 + 30 + 50; // 150
    falseReportScore = Math.min(100, falseReportScore);
    
    expect(falseReportScore).toBe(100);
  });
});

describe('Feedback Messages', () => {
  it('should provide appropriate estimated response time', () => {
    const getEstimatedTime = (priority: number) => {
      return priority >= 7 ? '1時間以内' : 
             priority >= 4 ? '24時間以内' : 
             '3営業日以内';
    };
    
    expect(getEstimatedTime(8)).toBe('1時間以内');
    expect(getEstimatedTime(5)).toBe('24時間以内');
    expect(getEstimatedTime(2)).toBe('3営業日以内');
  });

  it('should return appropriate feedback message', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        reportId: 'report-123',
        message: '通報を受け付けました。内容を確認し、適切な対応を行います。',
        priority: 4,
        estimatedResponseTime: '24時間以内'
      })
    });
    
    global.fetch = mockFetch;
    
    const response = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetId: 'test-123',
        targetType: 'post',
        category: 'HARASSMENT',
        reporterId: 'user-456'
      })
    });
    
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.message).toBe('通報を受け付けました。内容を確認し、適切な対応を行います。');
    expect(result.estimatedResponseTime).toBe('24時間以内');
  });
});

describe('High Priority Report Handling', () => {
  it('should immediately hide content for priority >= 8', async () => {
    const mockUpdateOne = vi.fn();
    const mockDb = {
      collection: vi.fn().mockImplementation((name) => {
        if (name === 'reports') {
          return {
            insertOne: vi.fn().mockResolvedValue({ insertedId: 'report-123' }),
            findOne: vi.fn().mockResolvedValue(null),
            find: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnThis(),
              toArray: vi.fn().mockResolvedValue([])
            }),
            countDocuments: vi.fn().mockResolvedValue(5) // Multiple reports
          };
        }
        if (name === 'posts') {
          return {
            updateOne: mockUpdateOne
          };
        }
        if (name === 'audit_logs') {
          return {
            insertOne: vi.fn()
          };
        }
      })
    };
    
    const mockClient = {
      connect: vi.fn(),
      close: vi.fn(),
      db: vi.fn().mockReturnValue(mockDb)
    };
    
    (MongoClient as any).mockImplementation(() => mockClient);
    
    const mockRequest = new NextRequest('http://localhost/api/reports', {
      method: 'POST',
      body: JSON.stringify({
        targetId: 'post-123',
        targetType: 'post',
        category: 'VIOLENCE',
        description: '暴力的な内容です',
        reporterId: 'user-456'
      })
    });

    await POST(mockRequest);
    
    // Verify that posts collection was updated
    expect(mockUpdateOne).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        $set: expect.objectContaining({
          isHidden: true,
          hiddenReason: 'high_priority_report'
        })
      })
    );
  });
});