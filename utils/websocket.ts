/**
 * WebSocketクライアントユーティリティ
 * プライバシーを保護しながらリアルタイム通信を実現
 */

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface WebSocketConfig {
  url: string;
  reconnect?: boolean;
  reconnectInterval?: number;
  reconnectMaxAttempts?: number;
  heartbeatInterval?: number;
  debug?: boolean;
}

export class PrivacyWebSocketClient {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private eventHandlers: Map<string, Set<Function>> = new Map();
  private messageQueue: WebSocketMessage[] = [];
  private userId: string | null = null;
  private isIntentionallyClosed = false;

  constructor(config: WebSocketConfig) {
    this.config = {
      url: config.url,
      reconnect: config.reconnect ?? true,
      reconnectInterval: config.reconnectInterval ?? 3000,
      reconnectMaxAttempts: config.reconnectMaxAttempts ?? 10,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
      debug: config.debug ?? false,
    };
  }

  /**
   * WebSocket接続を開始
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.isIntentionallyClosed = false;
      this.connectionState = 'connecting';
      this.emit('connecting');

      try {
        // WebSocketのURLを構築
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}${this.config.url}`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.handleOpen();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onerror = (event) => {
          this.handleError(event);
          reject(new Error('WebSocket connection error'));
        };

        this.ws.onclose = (event) => {
          this.handleClose(event);
        };

      } catch (error) {
        this.handleError(error);
        reject(error);
      }
    });
  }

  /**
   * WebSocket接続を切断
   */
  disconnect() {
    this.isIntentionallyClosed = true;
    this.clearTimers();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
    
    this.connectionState = 'disconnected';
    this.emit('disconnected');
  }

