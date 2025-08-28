/**
 * プライバシー重視のアクセス解析トラッカー
 * 個人を特定できる情報を一切収集しない
 */

interface TrackingData {
  pagePath: string;
  screenWidth?: number;
  pageLoadTime?: number;
  sessionDuration?: number;
}

class PrivacyAnalyticsTracker {
  private sessionStartTime: number;
  private pageStartTime: number;
  private isTracking: boolean = false;

  constructor() {
    this.sessionStartTime = Date.now();
    this.pageStartTime = Date.now();
  }

  /**
   * ページビューをトラッキング
   * @param pagePath トラッキングするページのパス
   */
  async trackPageView(pagePath?: string): Promise<void> {
    // 既にトラッキング中の場合はスキップ
    if (this.isTracking) return;
    
    // DNT（Do Not Track）設定を確認
    if (this.isDoNotTrackEnabled()) {
      console.log('Analytics: DNT is enabled, skipping tracking');
      return;
    }

    // ボットの検出
    if (this.isBot()) {
      console.log('Analytics: Bot detected, skipping tracking');
      return;
    }

    this.isTracking = true;

    try {
      const trackingData: TrackingData = {
        pagePath: pagePath || this.getCurrentPath(),
        screenWidth: this.getScreenWidth(),
        pageLoadTime: this.getPageLoadTime(),
        sessionDuration: this.getSessionDuration(),
      };

      // プライバシー保護のためのデータ検証
      this.validateTrackingData(trackingData);

      // APIにデータを送信
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trackingData),
        // クレデンシャルは送信しない
        credentials: 'omit',
      });

      // ページ開始時刻をリセット
      this.pageStartTime = Date.now();
    } catch (error) {
      // エラーは静かに処理（ユーザーに影響を与えない）
      console.error('Analytics tracking error:', error);
    } finally {
      this.isTracking = false;
    }
  }

  /**
   * DNT（Do Not Track）が有効かチェック
   */
  private isDoNotTrackEnabled(): boolean {
    if (typeof window === 'undefined') return true;
    
    const dnt = (window as any).doNotTrack || 
                navigator.doNotTrack || 
                (navigator as any).msDoNotTrack;
    
    return dnt === '1' || dnt === 'yes';
  }

  /**
   * ボットかどうかを判定
   */
  private isBot(): boolean {
    if (typeof navigator === 'undefined') return true;
    
    const userAgent = navigator.userAgent.toLowerCase();
    const botPatterns = [
      'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget',
      'python', 'ruby', 'perl', 'java', 'go-http', 'googlebot',
      'bingbot', 'slurp', 'duckduckbot', 'baiduspider', 'facebookexternalhit'
    ];
    
    return botPatterns.some(pattern => userAgent.includes(pattern));
  }

  /**
   * 現在のページパスを取得（クエリパラメータとハッシュを除外）
   */
  private getCurrentPath(): string {
    if (typeof window === 'undefined') return '/';
    
    // クエリパラメータとハッシュを除外（プライバシー保護）
    const path = window.location.pathname;
    
    // 個人情報を含む可能性のあるパスをマスク
    return this.sanitizePath(path);
  }

  /**
   * パスから個人情報を除去
   */
  private sanitizePath(path: string): string {
    // UUIDパターン
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
    // 数字の連続（ID等）
    const numberPattern = /\/\d{5,}\//g;
    // メールアドレスパターン
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    
    let sanitized = path;
    sanitized = sanitized.replace(uuidPattern, '[uuid]');
    sanitized = sanitized.replace(numberPattern, '/[id]/');
    sanitized = sanitized.replace(emailPattern, '[email]');
    
    // パスが長すぎる場合は切り詰める
    if (sanitized.length > 200) {
      sanitized = sanitized.substring(0, 200) + '...';
    }
    
    return sanitized;
  }

  /**
   * 画面幅を取得（カテゴリ化のため）
   */
  private getScreenWidth(): number | undefined {
    if (typeof window === 'undefined') return undefined;
    return window.innerWidth;
  }

  /**
   * ページロード時間を取得
   */
  private getPageLoadTime(): number {
    if (typeof window === 'undefined' || !window.performance) return 0;
    
    const perfData = window.performance.timing;
    const loadTime = perfData.loadEventEnd - perfData.navigationStart;
    
    // 異常値は除外
    if (loadTime < 0 || loadTime > 60000) return 0;
    
    return loadTime;
  }

  /**
   * セッション継続時間を取得
   */
  private getSessionDuration(): number {
    const duration = Date.now() - this.sessionStartTime;
    // 最大24時間まで
    return Math.min(duration / 1000, 86400);
  }

  /**
   * トラッキングデータの検証（個人情報が含まれていないことを確認）
   */
  private validateTrackingData(data: TrackingData): void {
    // パスに個人情報が含まれていないか再チェック
    const personalInfoPatterns = [
      /password/i,
      /token/i,
      /api[_-]?key/i,
      /secret/i,
      /auth/i,
      /session/i,
    ];
    
    for (const pattern of personalInfoPatterns) {
      if (pattern.test(data.pagePath)) {
        data.pagePath = '/[protected]';
        break;
      }
    }
  }

  /**
   * ページ離脱時のトラッキング
   */
  async trackPageExit(): Promise<void> {
    // Beacon APIを使用して確実に送信
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const data = {
        pagePath: this.getCurrentPath(),
        sessionDuration: this.getSessionDuration(),
      };
      
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/track', blob);
    }
  }
}

// シングルトンインスタンス
let tracker: PrivacyAnalyticsTracker | null = null;

/**
 * アナリティクストラッカーの初期化
 */
export function initAnalytics(): void {
  if (typeof window === 'undefined') return;
  
  if (!tracker) {
    tracker = new PrivacyAnalyticsTracker();
    
    // ページロード完了後にトラッキング
    if (document.readyState === 'complete') {
      tracker.trackPageView();
    } else {
      window.addEventListener('load', () => {
        tracker?.trackPageView();
      });
    }
    
    // ページ離脱時にトラッキング
    window.addEventListener('beforeunload', () => {
      tracker?.trackPageExit();
    });
    
    // SPAのルート変更を検出
    let lastPath = window.location.pathname;
    const checkRouteChange = () => {
      const currentPath = window.location.pathname;
      if (currentPath !== lastPath) {
        lastPath = currentPath;
        tracker?.trackPageView(currentPath);
      }
    };
    
    // popstateイベント（ブラウザの戻る/進む）
    window.addEventListener('popstate', checkRouteChange);
    
    // プッシュステートの監視
    const originalPushState = window.history.pushState;
    window.history.pushState = function(...args) {
      originalPushState.apply(window.history, args);
      setTimeout(checkRouteChange, 0);
    };
    
    const originalReplaceState = window.history.replaceState;
    window.history.replaceState = function(...args) {
      originalReplaceState.apply(window.history, args);
      setTimeout(checkRouteChange, 0);
    };
  }
}

/**
 * 手動でページビューをトラッキング
 */
export function trackPageView(pagePath?: string): void {
  tracker?.trackPageView(pagePath);
}

/**
 * トラッカーのクリーンアップ
 */
export function cleanupAnalytics(): void {
  tracker = null;
}