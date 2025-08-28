import crypto from 'crypto';

interface AuditLogData {
  timestamp: Date | string;
  eventType: string;
  userId?: string;
  action: string;
  changes?: any;
  [key: string]: any;
}

export class AuditSignature {
  private static secret: string = process.env.AUDIT_LOG_SECRET || 'default-audit-secret-key-change-in-production';

  /**
   * 監査ログの署名を生成
   */
  static generateSignature(data: AuditLogData): string {
    const signatureData = this.createSignatureString(data);
    const hmac = crypto.createHmac('sha256', this.secret);
    hmac.update(signatureData);
    return hmac.digest('hex');
  }

  /**
   * 署名の検証
   */
  static verifySignature(data: AuditLogData, signature: string): boolean {
    const expectedSignature = this.generateSignature(data);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * 署名用文字列の作成
   */
  private static createSignatureString(data: AuditLogData): string {
    const timestamp = data.timestamp instanceof Date 
      ? data.timestamp.toISOString()
      : new Date(data.timestamp).toISOString();
    
    return [
      timestamp,
      data.eventType,
      data.userId || 'system',
      data.action,
      JSON.stringify(data.changes || {})
    ].join('|');
  }

  /**
   * ログチェーンのハッシュを生成
   */
  static generateChainHash(previousHash: string, currentData: AuditLogData): string {
    const dataHash = this.generateSignature(currentData);
    const combinedData = `${previousHash}:${dataHash}`;
    
    const hash = crypto.createHash('sha256');
    hash.update(combinedData);
    return hash.digest('hex');
  }

  /**
   * 改ざん検出用のチェックサムを生成
   */
  static generateChecksum(logs: AuditLogData[]): string {
    const concatenated = logs
      .map(log => this.generateSignature(log))
      .join(':');
    
    const hash = crypto.createHash('sha256');
    hash.update(concatenated);
    return hash.digest('hex');
  }

  /**
   * セキュリティイベントの判定
   */
  static isSecurityEvent(eventType: string): boolean {
    const securityEvents = [
      'AUTH_LOGIN_FAILED',
      'AUTH_UNAUTHORIZED_ACCESS',
      'SECURITY_ALERT',
      'SECURITY_BREACH_ATTEMPT',
      'SECURITY_POLICY_VIOLATION',
      'USER_BANNED',
      'USER_SUSPENDED',
      'PERMISSION_REVOKED'
    ];
    
    return securityEvents.includes(eventType);
  }

  /**
   * 重要度レベルの判定
   */
  static getSeverityLevel(eventType: string, statusCode?: number): 'critical' | 'high' | 'medium' | 'low' | 'info' {
    // Critical events
    if (['SECURITY_BREACH_ATTEMPT', 'DATA_DELETE', 'USER_DELETED'].includes(eventType)) {
      return 'critical';
    }
    
    // High severity events
    if (this.isSecurityEvent(eventType) || statusCode && statusCode >= 500) {
      return 'high';
    }
    
    // Medium severity events
    if (['USER_UPDATED', 'DATA_UPDATE', 'ROLE_CHANGED'].includes(eventType)) {
      return 'medium';
    }
    
    // Low severity events
    if (['DATA_CREATE', 'USER_CREATED'].includes(eventType)) {
      return 'low';
    }
    
    // Info level (default)
    return 'info';
  }

  /**
   * ログデータのサニタイズ（機密情報の除去）
   */
  static sanitizeLogData(data: any): any {
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'apiKey',
      'creditCard',
      'ssn',
      'refreshToken',
      'accessToken'
    ];
    
    if (typeof data !== 'object' || data === null) {
      return data;
    }
    
    const sanitized = Array.isArray(data) ? [] : {};
    
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      
      if (sensitiveFields.some(field => lowerKey.includes(field.toLowerCase()))) {
        (sanitized as any)[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        (sanitized as any)[key] = this.sanitizeLogData(value);
      } else {
        (sanitized as any)[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * IP位置情報の取得（簡易版）
   */
  static getLocationFromIP(ipAddress: string): { country: string; city: string; region: string } | null {
    // 実際の実装では、MaxMind GeoIP2やIPAPIなどのサービスを使用
    // ここではプライベートIPの判定のみ
    const privateIPs = ['127.0.0.1', '::1', 'localhost'];
    
    if (privateIPs.includes(ipAddress) || ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.')) {
      return {
        country: 'Local',
        city: 'Local',
        region: 'Local'
      };
    }
    
    // 実際のGeoIP lookup would go here
    return null;
  }

  /**
   * コンプライアンスレポート用のデータ集計
   */
  static aggregateForCompliance(logs: AuditLogData[]): any {
    const report = {
      totalEvents: logs.length,
      securityEvents: 0,
      dataOperations: 0,
      userManagement: 0,
      criticalEvents: 0,
      byUser: new Map<string, number>(),
      byEventType: new Map<string, number>(),
      timeRange: {
        start: null as Date | null,
        end: null as Date | null
      }
    };

    logs.forEach(log => {
      // カテゴリ別集計
      if (this.isSecurityEvent(log.eventType)) {
        report.securityEvents++;
      }
      
      if (log.eventType.startsWith('DATA_')) {
        report.dataOperations++;
      }
      
      if (log.eventType.startsWith('USER_')) {
        report.userManagement++;
      }
      
      const severity = this.getSeverityLevel(log.eventType);
      if (severity === 'critical') {
        report.criticalEvents++;
      }
      
      // ユーザー別集計
      const userId = log.userId || 'system';
      report.byUser.set(userId, (report.byUser.get(userId) || 0) + 1);
      
      // イベントタイプ別集計
      report.byEventType.set(log.eventType, (report.byEventType.get(log.eventType) || 0) + 1);
      
      // 時間範囲
      const timestamp = new Date(log.timestamp);
      if (!report.timeRange.start || timestamp < report.timeRange.start) {
        report.timeRange.start = timestamp;
      }
      if (!report.timeRange.end || timestamp > report.timeRange.end) {
        report.timeRange.end = timestamp;
      }
    });
    
    return {
      ...report,
      byUser: Object.fromEntries(report.byUser),
      byEventType: Object.fromEntries(report.byEventType)
    };
  }
}

export default AuditSignature;