import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('env-variables (lazy access)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should read WORKOS_API_KEY lazily, not at import time', async () => {
    delete process.env.WORKOS_API_KEY;
    const { WORKOS_API_KEY } = await import('./env-variables.js');

    expect(WORKOS_API_KEY()).toBe('');

    process.env.WORKOS_API_KEY = 'sk_test_123';

    expect(WORKOS_API_KEY()).toBe('sk_test_123');
  });

  it('should read NEXT_PUBLIC_WORKOS_REDIRECT_URI lazily', async () => {
    delete process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI;
    const { WORKOS_REDIRECT_URI } = await import('./env-variables.js');

    expect(WORKOS_REDIRECT_URI()).toBe('');

    process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI = 'https://example.com/callback';

    expect(WORKOS_REDIRECT_URI()).toBe('https://example.com/callback');
  });

  it('should return undefined for optional env vars when not set', async () => {
    delete process.env.WORKOS_COOKIE_NAME;
    delete process.env.WORKOS_API_HOSTNAME;
    const { WORKOS_COOKIE_NAME, WORKOS_API_HOSTNAME } = await import('./env-variables.js');

    expect(WORKOS_COOKIE_NAME()).toBeUndefined();
    expect(WORKOS_API_HOSTNAME()).toBeUndefined();
  });

  it('should reflect changes to process.env on each call', async () => {
    const { WORKOS_CLIENT_ID } = await import('./env-variables.js');

    process.env.WORKOS_CLIENT_ID = 'client_first';
    expect(WORKOS_CLIENT_ID()).toBe('client_first');

    process.env.WORKOS_CLIENT_ID = 'client_second';
    expect(WORKOS_CLIENT_ID()).toBe('client_second');
  });
});
