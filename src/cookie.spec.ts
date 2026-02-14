describe('cookie.ts', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    // Reset modules to ensure fresh imports
    vi.resetModules();
    // Re-mock env-variables with a fresh copy each time
    vi.doMock('./env-variables', async (importOriginal) => {
      return { ...(await importOriginal<typeof import('./env-variables')>()) };
    });
  });

  describe('getCookieOptions', () => {
    it('should return the default cookie options', async () => {
      const { getCookieOptions } = await import('./cookie');

      const options = getCookieOptions();
      expect(options).toEqual(
        expect.objectContaining({
          path: '/',
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          maxAge: 400 * 24 * 60 * 60,
          domain: 'example.com',
        }),
      );
    });

    it('should return the cookie options with custom values', async () => {
      // Import the mocked module
      const envVars = await import('./env-variables');

      // Set the mock values
      const maxAgeSpy = vi.spyOn(envVars, 'WORKOS_COOKIE_MAX_AGE').mockReturnValue('1000');
      const domainSpy = vi.spyOn(envVars, 'WORKOS_COOKIE_DOMAIN').mockReturnValue('foobar.com');

      const { getCookieOptions } = await import('./cookie');
      const options = getCookieOptions('http://example.com');

      expect(options).toEqual(
        expect.objectContaining({
          secure: false,
          maxAge: 1000,
          domain: 'foobar.com',
        }),
      );

      domainSpy.mockReturnValue('');

      const options2 = getCookieOptions('http://example.com');
      expect(options2).toEqual(
        expect.objectContaining({
          secure: false,
          maxAge: 1000,
          domain: '',
        }),
      );

      const options3 = getCookieOptions('https://example.com', true);
      // Domain should not be included when WORKOS_COOKIE_DOMAIN is empty
      expect(options3).toEqual(expect.not.stringContaining('Domain='));

      maxAgeSpy.mockRestore();
      domainSpy.mockRestore();
    });

    it('should return the cookie options with expired set to true', async () => {
      const { getCookieOptions } = await import('./cookie');
      const options = getCookieOptions('http://example.com', false, true);
      expect(options).toEqual(expect.objectContaining({ maxAge: 0 }));
    });

    it('should return the cookie options as a string', async () => {
      const { getCookieOptions } = await import('./cookie');
      const options = getCookieOptions('http://example.com', true, false);
      expect(options).toEqual(expect.stringContaining('HttpOnly; SameSite=Lax; Max-Age=34560000; Domain=example.com'));
      expect(options).toEqual(expect.not.stringContaining('Secure'));

      const options2 = getCookieOptions('https://example.com', true, true);
      expect(options2).toEqual(expect.stringContaining('HttpOnly'));
      expect(options2).toEqual(expect.stringContaining('Secure'));
      expect(options2).toEqual(expect.stringContaining('SameSite=Lax'));
      expect(options2).toEqual(expect.stringContaining('Max-Age=0'));
      expect(options2).toEqual(expect.stringContaining('Domain=example.com'));
    });

    it('allows the sameSite config to be set by the WORKOS_COOKIE_SAMESITE env variable', async () => {
      const envVars = await import('./env-variables');
      const spy = vi.spyOn(envVars, 'WORKOS_COOKIE_SAMESITE').mockReturnValue('none');

      const { getCookieOptions } = await import('./cookie');
      const options = getCookieOptions('http://example.com');
      expect(options).toEqual(expect.objectContaining({ sameSite: 'none' }));

      spy.mockRestore();
    });

    it('throws an error if the sameSite value is invalid', async () => {
      const envVars = await import('./env-variables');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const spy = vi.spyOn(envVars, 'WORKOS_COOKIE_SAMESITE').mockReturnValue('invalid' as any);

      const { getCookieOptions } = await import('./cookie');
      expect(() => getCookieOptions('http://example.com')).toThrow('Invalid SameSite value: invalid');

      spy.mockRestore();
    });

    it('defaults to secure=true when no URL is available', async () => {
      const envVars = await import('./env-variables');
      const spy = vi.spyOn(envVars, 'WORKOS_REDIRECT_URI').mockReturnValue('');

      const { getCookieOptions } = await import('./cookie');
      const options = getCookieOptions();
      expect(options).toEqual(expect.objectContaining({ secure: true }));

      spy.mockRestore();
    });

    it('defaults to secure=true when no URL is available with lax sameSite', async () => {
      const envVars = await import('./env-variables');
      const uriSpy = vi.spyOn(envVars, 'WORKOS_REDIRECT_URI').mockReturnValue('');
      const sameSiteSpy = vi.spyOn(envVars, 'WORKOS_COOKIE_SAMESITE').mockReturnValue('lax');

      const { getCookieOptions } = await import('./cookie');
      const options = getCookieOptions();
      expect(options).toEqual(expect.objectContaining({ secure: true, sameSite: 'lax' }));

      uriSpy.mockRestore();
      sameSiteSpy.mockRestore();
    });

    it('handles invalid URLs gracefully by defaulting to secure=true', async () => {
      const { getCookieOptions } = await import('./cookie');
      const options = getCookieOptions('not-a-valid-url');
      expect(options).toEqual(expect.objectContaining({ secure: true }));
    });

    it('handles invalid WORKOS_COOKIE_MAX_AGE gracefully', async () => {
      const envVars = await import('./env-variables');
      const spy = vi.spyOn(envVars, 'WORKOS_COOKIE_MAX_AGE').mockReturnValue('invalid-number');

      const { getCookieOptions } = await import('./cookie');
      const options = getCookieOptions();
      expect(options).toEqual(expect.objectContaining({ maxAge: 34560000 })); // Falls back to default

      spy.mockRestore();
    });

    it('properly formats cookie string without Domain when not set', async () => {
      const envVars = await import('./env-variables');
      const spy = vi.spyOn(envVars, 'WORKOS_COOKIE_DOMAIN').mockReturnValue('');

      const { getCookieOptions } = await import('./cookie');
      const cookieString = getCookieOptions('https://example.com', true);
      expect(cookieString).not.toContain('Domain=');
      expect(cookieString).toContain('Secure');
      expect(cookieString).toContain('SameSite=Lax'); // Capitalized

      spy.mockRestore();
    });
  });

  describe('getJwtCookie', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      delete process.env.NODE_ENV;
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should create JWT cookie with Secure flag for HTTPS URLs', async () => {
      const { getJwtCookie } = await import('./cookie');

      const cookie = getJwtCookie('test-token', 'https://example.com');

      expect(cookie).toBe('workos-access-token=test-token; SameSite=Lax; Max-Age=30; Secure');
    });

    it('should create JWT cookie without Secure flag for HTTP URLs', async () => {
      const { getJwtCookie } = await import('./cookie');

      const cookie = getJwtCookie('test-token', 'http://localhost:3000');

      expect(cookie).toBe('workos-access-token=test-token; SameSite=Lax; Max-Age=30');
    });

    it('should force Secure in production except for localhost', async () => {
      process.env.NODE_ENV = 'production';

      const { getJwtCookie } = await import('./cookie');

      // Production with regular domain should be secure
      const prodCookie = getJwtCookie('prod-token', 'http://example.com');
      expect(prodCookie).toContain('Secure');

      // Production with localhost should not be secure
      const localhostCookie = getJwtCookie('local-token', 'http://localhost:3000');
      expect(localhostCookie).not.toContain('Secure');
    });

    it('should handle invalid URLs with no fallback URL', async () => {
      process.env.NODE_ENV = 'production';

      // Mock no WORKOS_REDIRECT_URI
      const envVars = await import('./env-variables');
      const spy = vi.spyOn(envVars, 'WORKOS_REDIRECT_URI').mockReturnValue('');

      const { getJwtCookie } = await import('./cookie');

      const cookie = getJwtCookie('token', 'invalid-url');

      expect(cookie).toContain('Secure'); // Should default to secure in production when no fallback

      spy.mockRestore();
    });

    it('should fall back to WORKOS_REDIRECT_URI when invalid URL provided', async () => {
      const envVars = await import('./env-variables');
      const spy = vi.spyOn(envVars, 'WORKOS_REDIRECT_URI').mockReturnValue('https://app.workos.com/callback');

      const { getJwtCookie } = await import('./cookie');

      const cookie = getJwtCookie('token', 'invalid-url');

      expect(cookie).toContain('Secure'); // Should use HTTPS from fallback URL

      spy.mockRestore();
    });

    it('should set secure to false when WORKOS_REDIRECT_URI parsing fails', async () => {
      process.env.NODE_ENV = 'development'; // Not production

      const envVars = await import('./env-variables');
      const spy = vi.spyOn(envVars, 'WORKOS_REDIRECT_URI').mockReturnValue('also-invalid-url');

      const { getJwtCookie } = await import('./cookie');

      const cookie = getJwtCookie('token', null); // This triggers the WORKOS_REDIRECT_URI path

      expect(cookie).not.toContain('Secure'); // Should be false when URL parsing fails (line 128)

      spy.mockRestore();
    });

    it('should handle both main URL and fallback URL parsing failures', async () => {
      const envVars = await import('./env-variables');
      const spy = vi.spyOn(envVars, 'WORKOS_REDIRECT_URI').mockReturnValue('invalid-fallback-url');

      const { getJwtCookie } = await import('./cookie');

      // Invalid main URL with invalid fallback URL - should hit line 118
      const cookie = getJwtCookie('token', 'invalid-main-url');

      expect(cookie).not.toContain('Secure'); // Line 118: secure = false when fallback parsing fails

      spy.mockRestore();
    });

    it('should use WORKOS_REDIRECT_URI when no URL provided', async () => {
      const envVars = await import('./env-variables');
      const spy = vi.spyOn(envVars, 'WORKOS_REDIRECT_URI').mockReturnValue('https://secure.example.com');

      const { getJwtCookie } = await import('./cookie');

      const cookie = getJwtCookie('token', null);

      expect(cookie).toContain('Secure'); // Should use HTTPS from WORKOS_REDIRECT_URI

      spy.mockRestore();
    });

    it('should create expired JWT cookie for deletion', async () => {
      const { getJwtCookie } = await import('./cookie');

      const cookie = getJwtCookie('token', 'https://example.com', true);

      expect(cookie).toBe(
        'workos-access-token=; SameSite=Lax; Max-Age=0; Secure; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
      );
    });

    it('should handle null token body', async () => {
      const { getJwtCookie } = await import('./cookie');

      const cookie = getJwtCookie(null, 'https://example.com');

      expect(cookie).toBe('workos-access-token=; SameSite=Lax; Max-Age=30; Secure');
    });

    it('should handle localhost vs 127.0.0.1 in production', async () => {
      process.env.NODE_ENV = 'production';

      const { getJwtCookie } = await import('./cookie');

      const localhostCookie = getJwtCookie('token', 'http://localhost:3000');
      const ipCookie = getJwtCookie('token', 'http://127.0.0.1:3000');

      expect(localhostCookie).not.toContain('Secure');
      expect(ipCookie).not.toContain('Secure');
    });
  });
});
