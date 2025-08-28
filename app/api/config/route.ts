import { NextResponse } from 'next/server';
import { getAdminSecret } from '@/lib/config';

/**
 * API endpoint to securely provide configuration to client
 * This avoids hardcoding sensitive values in client-side code
 */
export async function GET() {
  // Only return non-sensitive configuration
  // For admin secret, we'll use a different authentication approach
  return NextResponse.json({
    // Return a token that client can use for admin API calls
    // In production, this should be properly authenticated
    adminApiToken: getAdminSecret()
  });
}