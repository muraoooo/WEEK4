import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import crypto from 'crypto';

// アクティブユーザー情報の型定義
interface ActiveUser {
  id: string;                  // 匿名化されたユーザーID
  sessionId: string;            // セッションID（ハッシュ化）
  currentPage: string;          // 現在のページ
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browserType: string;
  lastActivity: Date;           // 最終活動時刻
  joinedAt: Date;              // 接続開始時刻
  heartbeatCount: number;       // ハートビート受信回数
  isOnline: boolean;           // オンライン状態
}

// WebSocket拡張型
interface ExtendedWebSocket extends WebSocket {
  userId?: string;
  sessionId?: string;
  isAlive?: boolean;
  lastHeartbeat?: Date;
}

// シングルトンのWebSocketサーバー管理クラス
class ActiveUsersWebSocketServer {
  private wss: WebSocketServer | null = null;
  private activeUsers: Map<string, ActiveUser> = new Map();
  private clients: Map<string, ExtendedWebSocket> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private offlineCheckInterval: NodeJS.Timeout | null = null;

  // WebSocketサーバーの初期化
  initialize(server: any) {
    if (this.wss) {
      console.log('WebSocket server already initialized');
      return;
    }

    this.wss = new WebSocketServer({
      server,
      path: '/api/ws/active-users',
      perMessageDeflate: {
        zlibDeflateOptions: {
          chunkSize: 1024,
          memLevel: 7,
          level: 3,
        },
        zlibInflateOptions: {
          chunkSize: 10 * 1024,
        },
        clientNoContextTakeover: true,
        serverNoContextTakeover: true,
        serverMaxWindowBits: 10,
        concurrencyLimit: 10,
        threshold: 1024,
      },
    });

    this.setupEventHandlers();
    this.startHeartbeat();
    this.startOfflineCheck();

    console.log('WebSocket server initialized');
  }