  /**
   * メッセージを送信
   */
  send(message: WebSocketMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // 接続されていない場合はキューに追加
      this.messageQueue.push(message);
      this.log('Message queued:', message);
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      this.log('Message sent:', message);
      return true;
    } catch (error) {
      this.log('Send error:', error);
      this.messageQueue.push(message);
      return false;
    }
  }

  /**
   * ハートビートを送信
   */
  sendHeartbeat() {
    const currentPage = this.getCurrentPage();
    
    this.send({
      type: 'heartbeat',
      page: currentPage,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * ページ変更を通知
   */
  notifyPageChange(page?: string) {
    const currentPage = page || this.getCurrentPage();
    
    this.send({
      type: 'page_change',
      page: currentPage,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * アクティビティを通知
   */
  notifyActivity() {
    this.send({
      type: 'activity',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * イベントリスナーを登録
   */
  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)?.add(handler);
  }

  /**
   * イベントリスナーを解除
   */
  off(event: string, handler: Function) {
    this.eventHandlers.get(event)?.delete(handler);
  }

  /**
   * 接続状態を取得
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * 接続中かどうか
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * ユーザーIDを取得
   */
  getUserId(): string | null {
    return this.userId;
  }

  // ===== Private Methods =====

  /**
   * 接続成功時の処理
   */
  private handleOpen() {
    this.connectionState = 'connected';
    this.reconnectAttempts = 0;
    
    this.log('WebSocket connected');
    this.emit('connected');
    
    // キューに溜まったメッセージを送信
    this.flushMessageQueue();
    
    // ハートビートを開始
    this.startHeartbeat();
  }

  /**
   * メッセージ受信時の処理
   */
  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      this.log('Message received:', data);
      
      // メッセージタイプに応じた処理
      switch (data.type) {
        case 'connected':
          this.userId = data.userId;
          this.emit('connected', data);
          break;
        
        case 'heartbeat_ack':
          this.emit('heartbeat_ack', data);
          break;
        
        case 'user_update':
          this.emit('user_update', data);
          break;
        
        case 'active_users_list':
          this.emit('active_users_list', data);
          break;
        
        default:
          this.emit('message', data);
      }
    } catch (error) {
      this.log('Message parse error:', error);
    }
  }

  /**
   * エラー時の処理
   */
  private handleError(error: any) {
    this.connectionState = 'error';
    this.log('WebSocket error:', error);
    this.emit('error', error);
  }

  /**
   * 切断時の処理
   */
  private handleClose(event: CloseEvent) {
    this.connectionState = 'disconnected';
    this.ws = null;
    this.clearTimers();
    
    this.log('WebSocket closed:', event.code, event.reason);
    this.emit('disconnected', event);
    
    // 意図的な切断でない場合は再接続を試みる
    if (!this.isIntentionallyClosed && this.config.reconnect) {
      this.attemptReconnect();
    }
  }

  /**
   * 再接続を試みる
   */
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.config.reconnectMaxAttempts) {
      this.log('Max reconnection attempts reached');
      this.emit('reconnect_failed');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.config.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1);
    
    this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.emit('reconnecting', this.reconnectAttempts);
    
    this.reconnectTimer = window.setTimeout(() => {
      this.connect().catch(() => {
        // 再接続失敗時は次の再接続を試みる
        this.attemptReconnect();
      });
    }, delay);
  }

  /**
   * ハートビートを開始
   */
  private startHeartbeat() {
    this.clearHeartbeatTimer();
    
    this.heartbeatTimer = window.setInterval(() => {
      if (this.isConnected()) {
        this.sendHeartbeat();
      }
    }, this.config.heartbeatInterval);
    
    // 初回のハートビートを送信
    this.sendHeartbeat();
  }

  /**
   * タイマーをクリア
   */
  private clearTimers() {
    this.clearReconnectTimer();
    this.clearHeartbeatTimer();
  }

  /**
   * 再接続タイマーをクリア
   */
  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * ハートビートタイマーをクリア
   */
  private clearHeartbeatTimer() {
    if (this.heartbeatTimer) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * メッセージキューをフラッシュ
   */
  private flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  /**
   * 現在のページパスを取得（プライバシー保護）
   */
  private getCurrentPage(): string {
    if (typeof window === 'undefined') return '/';
    
    let path = window.location.pathname;
    
    // 個人情報を含む可能性のあるパスをマスク
    // UUIDを除去
    path = path.replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      '[id]'
    );
    
    // 長い数字列を除去
    path = path.replace(/\/\d{5,}/g, '/[id]');
    
    // メールアドレスを除去
    path = path.replace(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      '[email]'
    );
    
    return path;
  }

  /**
   * イベントを発火
   */
  private emit(event: string, data?: any) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * デバッグログ
   */
  private log(...args: any[]) {
    if (this.config.debug) {
      console.log('[WebSocket]', ...args);
    }
  }
}

// デフォルトのクライアントインスタンスをエクスポート
let defaultClient: PrivacyWebSocketClient | null = null;

export function getWebSocketClient(): PrivacyWebSocketClient {
  if (!defaultClient) {
    defaultClient = new PrivacyWebSocketClient({
      url: '/api/ws/active-users',
      reconnect: true,
      reconnectInterval: 3000,
      reconnectMaxAttempts: 10,
      heartbeatInterval: 30000,
      debug: process.env.NODE_ENV === 'development',
    });
  }
  return defaultClient;
}

// アクティビティトラッカーの初期化
export function initActivityTracker() {
  if (typeof window === 'undefined') return;
  
  const client = getWebSocketClient();
  
  // ページ遷移の検出
  let lastPath = window.location.pathname;
  const checkPageChange = () => {
    const currentPath = window.location.pathname;
    if (currentPath !== lastPath) {
      lastPath = currentPath;
      client.notifyPageChange(currentPath);
    }
  };
  
  // popstateイベント（ブラウザの戻る/進む）
  window.addEventListener('popstate', checkPageChange);
  
  // ユーザーアクティビティの検出
  const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
  let lastActivityTime = Date.now();
  
  const handleActivity = () => {
    const now = Date.now();
    // 10秒ごとに最大1回アクティビティを通知
    if (now - lastActivityTime > 10000) {
      lastActivityTime = now;
      client.notifyActivity();
    }
  };
  
  activityEvents.forEach(event => {
    window.addEventListener(event, handleActivity, { passive: true });
  });
  
  // ページ離脱時の処理
  window.addEventListener('beforeunload', () => {
    client.disconnect();
  });
  
  // 初期接続
  client.connect().catch(console.error);
  
  return client;
}