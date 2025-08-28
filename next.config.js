/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Next.js page extensions
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Vercel deployment configuration
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      // API routes用のキャッシュヘッダー
      {
        source: '/api/admin/dashboard',
        headers: [
          {
            key: 'Cache-Control',
            value: 's-maxage=60, stale-while-revalidate=300',
          },
        ],
      },
      // 静的アセット用のキャッシュ
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig;