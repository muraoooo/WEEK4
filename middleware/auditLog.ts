import { NextRequest, NextResponse } from 'next/server';
import { connectDatabase } from '@/lib/db';

// 監査対象のパスとアクションのマッピング
const AUDIT_PATHS = {
  // 認証関連
  '/api/auth/login': { eventType: 'AUTH_LOGIN_SUCCESS', category: 'security', severity: 'info' },
  '/api/auth/logout': { eventType: 'AUTH_LOGOUT', category: 'security', severity: 'info' },
  '/api/auth/reset-password': { eventType: 'AUTH_PASSWORD_RESET', category: 'security', severity: 'medium' },
  
  // ユーザー管理
  '/api/admin/users': {
    GET: { eventType: 'DATA_READ', category: 'data', severity: 'low' },
    POST: { eventType: 'USER_CREATED', category: 'user', severity: 'medium' },
    PUT: { eventType: 'USER_UPDATED', category: 'user', severity: 'medium' },
    DELETE: { eventType: 'USER_DELETED', category: 'user', severity: 'high' }
  },
  
  // 通報管理
  '/api/admin/reports': {
    GET: { eventType: 'DATA_READ', category: 'data', severity: 'low' },
    POST: { eventType: 'REPORT_CREATED', category: 'user', severity: 'medium' },
    PUT: { eventType: 'REPORT_REVIEWED', category: 'user', severity: 'medium' }
  },
  
  // 投稿管理
  '/api/admin/posts': {
    GET: { eventType: 'DATA_READ', category: 'data', severity: 'low' },
    PUT: { eventType: 'DATA_UPDATE', category: 'data', severity: 'medium' },
    DELETE: { eventType: 'DATA_DELETE', category: 'data', severity: 'high' }
  },
  
  // システム設定
  '/api/admin/settings': {
    GET: { eventType: 'DATA_READ', category: 'system', severity: 'low' },
    PUT: { eventType: 'SYSTEM_CONFIG_CHANGED', category: 'system', severity: 'high' }
  }
};

// 機密情報をマスキング
function sanitizeData(data: any): any {
  if (!data) return data;
  
  const sensitive = ['password', 'token', 'secret', 'apiKey', 'creditCard'];
  
  if (typeof data === 'string') {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }
  
  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (sensitive.some(s => key.toLowerCase().includes(s.toLowerCase()))) {
        sanitized[key] = '***REDACTED***';
      } else {
        sanitized[key] = sanitizeData(value);
      }
    }
    return sanitized;
  }
  
  return data;
}

// IPアドレスを取得
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';
  return ip.trim();
}

// ユーザー情報を取得（JWTから）
async function getUserInfo(request: NextRequest): Promise<any> {
  try {
    const token = request.cookies.get('token')?.value || 
                 request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return { userId: 'anonymous', userEmail: null, userName: null, userRole: 'guest' };
    }
    
    // JWTデコード（簡易版）
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    
    return {
      userId: payload.userId || payload.id,
      userEmail: payload.email,
      userName: payload.name,
      userRole: payload.role || 'user',
      sessionId: payload.sessionId
    };
  } catch (error) {
    return { userId: 'anonymous', userEmail: null, userName: null, userRole: 'guest' };
  }
}

