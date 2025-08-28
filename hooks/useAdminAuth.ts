import { useState, useEffect } from 'react';

/**
 * Custom hook to get admin authentication token
 * This fetches the token from the server to avoid hardcoding in client
 */
export function useAdminAuth() {
  const [adminToken, setAdminToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchConfig() {
      try {
        const response = await fetch('/api/config');
        if (response.ok) {
          const data = await response.json();
          setAdminToken(data.adminApiToken || '');
        }
      } catch (error) {
        console.error('Failed to fetch config:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchConfig();
  }, []);
  
  return { adminToken, loading };
}

// Helper function to get admin headers
export function getAdminHeaders(token: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-admin-secret': token
  };
}