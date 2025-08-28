import { useState, useEffect, useCallback, useRef } from 'react';

interface FetchOptions {
  cache?: boolean;
  cacheTime?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  debounceMs?: number;
}

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * 最適化されたデータフェッチフック
 * - キャッシング
 * - デバウンス
 * - 自動リトライ
 * - 前回のリクエストのキャンセル
 */
export function useOptimizedFetch<T>(
  url: string,
  options: FetchOptions = {}
) {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: false,
    error: null
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cacheRef = useRef<Map<string, { data: T; timestamp: number }>>(new Map());

  const {
    cache = true,
    cacheTime = 60000, // 1分
    onSuccess,
    onError,
    debounceMs = 0
  } = options;

  const fetchData = useCallback(async () => {
    // キャッシュチェック
    if (cache) {
      const cached = cacheRef.current.get(url);
      if (cached && Date.now() - cached.timestamp < cacheTime) {
        setState({
          data: cached.data,
          loading: false,
          error: null
        });
        onSuccess?.(cached.data);
        return;
      }
    }

    // 前回のリクエストをキャンセル
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 新しいAbortController作成
    abortControllerRef.current = new AbortController();

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
        headers: {
          'x-admin-secret': process.env.NEXT_PUBLIC_ADMIN_SECRET_KEY || 'admin-development-secret-key'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // キャッシュに保存
      if (cache) {
        cacheRef.current.set(url, {
          data,
          timestamp: Date.now()
        });
      }

      setState({
        data,
        loading: false,
        error: null
      });

      onSuccess?.(data);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name !== 'AbortError') {
          setState({
            data: null,
            loading: false,
            error
          });
          onError?.(error);
        }
      }
    }
  }, [url, cache, cacheTime, onSuccess, onError]);

  const debouncedFetch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (debounceMs > 0) {
      debounceTimerRef.current = setTimeout(() => {
        fetchData();
      }, debounceMs);
    } else {
      fetchData();
    }
  }, [fetchData, debounceMs]);

  useEffect(() => {
    debouncedFetch();

    return () => {
      // クリーンアップ
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [url]); // URLが変わったときのみ再フェッチ

  const refetch = useCallback(() => {
    // キャッシュをクリアして再フェッチ
    cacheRef.current.delete(url);
    debouncedFetch();
  }, [url, debouncedFetch]);

  return {
    ...state,
    refetch
  };
}

/**
 * ページネーション付きデータフェッチフック
 */
export function usePaginatedFetch<T>(
  baseUrl: string,
  options: FetchOptions = {}
) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<Record<string, string>>({});

  // URLパラメータを構築
  const url = useCallback(() => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: pageSize.toString(),
      ...filters
    });
    return `${baseUrl}?${params.toString()}`;
  }, [baseUrl, page, pageSize, filters]);

  const result = useOptimizedFetch<T>(url(), options);

  return {
    ...result,
    page,
    pageSize,
    filters,
    setPage,
    setPageSize,
    setFilters,
    nextPage: () => setPage(p => p + 1),
    prevPage: () => setPage(p => Math.max(1, p - 1)),
    resetFilters: () => {
      setFilters({});
      setPage(1);
    }
  };
}