  // イベントハンドラーの設定
  private setupEventHandlers() {
    if (!this.wss) return;

    this.wss.on('connection', (ws: ExtendedWebSocket, request: IncomingMessage) => {
      this.handleConnection(ws, request);
    });

    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
    });
  }

  // 新規接続の処理
  private handleConnection(ws: ExtendedWebSocket, request: IncomingMessage) {
    // セッションIDの生成（匿名化）
    const sessionId = this.generateSessionId(request);
    const userId = this.generateUserId(sessionId);

    ws.userId = userId;
    ws.sessionId = sessionId;
    ws.isAlive = true;
    ws.lastHeartbeat = new Date();

    // ユーザー情報の初期化
    const user: ActiveUser = {
      id: userId,
      sessionId,
      currentPage: '/',
      deviceType: this.detectDeviceType(request.headers['user-agent'] || ''),
      browserType: this.detectBrowserType(request.headers['user-agent'] || ''),
      lastActivity: new Date(),
      joinedAt: new Date(),
      heartbeatCount: 0,
      isOnline: true,
    };

    // ユーザーとクライアントを登録
    this.activeUsers.set(userId, user);
    this.clients.set(userId, ws);

    // 接続成功メッセージを送信
    ws.send(JSON.stringify({
      type: 'connected',
      userId,
      timestamp: new Date(),
    }));

    // 全クライアントに新規ユーザー通知
    this.broadcastUserUpdate('user_joined', user);

    // クライアントからのメッセージハンドリング
    ws.on('message', (data: Buffer) => {
      this.handleMessage(ws, data);
    });

    // エラーハンドリング
    ws.on('error', (error) => {
      console.error(`WebSocket client error (${userId}):`, error);
    });

    // 切断処理
    ws.on('close', () => {
      this.handleDisconnection(userId);
    });

    // Pongレスポンスの処理
    ws.on('pong', () => {
      ws.isAlive = true;
      ws.lastHeartbeat = new Date();
    });

    // 現在のアクティブユーザーリストを送信
    this.sendActiveUsersList(ws);
  }

  // クライアントメッセージの処理
  private handleMessage(ws: ExtendedWebSocket, data: Buffer) {
    try {
      const message = JSON.parse(data.toString());
      const userId = ws.userId;

      if (!userId) return;

      const user = this.activeUsers.get(userId);
      if (!user) return;

      switch (message.type) {
        case 'heartbeat':
          this.handleHeartbeat(userId, message);
          break;
        
        case 'page_change':
          this.handlePageChange(userId, message.page);
          break;
        
        case 'activity':
          this.handleActivity(userId);
          break;
        
        default:
          console.log(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Message parsing error:', error);
    }
  }

  // ハートビート処理
  private handleHeartbeat(userId: string, message: any) {
    const user = this.activeUsers.get(userId);
    const ws = this.clients.get(userId);

    if (user && ws) {
      user.lastActivity = new Date();
      user.heartbeatCount++;
      user.isOnline = true;

      if (message.page) {
        user.currentPage = this.sanitizePage(message.page);
      }

      ws.isAlive = true;
      ws.lastHeartbeat = new Date();

      // ハートビート応答
      ws.send(JSON.stringify({
        type: 'heartbeat_ack',
        timestamp: new Date(),
      }));

      // 更新を通知
      this.broadcastUserUpdate('user_updated', user);
    }
  }

  // ページ変更の処理
  private handlePageChange(userId: string, page: string) {
    const user = this.activeUsers.get(userId);
    
    if (user) {
      user.currentPage = this.sanitizePage(page);
      user.lastActivity = new Date();
      
      this.broadcastUserUpdate('page_changed', user);
    }
  }

  // アクティビティの処理
  private handleActivity(userId: string) {
    const user = this.activeUsers.get(userId);
    
    if (user) {
      user.lastActivity = new Date();
      user.isOnline = true;
    }
  }

  // 切断処理
  private handleDisconnection(userId: string) {
    const user = this.activeUsers.get(userId);
    
    if (user) {
      user.isOnline = false;
      this.broadcastUserUpdate('user_left', user);
    }

    this.activeUsers.delete(userId);
    this.clients.delete(userId);
  }

  // 全クライアントへのブロードキャスト
  private broadcastUserUpdate(eventType: string, user: ActiveUser) {
    const message = JSON.stringify({
      type: 'user_update',
      event: eventType,
      user: this.sanitizeUserData(user),
      activeCount: this.activeUsers.size,
      timestamp: new Date(),
    });

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // アクティブユーザーリストの送信
  private sendActiveUsersList(ws: ExtendedWebSocket) {
    const users = Array.from(this.activeUsers.values()).map(user => 
      this.sanitizeUserData(user)
    );

    ws.send(JSON.stringify({
      type: 'active_users_list',
      users,
      count: users.length,
      timestamp: new Date(),
    }));
  }

  // ハートビートの定期送信
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((ws, userId) => {
        if (ws.isAlive === false) {
          // 応答がない場合は切断
          ws.terminate();
          this.handleDisconnection(userId);
          return;
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // 30秒ごと
  }

  // オフラインチェック
  private startOfflineCheck() {
    this.offlineCheckInterval = setInterval(() => {
      const now = new Date();
      const offlineThreshold = 60000; // 60秒

      this.activeUsers.forEach((user, userId) => {
        const timeSinceLastActivity = now.getTime() - user.lastActivity.getTime();
        
        if (timeSinceLastActivity > offlineThreshold && user.isOnline) {
          user.isOnline = false;
          this.broadcastUserUpdate('user_offline', user);
        }
      });
    }, 10000); // 10秒ごとにチェック
  }

  // セッションIDの生成（匿名化）
  private generateSessionId(request: IncomingMessage): string {
    const ip = request.headers['x-forwarded-for'] || 
               request.socket.remoteAddress || 
               'unknown';
    const userAgent = request.headers['user-agent'] || 'unknown';
    const timestamp = Date.now();
    
    return crypto
      .createHash('sha256')
      .update(`${ip}-${userAgent}-${timestamp}`)
      .digest('hex')
      .substring(0, 16);
  }

  // ユーザーIDの生成（匿名化）
  private generateUserId(sessionId: string): string {
    return `user-${sessionId.substring(0, 8)}`;
  }

  // デバイスタイプの検出
  private detectDeviceType(userAgent: string): 'desktop' | 'mobile' | 'tablet' | 'unknown' {
    const ua = userAgent.toLowerCase();
    
    if (/mobile|android|iphone/i.test(ua) && !/tablet|ipad/i.test(ua)) {
      return 'mobile';
    }
    if (/tablet|ipad/i.test(ua)) {
      return 'tablet';
    }
    if (/windows|mac|linux|x11/i.test(ua)) {
      return 'desktop';
    }
    
    return 'unknown';
  }

  // ブラウザタイプの検出
  private detectBrowserType(userAgent: string): string {
    const ua = userAgent.toLowerCase();
    
    if (ua.includes('edg/')) return 'Edge';
    if (ua.includes('chrome')) return 'Chrome';
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
    
    return 'Other';
  }

  // ページURLのサニタイズ（プライバシー保護）
  private sanitizePage(page: string): string {
    // UUIDパターンを除去
    let sanitized = page.replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      '[id]'
    );
    
    // 長い数字列を除去
    sanitized = sanitized.replace(/\/\d{5,}/g, '/[id]');
    
    // メールアドレスを除去
    sanitized = sanitized.replace(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      '[email]'
    );
    
    // クエリパラメータを除去
    const urlParts = sanitized.split('?');
    sanitized = urlParts[0];
    
    return sanitized;
  }

  // ユーザーデータのサニタイズ（プライバシー保護）
  private sanitizeUserData(user: ActiveUser): Partial<ActiveUser> {
    return {
      id: user.id,
      currentPage: user.currentPage,
      deviceType: user.deviceType,
      browserType: user.browserType,
      lastActivity: user.lastActivity,
      joinedAt: user.joinedAt,
      isOnline: user.isOnline,
      // sessionIdは送信しない
      // IPアドレスは送信しない
      // 個人情報は送信しない
    };
  }

  // 統計情報の取得
  getStatistics() {
    const users = Array.from(this.activeUsers.values());
    const onlineUsers = users.filter(u => u.isOnline);
    
    return {
      totalActive: users.length,
      onlineCount: onlineUsers.length,
      deviceStats: {
        desktop: users.filter(u => u.deviceType === 'desktop').length,
        mobile: users.filter(u => u.deviceType === 'mobile').length,
        tablet: users.filter(u => u.deviceType === 'tablet').length,
        unknown: users.filter(u => u.deviceType === 'unknown').length,
      },
      browserStats: this.getBrowserStats(users),
      pageStats: this.getPageStats(users),
    };
  }

  // ブラウザ統計の取得
  private getBrowserStats(users: ActiveUser[]) {
    const stats: Record<string, number> = {};
    
    users.forEach(user => {
      stats[user.browserType] = (stats[user.browserType] || 0) + 1;
    });
    
    return stats;
  }

  // ページ統計の取得
  private getPageStats(users: ActiveUser[]) {
    const stats: Record<string, number> = {};
    
    users.forEach(user => {
      stats[user.currentPage] = (stats[user.currentPage] || 0) + 1;
    });
    
    return stats;
  }

  // クリーンアップ
  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    if (this.offlineCheckInterval) {
      clearInterval(this.offlineCheckInterval);
    }
    
    this.clients.forEach(ws => ws.close());
    this.clients.clear();
    this.activeUsers.clear();
    
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }
}

// シングルトンインスタンスをエクスポート
export const activeUsersWS = new ActiveUsersWebSocketServer();

// 型定義のエクスポート
export type { ActiveUser, ExtendedWebSocket };