/**
 * API helper functions for admin endpoints
 */

// Get the base URL for API calls
export function getApiBaseUrl() {
  if (typeof window !== 'undefined') {
    // Client-side: use current origin
    return window.location.origin;
  }
  // Server-side: use environment variable or default
  return process.env.NEXTAUTH_URL || 'http://localhost:3001';
}

// Admin API fetch wrapper with authentication
export async function adminFetch(endpoint: string, options: RequestInit = {}) {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    'x-admin-secret': process.env.NEXT_PUBLIC_ADMIN_SECRET_KEY || 'admin-development-secret-key',
    ...options.headers,
  };
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  if (!response.ok && response.status !== 404) {
    console.error(`API Error: ${response.status} ${response.statusText} for ${url}`);
  }
  
  return response;
}