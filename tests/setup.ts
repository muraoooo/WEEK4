import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn()
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams()
}));

// Mock environment variables for testing
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.ADMIN_SECRET_KEY = 'test-admin-key';

// Mock fetch for tests
global.fetch = vi.fn();

// Cleanup after each test
afterEach(() => {
  vi.clearAllMocks();
});