// 監査ログを記録
async function recordAuditLog(
  request: NextRequest,
  response: NextResponse,
  startTime: number
) {
  try {
    await connectDatabase();
    const AuditLog = require('@/models/AuditLog');
    
    const path = request.nextUrl.pathname;
    const method = request.method;
    
    // 監査対象かチェック
    let auditConfig: any = null;
    for (const [pathPattern, config] of Object.entries(AUDIT_PATHS)) {
      if (path.startsWith(pathPattern)) {
        if (typeof config === 'object' && method in config) {
          auditConfig = (config as any)[method];
        } else if (typeof config === 'object' && 'eventType' in config) {
          auditConfig = config;
        }
        break;
      }
    }
    
    if (!auditConfig) return;
    
    // ユーザー情報を取得
    const userInfo = await getUserInfo(request);
    
    // リクエストボディを取得（既に読み取られている可能性があるため注意）
    let body = null;
    try {
      const clonedRequest = request.clone();
      body = await clonedRequest.json();
    } catch (e) {
      // ボディがない場合やJSON以外の場合は無視
    }
    
    // レスポンスステータスを取得
    const statusCode = response.status;
    
    // 処理時間を計算
    const duration = Date.now() - startTime;
    
    // 監査ログデータを作成
    const auditData = {
      timestamp: new Date(),
      eventType: auditConfig.eventType,
      eventCategory: auditConfig.category,
      severity: statusCode >= 400 ? 'high' : auditConfig.severity,
      
      // ユーザー情報
      ...userInfo,
      
      // アクション詳細
      action: `${method} ${path}`,
      resource: path,
      resourceType: path.includes('/users') ? 'user' : 
                   path.includes('/posts') ? 'post' :
                   path.includes('/reports') ? 'report' : 'system',
      
      // リクエスト情報
      method,
      path,
      query: Object.fromEntries(request.nextUrl.searchParams),
      body: sanitizeData(body),
      statusCode,
      
      // 環境情報
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent'),
      
      // メタデータ
      duration,
      correlationId: request.headers.get('x-correlation-id') || `req_${Date.now()}`,
      
      // エラー情報（エラーの場合）
      errorDetails: statusCode >= 400 ? {
        code: statusCode.toString(),
        message: response.statusText
      } : undefined
    };
    
    // 非同期でログを保存（レスポンスを遅延させないため）
    setImmediate(async () => {
      try {
        await AuditLog.logEvent(auditData);
      } catch (error) {
        console.error('Failed to save audit log:', error);
      }
    });
    
  } catch (error) {
    console.error('Audit log middleware error:', error);
  }
}

// ミドルウェア関数
export async function auditLogMiddleware(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const startTime = Date.now();
  
  // リクエストを処理
  const response = await handler();
  
  // 監査ログを記録（非同期）
  recordAuditLog(request, response, startTime);
  
  return response;
}

// Next.jsミドルウェア用のラッパー
export function withAuditLog(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    return auditLogMiddleware(request, () => handler(request));
  };
}

// 手動ログ記録用のヘルパー関数
export async function logAuditEvent(
  eventType: string,
  action: string,
  details: any,
  request?: NextRequest
) {
  try {
    await connectDatabase();
    const AuditLog = require('@/models/AuditLog');
    
    const userInfo = request ? await getUserInfo(request) : 
                              { userId: 'system', userRole: 'system' };
    
    const auditData = {
      timestamp: new Date(),
      eventType,
      eventCategory: determineCategory(eventType),
      severity: determineSeverity(eventType),
      ...userInfo,
      action,
      ipAddress: request ? getClientIp(request) : 'system',
      userAgent: request ? request.headers.get('user-agent') : 'system',
      ...details
    };
    
    await AuditLog.logEvent(auditData);
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}

// カテゴリを判定
function determineCategory(eventType: string): string {
  if (eventType.startsWith('AUTH_')) return 'security';
  if (eventType.startsWith('USER_')) return 'user';
  if (eventType.startsWith('DATA_')) return 'data';
  if (eventType.startsWith('SYSTEM_')) return 'system';
  if (eventType.startsWith('REPORT_')) return 'compliance';
  return 'system';
}

// 重要度を判定
function determineSeverity(eventType: string): string {
  const critical = ['SECURITY_BREACH_ATTEMPT', 'USER_DELETED', 'SYSTEM_ERROR'];
  const high = ['AUTH_UNAUTHORIZED_ACCESS', 'DATA_DELETE', 'SYSTEM_CONFIG_CHANGED'];
  const medium = ['USER_UPDATED', 'AUTH_PASSWORD_RESET', 'REPORT_CREATED'];
  const low = ['DATA_READ', 'AUTH_LOGOUT'];
  
  if (critical.includes(eventType)) return 'critical';
  if (high.some(e => eventType.includes(e))) return 'high';
  if (medium.some(e => eventType.includes(e))) return 'medium';
  if (low.some(e => eventType.includes(e))) return 'low';
  return 'info';
}