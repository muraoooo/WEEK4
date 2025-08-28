/**
 * セッションタイムアウト管理システム
 * アイドルタイムアウト（30分）、絶対タイムアウト（8時間）、警告システム
 */

import { EventEmitter } from 'events';

// =================================================================
// 型定義
// =================================================================

export interface SessionTimeoutConfig {
  idleTimeout: number;     // アイドルタイムアウト（ミリ秒）
  absoluteTimeout: number; // 絶対タイムアウト（ミリ秒）
  warningTime: number;     // 警告表示時間（ミリ秒）
  autoSaveInterval: number; // 自動保存間隔（ミリ秒）
}

export interface SessionState {
  lastActivity: Date;
  sessionStart: Date;
  isActive: boolean;
  warningShown: boolean;
  autoSaveEnabled: boolean;
}

export interface TimeoutWarning {
  type: 'idle' | 'absolute';
  remainingTime: number;
  callback?: () => void;
}

export interface AutoSaveData {
  formData?: Record<string, any>;
  scrollPosition?: { x: number; y: number };
  activeElement?: string;
  timestamp: Date;
}

// =================================================================
// 設定
// =================================================================

const DEFAULT_CONFIG: SessionTimeoutConfig = {
  idleTimeout: 30 * 60 * 1000,    // 30分
  absoluteTimeout: 8 * 60 * 60 * 1000, // 8時間
  warningTime: 5 * 60 * 1000,     // 5分前警告
  autoSaveInterval: 2 * 60 * 1000  // 2分毎自動保存
};

// =================================================================
// セッションタイムアウト管理クラス
// =================================================================

export class SessionTimeoutManager extends EventEmitter {
  private config: SessionTimeoutConfig;
  private state: SessionState;
  private idleTimer: NodeJS.Timeout | null = null;
  private absoluteTimer: NodeJS.Timeout | null = null;
  private warningTimer: NodeJS.Timeout | null = null;
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private activityListeners: (() => void)[] = [];
  private isClient: boolean = false;

  constructor(config: Partial<SessionTimeoutConfig> = {}) {
    super();
    
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      lastActivity: new Date(),
      sessionStart: new Date(),
      isActive: true,
      warningShown: false,
      autoSaveEnabled: true
    };

    this.isClient = typeof window !== 'undefined';

