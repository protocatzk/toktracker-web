import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildServer } from '../src/server/index.js';
import { cleanup, loginCookie, makeTestConfig, type TestContext } from './helpers.js';

const contexts: TestContext[] = [];

afterEach(() => {
  while (contexts.length) {
    const context = contexts.pop();
    if (context) cleanup(context);
  }
});

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('proxy routes', () => {
  it('forwards path, query and API key to TokTracker', async () => {
    const context = makeTestConfig();
    contexts.push(context);
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    const app = await buildServer({
      config: context.cfg,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const cookie = await loginCookie(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/overview?period=24h',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(url)).toBe('https://example.test/track/api/overview?period=24h');
    const headers = new Headers(init.headers as Record<string, string>);
    expect(headers.get('x-api-key')).toBe('test-api-key');

    await app.close();
  });

  it('requires a session for non-public endpoints but allows public ones', async () => {
    const context = makeTestConfig();
    contexts.push(context);
    const fetchMock = vi.fn(async () => jsonResponse({ public: true }));
    const app = await buildServer({
      config: context.cfg,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const privateResponse = await app.inject({ method: 'GET', url: '/api/overview' });
    expect(privateResponse.statusCode).toBe(401);

    const publicResponse = await app.inject({ method: 'GET', url: '/api/public/overview' });
    expect(publicResponse.statusCode).toBe(200);
    expect(publicResponse.json()).toEqual({ public: true });

    await app.close();
  });

  it('enforces role permissions for writes', async () => {
    const context = makeTestConfig();
    contexts.push(context);
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    const app = await buildServer({
      config: context.cfg,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const adminCookie = await loginCookie(app);

    await app.inject({
      method: 'POST',
      url: '/auth/users',
      headers: { cookie: adminCookie, origin: 'http://localhost:5173' },
      payload: { username: 'moderator', password: 'moderator-password-123', role: 'moderator' },
    });
    const moderatorCookie = await loginCookie(app, 'moderator', 'moderator-password-123');

    const forbidden = await app.inject({
      method: 'POST',
      url: '/api/gifts',
      headers: { cookie: moderatorCookie, origin: 'http://localhost:5173' },
      payload: { gift_name: 'Rose' },
    });
    expect(forbidden.statusCode).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();

    const allowed = await app.inject({
      method: 'POST',
      url: '/api/gifts',
      headers: { cookie: adminCookie, origin: 'http://localhost:5173' },
      payload: { gift_name: 'Rose' },
    });
    expect(allowed.statusCode).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await app.close();
  });

  it('caches expensive GET responses and invalidates on writes', async () => {
    const context = makeTestConfig();
    contexts.push(context);
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    const app = await buildServer({
      config: context.cfg,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const cookie = await loginCookie(app);

    const first = await app.inject({
      method: 'GET',
      url: '/api/analytics?period=24h',
      headers: { cookie },
    });
    const second = await app.inject({
      method: 'GET',
      url: '/api/analytics?period=24h',
      headers: { cookie },
    });

    expect(first.headers['x-bff-cache']).toBe('MISS');
    expect(second.headers['x-bff-cache']).toBe('HIT');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await app.inject({
      method: 'POST',
      url: '/api/gifts',
      headers: { cookie, origin: 'http://localhost:5173' },
      payload: { gift_name: 'Rose' },
    });
    await app.inject({
      method: 'GET',
      url: '/api/analytics?period=24h',
      headers: { cookie },
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);

    await app.close();
  });

  it('blocks unknown proxy paths', async () => {
    const context = makeTestConfig();
    contexts.push(context);
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    const app = await buildServer({
      config: context.cfg,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const cookie = await loginCookie(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/internal/secret',
      headers: { cookie },
    });
    expect(response.statusCode).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();

    await app.close();
  });

  it('maps upstream auth failures to a BFF error', async () => {
    const context = makeTestConfig();
    contexts.push(context);
    const fetchMock = vi.fn(async () => jsonResponse({ detail: 'nope' }, 401));
    const app = await buildServer({
      config: context.cfg,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const cookie = await loginCookie(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/overview',
      headers: { cookie },
    });
    expect(response.statusCode).toBe(502);

    await app.close();
  });

  it('returns 504 on upstream timeout', async () => {
    const context = makeTestConfig();
    contexts.push(context);
    const fetchMock = vi.fn(async () => {
      const error = new Error('timeout');
      error.name = 'TimeoutError';
      throw error;
    });
    const app = await buildServer({
      config: context.cfg,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const cookie = await loginCookie(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/overview',
      headers: { cookie },
    });
    expect(response.statusCode).toBe(504);

    await app.close();
  });
});
