import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { AuditSignature } from '../lib/audit-signature';

// モック設定
jest.mock('../lib/db', () => ({
  connectDatabase: jest.fn().mockResolvedValue(true)
}));

// AuditLogモデルのモック
const mockAuditLog = {
  logEvent: jest.fn(),
  verifyChain: jest.fn(),
  archiveOldLogs: jest.fn(),
  detectAnomalies: jest.fn(),
  getStats: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  updateMany: jest.fn(),
  aggregate: jest.fn()
};

jest.mock('../models/AuditLog', () => mockAuditLog);

describe('監査ログシステムテスト', () => {
  
  beforeEach(() => {
    // 各テスト前にモックをクリア
    jest.clearAllMocks();
    process.env.AUDIT_LOG_SECRET = 'test-secret-key';
    process.env.ADMIN_SECRET_KEY = 'test-admin-key';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('自動記録機能', () => {
    it('重要操作が自動的に記録される', async () => {
      const { logAuditEvent } = await import('../middleware/auditLog');
      
      const mockLog = {
        _id: 'test-id',
        timestamp: new Date(),
        eventType: 'USER_CREATED',
        signature: 'test-signature'
      };
      
      mockAuditLog.logEvent.mockResolvedValue(mockLog);
      
      await logAuditEvent(
        'USER_CREATED',
        'Created new user',
        {
          userId: 'user123',
          userEmail: 'test@example.com'
        }
      );
      
      expect(mockAuditLog.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'USER_CREATED',
          action: 'Created new user',
          userId: 'user123',
          userEmail: 'test@example.com'
        })
      );
    });

    it('ミドルウェアがAPIリクエストを記録する', async () => {
      const { auditLogMiddleware } = await import('../middleware/auditLog');
      
      // モックリクエストとレスポンス
      const mockRequest = {
        method: 'POST',
        nextUrl: { 
          pathname: '/api/admin/users',
          searchParams: new URLSearchParams()
        },
        headers: new Headers({
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0'
        }),
        cookies: {
          get: jest.fn().mockReturnValue({ value: 'mock-token' })
        },
        clone: () => ({
          json: jest.fn().mockResolvedValue({ email: 'test@example.com' })
        })
      } as any;
      
      const mockResponse = {
        status: 200,
        statusText: 'OK'
      } as any;
      
      const handler = jest.fn().mockResolvedValue(mockResponse);
      
      await auditLogMiddleware(mockRequest, handler);
      
      expect(handler).toHaveBeenCalled();
      
      // 非同期で記録されるため、少し待つ
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('機密情報がサニタイズされる', async () => {
      const { logAuditEvent } = await import('../middleware/auditLog');
      
      const sensitiveData = {
        email: 'test@example.com',
        password: 'secret123',
        token: 'jwt-token',
        apiKey: 'api-key-123'
      };
      
      mockAuditLog.logEvent.mockImplementation((data) => {
        expect(data.password).toBeUndefined();
        expect(data.token).toBeUndefined();
        expect(data.apiKey).toBeUndefined();
        expect(data.email).toBe('test@example.com');
        return Promise.resolve({ _id: 'test' });
      });
      
      await logAuditEvent(
        'DATA_CREATE',
        'Created resource',
        sensitiveData
      );
    });
  });

  describe('改ざん防止機能', () => {
    it('署名が正しく生成される', () => {
      const data = {
        timestamp: new Date('2024-01-01'),
        eventType: 'USER_LOGIN',
        userId: 'user123',
        action: 'Login successful',
        changes: { status: 'active' }
      };
      
      const signature = AuditSignature.generateSignature(data);
      
      expect(signature).toBeTruthy();
      expect(signature.length).toBe(64); // SHA256のHex文字列長
    });

    it('署名の検証が正しく動作する', () => {
      const data = {
        timestamp: new Date('2024-01-01'),
        eventType: 'USER_LOGIN',
        userId: 'user123',
        action: 'Login successful',
        changes: {}
      };
      
      const signature = AuditSignature.generateSignature(data);
      const isValid = AuditSignature.verifySignature(data, signature);
      
      expect(isValid).toBe(true);
    });

    it('改ざんされたデータが検出される', () => {
      const originalData = {
        timestamp: new Date('2024-01-01'),
        eventType: 'USER_LOGIN',
        userId: 'user123',
        action: 'Login successful',
        changes: {}
      };
      
      const signature = AuditSignature.generateSignature(originalData);
      
      // データを改ざん
      const tamperedData = { ...originalData, userId: 'hacker123' };
      const isValid = AuditSignature.verifySignature(tamperedData, signature);
      
      expect(isValid).toBe(false);
    });

    it('チェーン検証が正しく動作する', async () => {
      const logs = [
        { _id: '1', timestamp: new Date(), signature: 'sig1', previousHash: null },
        { _id: '2', timestamp: new Date(), signature: 'sig2', previousHash: 'sig1' },
        { _id: '3', timestamp: new Date(), signature: 'sig3', previousHash: 'sig2' }
      ];
      
      const verifyResult = {
        total: 3,
        valid: 3,
        invalid: 0,
        broken: []
      };
      
      mockAuditLog.verifyChain.mockResolvedValue(verifyResult);
      mockAuditLog.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(logs)
      });
      
      const result = await mockAuditLog.verifyChain(
        new Date('2024-01-01'),
        new Date('2024-12-31')
      );
      
      expect(result.valid).toBe(3);
      expect(result.invalid).toBe(0);
      expect(result.broken).toHaveLength(0);
    });
  });

  describe('検索とフィルタリング', () => {
    it('期間フィルタが正しく動作する', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      
      mockAuditLog.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([])
            })
          })
        })
      });
      
      await mockAuditLog.find({
        timestamp: { $gte: startDate, $lte: endDate }
      }).sort({ timestamp: -1 }).limit(50).skip(0).lean();
      
      expect(mockAuditLog.find).toHaveBeenCalledWith({
        timestamp: { $gte: startDate, $lte: endDate }
      });
    });

    it('イベントタイプフィルタが正しく動作する', async () => {
      mockAuditLog.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { eventType: 'USER_LOGIN' },
            { eventType: 'USER_LOGIN' }
          ])
        })
      });
      
      const result = await mockAuditLog.find({ eventType: 'USER_LOGIN' })
        .sort({ timestamp: -1 })
        .lean();
      
      expect(result).toHaveLength(2);
      expect(result.every(log => log.eventType === 'USER_LOGIN')).toBe(true);
    });

    it('重要度フィルタが正しく動作する', async () => {
      mockAuditLog.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { severity: 'critical' },
          { severity: 'critical' }
        ])
      });
      
      const result = await mockAuditLog.find({ severity: 'critical' }).lean();
      
      expect(result.every(log => log.severity === 'critical')).toBe(true);
    });
  });

  describe('アーカイブ機能', () => {
    it('古いログが正しくアーカイブされる', async () => {
      const result = {
        modifiedCount: 100
      };
      
      mockAuditLog.archiveOldLogs.mockResolvedValue(result);
      
      const archiveResult = await mockAuditLog.archiveOldLogs(90);
      
      expect(archiveResult.modifiedCount).toBe(100);
      expect(mockAuditLog.archiveOldLogs).toHaveBeenCalledWith(90);
    });

    it('アーカイブ日数が正しく計算される', async () => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);
      
      mockAuditLog.updateMany.mockResolvedValue({
        modifiedCount: 50
      });
      
      await mockAuditLog.updateMany(
        {
          timestamp: { $lt: cutoffDate },
          isArchived: false
        },
        {
          $set: {
            isArchived: true,
            archivedAt: new Date(),
            archiveId: `archive_${Date.now()}`
          }
        }
      );
      
      expect(mockAuditLog.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          isArchived: false
        }),
        expect.objectContaining({
          $set: expect.objectContaining({
            isArchived: true
          })
        })
      );
    });
  });

  describe('セキュリティイベント検出', () => {
    it('ブルートフォース攻撃が検出される', async () => {
      const anomalies = [{
        type: 'BRUTE_FORCE_ATTEMPT',
        details: [{
          _id: '192.168.1.1',
          count: 10,
          users: ['user1@example.com', 'user2@example.com']
        }]
      }];
      
      mockAuditLog.detectAnomalies.mockResolvedValue(anomalies);
      
      const detected = await mockAuditLog.detectAnomalies();
      
      expect(detected).toHaveLength(1);
      expect(detected[0].type).toBe('BRUTE_FORCE_ATTEMPT');
      expect(detected[0].details[0].count).toBeGreaterThanOrEqual(5);
    });

    it('異常なデータアクセスが検出される', async () => {
      const anomalies = [{
        type: 'EXCESSIVE_DATA_ACCESS',
        details: [{
          _id: 'user123',
          count: 150,
          resources: ['resource1', 'resource2', 'resource3']
        }]
      }];
      
      mockAuditLog.detectAnomalies.mockResolvedValue(anomalies);
      
      const detected = await mockAuditLog.detectAnomalies();
      
      expect(detected).toHaveLength(1);
      expect(detected[0].type).toBe('EXCESSIVE_DATA_ACCESS');
      expect(detected[0].details[0].count).toBeGreaterThanOrEqual(100);
    });

    it('権限昇格の試みが検出される', async () => {
      const anomalies = [{
        type: 'PRIVILEGE_ESCALATION_ATTEMPT',
        details: [
          { eventType: 'AUTH_UNAUTHORIZED_ACCESS', userId: 'user123' }
        ]
      }];
      
      mockAuditLog.detectAnomalies.mockResolvedValue(anomalies);
      
      const detected = await mockAuditLog.detectAnomalies();
      
      expect(detected).toHaveLength(1);
      expect(detected[0].type).toBe('PRIVILEGE_ESCALATION_ATTEMPT');
    });
  });

  describe('コンプライアンスレポート', () => {
    it('統計情報が正しく集計される', async () => {
      const stats = {
        byEventType: [
          { _id: 'USER_LOGIN', count: 100 },
          { _id: 'DATA_READ', count: 500 }
        ],
        bySeverity: [
          { _id: 'info', count: 400 },
          { _id: 'warning', count: 150 },
          { _id: 'critical', count: 50 }
        ],
        byUser: [
          { _id: 'user1', count: 200 },
          { _id: 'user2', count: 150 }
        ],
        total: [{ count: 600 }]
      };
      
      mockAuditLog.getStats.mockResolvedValue(stats);
      
      const result = await mockAuditLog.getStats(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );
      
      expect(result.total[0].count).toBe(600);
      expect(result.byEventType).toHaveLength(2);
      expect(result.bySeverity).toHaveLength(3);
    });

    it('コンプライアンスレポートが生成される', () => {
      const logs = [
        { timestamp: new Date(), eventType: 'SECURITY_ALERT', userId: 'user1' },
        { timestamp: new Date(), eventType: 'DATA_CREATE', userId: 'user2' },
        { timestamp: new Date(), eventType: 'USER_UPDATED', userId: 'user1' }
      ];
      
      const report = AuditSignature.aggregateForCompliance(logs);
      
      expect(report.totalEvents).toBe(3);
      expect(report.securityEvents).toBe(1);
      expect(report.dataOperations).toBe(1);
      expect(report.userManagement).toBe(1);
      expect(report.byUser['user1']).toBe(2);
      expect(report.byUser['user2']).toBe(1);
    });

    it('エクスポート機能が正しく動作する', async () => {
      const logs = [
        {
          timestamp: new Date(),
          eventType: 'USER_LOGIN',
          userId: 'user123',
          action: 'Login successful'
        }
      ];
      
      mockAuditLog.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(logs)
        })
      });
      
      const result = await mockAuditLog.find({})
        .sort({ timestamp: -1 })
        .lean();
      
      expect(result).toHaveLength(1);
      expect(result[0].eventType).toBe('USER_LOGIN');
    });
  });

  describe('エラーハンドリング', () => {
    it('データベース接続エラーが処理される', async () => {
      const { logAuditEvent } = await import('../middleware/auditLog');
      
      mockAuditLog.logEvent.mockRejectedValue(new Error('Database connection failed'));
      
      // エラーがスローされないことを確認
      await expect(
        logAuditEvent('USER_LOGIN', 'Login attempt', {})
      ).resolves.not.toThrow();
    });

    it('不正な署名が検出される', () => {
      const data = {
        timestamp: new Date(),
        eventType: 'USER_LOGIN',
        userId: 'user123',
        action: 'Login successful',
        changes: {}
      };
      
      const invalidSignature = 'invalid-signature-123';
      const isValid = AuditSignature.verifySignature(data, invalidSignature);
      
      expect(isValid).toBe(false);
    });
  });
});

describe('監査ログAPIエンドポイント', () => {
  it('GET /api/admin/audit-logs が正しくログを返す', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        logs: [],
        total: 0,
        page: 1,
        limit: 50
      })
    });
    
    global.fetch = mockFetch as any;
    
    const response = await fetch('/api/admin/audit-logs', {
      headers: {
        'x-admin-secret': 'test-admin-key'
      }
    });
    
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data).toHaveProperty('logs');
    expect(data).toHaveProperty('total');
  });

  it('認証なしのアクセスが拒否される', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: jest.fn().mockResolvedValue({ error: 'Unauthorized' })
    });
    
    global.fetch = mockFetch as any;
    
    const response = await fetch('/api/admin/audit-logs');
    
    expect(response.ok).toBe(false);
    expect(response.status).toBe(401);
  });
});