    this.initialize();
  }

  /**
   * 初期化
   */
  private initialize(): void {
    if (this.isClient) {
      this.setupActivityListeners();
      this.startAutoSave();
    }
    
    this.startTimers();
    
    // セッション復旧チェック
    this.checkSessionRecovery();
  }

  /**
   * アクティビティリスナー設定
   */
  private setupActivityListeners(): void {
    if (!this.isClient || typeof document === 'undefined') return;

    const events = [
      'mousedown', 'mousemove', 'keypress', 'scroll', 
      'touchstart', 'click', 'focus', 'blur'
    ];

    const activityHandler = () => {
      this.updateActivity();
    };

    events.forEach(event => {
      document.addEventListener(event, activityHandler, { passive: true });
      this.activityListeners.push(() => {
        if (typeof document !== 'undefined') {
          document.removeEventListener(event, activityHandler);
        }
      });
    });

    // ページ可視性変更の監視
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.updateActivity();
        }
      });
    }
  }

  /**
   * アクティビティ更新
   */
  updateActivity(): void {
    const now = new Date();
    const wasIdle = this.isIdleWarningActive();
    
    this.state.lastActivity = now;
    this.state.warningShown = false;
    
    // タイマーをリセット
    this.resetTimers();
    
    if (wasIdle) {
      this.emit('activity_resumed', { timestamp: now });
    }
    
    this.emit('activity', { timestamp: now });
  }

  /**
   * タイマー開始
   */
  private startTimers(): void {
    this.resetTimers();
    
    // アイドルタイムアウトタイマー
    this.idleTimer = setTimeout(() => {
      this.handleIdleTimeout();
    }, this.config.idleTimeout);

    // 絶対タイムアウトタイマー
    const sessionDuration = Date.now() - this.state.sessionStart.getTime();
    const absoluteRemaining = this.config.absoluteTimeout - sessionDuration;
    
    if (absoluteRemaining > 0) {
      this.absoluteTimer = setTimeout(() => {
        this.handleAbsoluteTimeout();
      }, absoluteRemaining);
    }

    // 警告タイマー（アイドル）
    const idleWarningTime = this.config.idleTimeout - this.config.warningTime;
    if (idleWarningTime > 0) {
      this.warningTimer = setTimeout(() => {
        this.showIdleWarning();
      }, idleWarningTime);
    }

    // 警告タイマー（絶対）
    const absoluteWarningTime = absoluteRemaining - this.config.warningTime;
    if (absoluteWarningTime > 0 && absoluteWarningTime < absoluteRemaining) {
      setTimeout(() => {
        this.showAbsoluteWarning();
      }, absoluteWarningTime);
    }
  }

  /**
   * タイマーリセット
   */
  private resetTimers(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }

    // 絶対タイムアウトタイマーはリセットしない
  }

  /**
   * アイドルタイムアウト処理
   */
  private handleIdleTimeout(): void {
    this.state.isActive = false;
    
    this.emit('idle_timeout', {
      lastActivity: this.state.lastActivity,
      sessionDuration: Date.now() - this.state.sessionStart.getTime()
    });

    // 自動ログアウト
    this.performLogout('idle_timeout');
  }

  /**
   * 絶対タイムアウト処理
   */
  private handleAbsoluteTimeout(): void {
    this.state.isActive = false;
    
    this.emit('absolute_timeout', {
      sessionStart: this.state.sessionStart,
      sessionDuration: this.config.absoluteTimeout
    });

    // 強制ログアウト
    this.performLogout('absolute_timeout');
  }

  /**
   * アイドル警告表示
   */
  private showIdleWarning(): void {
    if (this.state.warningShown) return;
    
    this.state.warningShown = true;
    const remainingTime = this.config.warningTime;
    
    const warning: TimeoutWarning = {
      type: 'idle',
      remainingTime,
      callback: () => this.extendSession()
    };

    this.emit('idle_warning', warning);

    // 自動保存実行
    this.performAutoSave();
  }

  /**
   * 絶対タイムアウト警告表示
   */
  private showAbsoluteWarning(): void {
    const sessionDuration = Date.now() - this.state.sessionStart.getTime();
    const remainingTime = this.config.absoluteTimeout - sessionDuration;
    
    const warning: TimeoutWarning = {
      type: 'absolute',
      remainingTime,
      callback: () => this.saveAndLogout()
    };

    this.emit('absolute_warning', warning);

    // 自動保存実行
    this.performAutoSave();
  }

  /**
   * セッション延長
   */
  extendSession(): void {
    this.updateActivity();
    this.emit('session_extended', { timestamp: new Date() });
  }

  /**
   * ログアウト実行
   */
  private async performLogout(reason: string): Promise<void> {
    // 自動保存実行
    await this.performAutoSave();
    
    // クリーンアップ
    this.cleanup();
    
    // ログアウトイベント発行
    this.emit('logout', { reason, timestamp: new Date() });

    // サーバーにログアウト通知
    if (this.isClient) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify({ reason })
        });
      } catch (error) {
        console.error('Logout notification failed:', error);
      }

      // ページリダイレクト
      window.location.href = '/admin/login?reason=' + encodeURIComponent(reason);
    }
  }

  /**
   * 保存してログアウト
   */
  async saveAndLogout(): Promise<void> {
    await this.performAutoSave();
    await this.performLogout('manual_logout');
  }

  /**
   * 自動保存開始
   */
  private startAutoSave(): void {
    if (!this.state.autoSaveEnabled || !this.isClient) return;

    this.autoSaveTimer = setInterval(() => {
      this.performAutoSave();
    }, this.config.autoSaveInterval);
  }

  /**
   * 自動保存実行
   */
  async performAutoSave(): Promise<void> {
    if (!this.state.autoSaveEnabled || !this.isClient || typeof document === 'undefined' || typeof window === 'undefined') return;

    try {
      const autoSaveData: AutoSaveData = {
        timestamp: new Date(),
        scrollPosition: {
          x: window.scrollX,
          y: window.scrollY
        }
      };

      // フォームデータの収集
      const formData: Record<string, any> = {};
      const forms = document.querySelectorAll('form');
      
      forms.forEach((form, index) => {
        const formDataObj = new FormData(form);
        const formJson: Record<string, any> = {};
        
        for (const [key, value] of formDataObj.entries()) {
          formJson[key] = value;
        }
        
        if (Object.keys(formJson).length > 0) {
          formData[`form_${index}`] = formJson;
        }
      });

      autoSaveData.formData = formData;

      // アクティブ要素の記録
      if (document.activeElement && document.activeElement.id) {
        autoSaveData.activeElement = document.activeElement.id;
      }

      // ローカルストレージに保存
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('session_autosave', JSON.stringify(autoSaveData));
      }
      
      this.emit('auto_save', autoSaveData);

    } catch (error) {
      console.error('Auto-save failed:', error);
      this.emit('auto_save_error', error);
    }
  }

  /**
   * セッション復旧チェック
   */
  private checkSessionRecovery(): void {
    if (!this.isClient || typeof localStorage === 'undefined') return;

    try {
      const savedData = localStorage.getItem('session_autosave');
      if (savedData) {
        const autoSaveData: AutoSaveData = JSON.parse(savedData);
        
        // 5分以内のデータのみ復旧対象
        const saveAge = Date.now() - new Date(autoSaveData.timestamp).getTime();
        if (saveAge < 5 * 60 * 1000) {
          this.emit('session_recovery_available', autoSaveData);
        } else {
          localStorage.removeItem('session_autosave');
        }
      }
    } catch (error) {
      console.error('Session recovery check failed:', error);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('session_autosave');
      }
    }
  }

  /**
   * セッション復旧実行
   */
  recoverSession(autoSaveData: AutoSaveData): void {
    if (!this.isClient) return;

    try {
      // スクロール位置の復旧
      if (autoSaveData.scrollPosition) {
        window.scrollTo(autoSaveData.scrollPosition.x, autoSaveData.scrollPosition.y);
      }

      // フォームデータの復旧
      if (autoSaveData.formData) {
        Object.entries(autoSaveData.formData).forEach(([formKey, formData]) => {
          const formIndex = parseInt(formKey.replace('form_', ''));
          const forms = document.querySelectorAll('form');
          const form = forms[formIndex];

          if (form && typeof formData === 'object') {
            Object.entries(formData).forEach(([fieldName, fieldValue]) => {
              const field = form.querySelector(`[name="${fieldName}"]`) as HTMLInputElement;
              if (field && typeof fieldValue === 'string') {
                field.value = fieldValue;
              }
            });
          }
        });
      }

      // アクティブ要素の復旧
      if (autoSaveData.activeElement) {
        const element = document.getElementById(autoSaveData.activeElement);
        if (element) {
          element.focus();
        }
      }

      // 復旧済みデータを削除
      localStorage.removeItem('session_autosave');
      
      this.emit('session_recovered', autoSaveData);

    } catch (error) {
      console.error('Session recovery failed:', error);
      this.emit('session_recovery_error', error);
    }
  }

  /**
   * 状態取得
   */
  getSessionState(): SessionState & {
    remainingIdleTime: number;
    remainingAbsoluteTime: number;
    isIdleWarningActive: boolean;
  } {
    const now = Date.now();
    const lastActivityTime = this.state.lastActivity.getTime();
    const sessionStartTime = this.state.sessionStart.getTime();
    
    const idleElapsed = now - lastActivityTime;
    const sessionElapsed = now - sessionStartTime;
    
    return {
      ...this.state,
      remainingIdleTime: Math.max(0, this.config.idleTimeout - idleElapsed),
      remainingAbsoluteTime: Math.max(0, this.config.absoluteTimeout - sessionElapsed),
      isIdleWarningActive: this.isIdleWarningActive()
    };
  }

  /**
   * アイドル警告が表示中かチェック
   */
  private isIdleWarningActive(): boolean {
    const idleElapsed = Date.now() - this.state.lastActivity.getTime();
    const warningThreshold = this.config.idleTimeout - this.config.warningTime;
    return idleElapsed >= warningThreshold && idleElapsed < this.config.idleTimeout;
  }

  /**
   * 自動保存有効/無効切り替え
   */
  setAutoSaveEnabled(enabled: boolean): void {
    this.state.autoSaveEnabled = enabled;
    
    if (enabled) {
      this.startAutoSave();
    } else if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    // タイマーをクリア
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.absoluteTimer) clearTimeout(this.absoluteTimer);
    if (this.warningTimer) clearTimeout(this.warningTimer);
    if (this.autoSaveTimer) clearInterval(this.autoSaveTimer);

    // イベントリスナーを削除
    this.activityListeners.forEach(cleanup => cleanup());
    this.activityListeners = [];

    // 全てのイベントリスナーを削除
    this.removeAllListeners();

    this.state.isActive = false;
  }

  /**
   * セッション強制終了
   */
  forceLogout(reason: string = 'manual'): void {
    this.performLogout(reason);
  }
}

// =================================================================
// クライアントサイド用ファクトリー関数
// =================================================================

export const createSessionTimeoutManager = (config?: Partial<SessionTimeoutConfig>) => {
  if (typeof window === 'undefined') {
    return null; // SSR時はnullを返す
  }

  return new SessionTimeoutManager(config);
};

// =================================================================
// エクスポート
// =================================================================

export default SessionTimeoutManager;