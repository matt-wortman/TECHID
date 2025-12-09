/**
 * @jest-environment node
 */
import type { NextRequest } from 'next/server';

const originalEnv = process.env;

function encodeCredentials(username: string, password: string): string {
  const credentials = `${username}:${password}`;
  return Buffer.from(credentials).toString('base64');
}

function createRequest(
  url: string,
  headers: Record<string, string> = {}
): NextRequest {
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  );

  return {
    url,
    headers: {
      get: (key: string) => normalizedHeaders[key.toLowerCase()] ?? null,
    },
    nextUrl: {
      pathname: new URL(url).pathname,
    },
  } as unknown as NextRequest;
}

describe('middleware', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      BASIC_AUTH_USERNAME: 'testuser',
      BASIC_AUTH_PASSWORD: 'testpass',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('authentication configuration', () => {
    it('returns 500 when BASIC_AUTH_USERNAME is missing', async () => {
      process.env = { ...originalEnv, BASIC_AUTH_PASSWORD: 'testpass' };
      delete process.env.BASIC_AUTH_USERNAME;

      const { middleware } = await import('./middleware');
      const request = createRequest('http://localhost:3000/dashboard');
      const response = middleware(request);

      expect(response.status).toBe(500);
      const text = await response.text();
      expect(text).toBe('Authentication configuration missing');
    });

    it('returns 500 when BASIC_AUTH_PASSWORD is missing', async () => {
      process.env = { ...originalEnv, BASIC_AUTH_USERNAME: 'testuser' };
      delete process.env.BASIC_AUTH_PASSWORD;

      const { middleware } = await import('./middleware');
      const request = createRequest('http://localhost:3000/dashboard');
      const response = middleware(request);

      expect(response.status).toBe(500);
      const text = await response.text();
      expect(text).toBe('Authentication configuration missing');
    });

    it('returns 500 when both credentials are missing', async () => {
      process.env = { ...originalEnv };
      delete process.env.BASIC_AUTH_USERNAME;
      delete process.env.BASIC_AUTH_PASSWORD;

      const { middleware } = await import('./middleware');
      const request = createRequest('http://localhost:3000/dashboard');
      const response = middleware(request);

      expect(response.status).toBe(500);
    });
  });

  describe('valid credentials', () => {
    it('allows access with valid Basic auth credentials', async () => {
      const { middleware } = await import('./middleware');
      const encoded = encodeCredentials('testuser', 'testpass');
      const request = createRequest('http://localhost:3000/dashboard', {
        authorization: `Basic ${encoded}`,
      });

      const response = middleware(request);

      // NextResponse.next() returns status 200
      expect(response.status).toBe(200);
    });

    it('allows access with credentials containing special characters', async () => {
      process.env.BASIC_AUTH_USERNAME = 'user@domain.com';
      process.env.BASIC_AUTH_PASSWORD = 'p@ss:word!123';

      const { middleware } = await import('./middleware');
      const encoded = encodeCredentials('user@domain.com', 'p@ss:word!123');
      const request = createRequest('http://localhost:3000/dashboard', {
        authorization: `Basic ${encoded}`,
      });

      const response = middleware(request);

      expect(response.status).toBe(200);
    });

    it('handles password containing colons correctly', async () => {
      process.env.BASIC_AUTH_PASSWORD = 'pass:with:colons';

      const { middleware } = await import('./middleware');
      const encoded = encodeCredentials('testuser', 'pass:with:colons');
      const request = createRequest('http://localhost:3000/dashboard', {
        authorization: `Basic ${encoded}`,
      });

      const response = middleware(request);

      expect(response.status).toBe(200);
    });
  });

  describe('invalid credentials', () => {
    it('blocks access with wrong username', async () => {
      const { middleware } = await import('./middleware');
      const encoded = encodeCredentials('wronguser', 'testpass');
      const request = createRequest('http://localhost:3000/dashboard', {
        authorization: `Basic ${encoded}`,
      });

      const response = middleware(request);

      expect(response.status).toBe(401);
      const text = await response.text();
      expect(text).toBe('Authentication required');
    });

    it('blocks access with wrong password', async () => {
      const { middleware } = await import('./middleware');
      const encoded = encodeCredentials('testuser', 'wrongpass');
      const request = createRequest('http://localhost:3000/dashboard', {
        authorization: `Basic ${encoded}`,
      });

      const response = middleware(request);

      expect(response.status).toBe(401);
    });

    it('blocks access with empty credentials', async () => {
      const { middleware } = await import('./middleware');
      const encoded = encodeCredentials('', '');
      const request = createRequest('http://localhost:3000/dashboard', {
        authorization: `Basic ${encoded}`,
      });

      const response = middleware(request);

      expect(response.status).toBe(401);
    });
  });

  describe('missing or malformed authorization', () => {
    it('blocks access when authorization header is missing', async () => {
      const { middleware } = await import('./middleware');
      const request = createRequest('http://localhost:3000/dashboard');

      const response = middleware(request);

      expect(response.status).toBe(401);
      expect(response.headers.get('WWW-Authenticate')).toBe('Basic realm="Tech Triage"');
    });

    it('blocks access with Bearer token instead of Basic', async () => {
      const { middleware } = await import('./middleware');
      const request = createRequest('http://localhost:3000/dashboard', {
        authorization: 'Bearer some-jwt-token',
      });

      const response = middleware(request);

      expect(response.status).toBe(401);
    });

    it('blocks access with malformed Basic auth (no space)', async () => {
      const { middleware } = await import('./middleware');
      const request = createRequest('http://localhost:3000/dashboard', {
        authorization: 'BasicdGVzdHVzZXI6dGVzdHBhc3M=',
      });

      const response = middleware(request);

      expect(response.status).toBe(401);
    });

    it('blocks access with empty authorization header', async () => {
      const { middleware } = await import('./middleware');
      const request = createRequest('http://localhost:3000/dashboard', {
        authorization: '',
      });

      const response = middleware(request);

      expect(response.status).toBe(401);
    });

    it('blocks access when base64 decodes to string without colon', async () => {
      const { middleware } = await import('./middleware');
      const encoded = Buffer.from('nocredentialsseparator').toString('base64');
      const request = createRequest('http://localhost:3000/dashboard', {
        authorization: `Basic ${encoded}`,
      });

      const response = middleware(request);

      expect(response.status).toBe(401);
    });
  });

  describe('401 response format', () => {
    it('returns proper WWW-Authenticate header with realm', async () => {
      const { middleware } = await import('./middleware');
      const request = createRequest('http://localhost:3000/dashboard');

      const response = middleware(request);

      expect(response.status).toBe(401);
      expect(response.headers.get('WWW-Authenticate')).toBe('Basic realm="Tech Triage"');
    });

    it('returns "Authentication required" message body', async () => {
      const { middleware } = await import('./middleware');
      const request = createRequest('http://localhost:3000/dashboard');

      const response = middleware(request);

      const text = await response.text();
      expect(text).toBe('Authentication required');
    });
  });

  describe('case sensitivity', () => {
    it('accepts "basic" scheme in lowercase', async () => {
      const { middleware } = await import('./middleware');
      const encoded = encodeCredentials('testuser', 'testpass');
      const request = createRequest('http://localhost:3000/dashboard', {
        authorization: `basic ${encoded}`,
      });

      const response = middleware(request);

      expect(response.status).toBe(200);
    });

    it('accepts "BASIC" scheme in uppercase', async () => {
      const { middleware } = await import('./middleware');
      const encoded = encodeCredentials('testuser', 'testpass');
      const request = createRequest('http://localhost:3000/dashboard', {
        authorization: `BASIC ${encoded}`,
      });

      const response = middleware(request);

      expect(response.status).toBe(200);
    });

    it('treats username as case-sensitive', async () => {
      const { middleware } = await import('./middleware');
      const encoded = encodeCredentials('TestUser', 'testpass');
      const request = createRequest('http://localhost:3000/dashboard', {
        authorization: `Basic ${encoded}`,
      });

      const response = middleware(request);

      expect(response.status).toBe(401);
    });

    it('treats password as case-sensitive', async () => {
      const { middleware } = await import('./middleware');
      const encoded = encodeCredentials('testuser', 'TestPass');
      const request = createRequest('http://localhost:3000/dashboard', {
        authorization: `Basic ${encoded}`,
      });

      const response = middleware(request);

      expect(response.status).toBe(401);
    });
  });
});

describe('middleware matcher config', () => {
  it('exports a matcher that excludes health endpoint', async () => {
    const { config } = await import('./middleware');

    expect(config.matcher).toBeDefined();
    expect(config.matcher[0]).toContain('api/health');
  });

  it('exports a matcher that excludes static assets', async () => {
    const { config } = await import('./middleware');

    expect(config.matcher[0]).toContain('_next/static');
    expect(config.matcher[0]).toContain('_next/image');
    expect(config.matcher[0]).toContain('favicon.ico');
  });
});
