/**
 * Configuration helper for environment variables
 * This ensures proper handling of environment variables for both development and production
 */

export const config = {
  // Database
  mongodbUri: process.env.MONGODB_URI || 'mongodb+srv://adimin:gpt5love@cluster0.zu4p8ot.mongodb.net/embrocal?retryWrites=true&w=majority&appName=Cluster0',
  
  // Authentication
  adminSecretKey: process.env.ADMIN_SECRET_KEY || 'admin-development-secret-key',
  jwtSecret: process.env.JWT_SECRET || 'secure-jwt-secret-key-for-development',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'access-token-secret-key-development',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-token-secret-key-development',
  
  // Email
  emailServerUser: process.env.EMAIL_SERVER_USER || 'noreply@miraichimoonshot.sakura.ne.jp',
  emailServerPassword: process.env.EMAIL_SERVER_PASSWORD || 'Vhdyt4@k52uhViB',
  emailServerHost: process.env.EMAIL_SERVER_HOST || 'miraichimoonshot.sakura.ne.jp',
  emailServerPort: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
  emailServerSecure: process.env.EMAIL_SERVER_SECURE === 'true',
  emailFrom: process.env.EMAIL_FROM || 'Survibe <noreply@miraichimoonshot.sakura.ne.jp>',
  
  // Environment
  nodeEnv: process.env.NODE_ENV || 'development',
  nextAuthUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  
  // Public config (accessible on client side)
  public: {
    // For client-side API calls, we need to use a different approach
    // These will be replaced at build time by Next.js
    adminSecret: process.env.NEXT_PUBLIC_ADMIN_SECRET || 'admin-development-secret-key'
  }
};

// Helper function to get admin secret for API routes
export function getAdminSecret(): string {
  return config.adminSecretKey;
}

// Helper function to get public admin secret for client-side
export function getPublicAdminSecret(): string {
  // In production, this should come from NEXT_PUBLIC_ADMIN_SECRET
  // For security, consider using a different authentication mechanism for client-side
  return typeof window !== 'undefined' 
    ? 'admin-development-secret-key' // Client-side fallback
    : config.adminSecretKey; // Server-side
}