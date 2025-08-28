/**
 * 簡易インメモリキャッシュ
 * 本番環境ではRedisを使用することを推奨
 */

interface CacheEntry {
  data: any;
  timestamp: number;
}

class SimpleCache {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * キャッシュからデータを取得
   * @param key キャッシュキー
   * @param ttl 有効期限（ミリ秒）
   */
  get(key: string, ttl: number = 60000): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // 有効期限チェック
    if (Date.now() - entry.timestamp > ttl) {
      this.cache.delete(key);
      return null;
    }

    // LRU: アクセスされたアイテムを最後に移動
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data;
  }

  /**
   * キャッシュにデータを保存
   * @param key キャッシュキー
   * @param data 保存するデータ
   */
  set(key: string, data: any): void {
    // サイズ制限チェック
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      // 最も古いエントリを削除（FIFO）
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 特定のキーのキャッシュを削除
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * パターンマッチでキャッシュを削除
   * @param pattern 削除するキーのパターン（正規表現）
   */
  deletePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * すべてのキャッシュをクリア
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * キャッシュの統計情報を取得
   */
  getStats(): { size: number; maxSize: number; keys: string[] } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys())
    };
  }
}

// シングルトンインスタンス
const cacheInstance = new SimpleCache(100);

// エクスポート用の関数
export function getCached(key: string, ttl?: number) {
  return cacheInstance.get(key, ttl);
}

export function setCached(key: string, data: any) {
  cacheInstance.set(key, data);
}

export function deleteCached(key: string) {
  cacheInstance.delete(key);
}

export function clearCache() {
  cacheInstance.clear();
}

export function getCacheStats() {
  return cacheInstance.getStats();
}

/**
 * キャッシュキー生成ヘルパー
 */
export function generateCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('_');
  
  return `${prefix}_${sortedParams}`;
}

/**
 * データをキャッシュ付きで取得するヘルパー関数
 */
export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 60000
): Promise<T> {
  // キャッシュチェック
  const cached = getCached(key, ttl);
  if (cached !== null) {
    console.log(`Cache hit: ${key}`);
    return cached as T;
  }

  console.log(`Cache miss: ${key}`);
  
  // データ取得
  const data = await fetcher();
  
  // キャッシュに保存
  setCached(key, data);
  
  return data;
}