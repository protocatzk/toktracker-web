import { afterEach, describe, expect, it } from 'vitest';
import { buildServer } from '../src/server/index.js';
import { cleanup, loginCookie, makeTestConfig, type TestContext } from './helpers.js';

const contexts: TestContext[] = [];

afterEach(() => {
  while (contexts.length) {
    const context = contexts.pop();
    if (context) cleanup(context);
  }
});

describe('auth routes', () => {
  it('logs in, returns the session and logs out', async () => {
    const context = makeTestConfig();
    contexts.push(context);
    const app = await buildServer({ config: context.cfg });

    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      headers: { origin: 'http://localhost:5173' },
      payload: { username: 'admin', password: 'admin-password-123' },
    });
    expect(login.statusCode).toBe(200);
    expect(login.json().user.username).toBe('admin');
    expect(login.headers['set-cookie']).toBeTruthy();

    const cookie = await loginCookie(app);
    const me = await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie } });
    expect(me.statusCode).toBe(200);
    expect(me.json().user.role).toBe('admin');
    expect(me.json().permissions).toContain('users.manage');

    const logout = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: { cookie, origin: 'http://localhost:5173' },
    });
    expect(logout.statusCode).toBe(200);
    expect(logout.headers['set-cookie']).toContain('ttw_session=');

    await app.close();
  });

  it('rejects wrong credentials and unauthenticated access', async () => {
    const context = makeTestConfig();
    contexts.push(context);
    const app = await buildServer({ config: context.cfg });

    const failed = await app.inject({
      method: 'POST',
      url: '/auth/login',
      headers: { origin: 'http://localhost:5173' },
      payload: { username: 'admin', password: 'wrong-password' },
    });
    expect(failed.statusCode).toBe(401);

    const me = await app.inject({ method: 'GET', url: '/auth/me' });
    expect(me.statusCode).toBe(401);

    const users = await app.inject({ method: 'GET', url: '/auth/users' });
    expect(users.statusCode).toBe(401);

    await app.close();
  });

  it('creates a viewer and enforces users.manage', async () => {
    const context = makeTestConfig();
    contexts.push(context);
    const app = await buildServer({ config: context.cfg });
    const adminCookie = await loginCookie(app);

    const create = await app.inject({
      method: 'POST',
      url: '/auth/users',
      headers: { cookie: adminCookie, origin: 'http://localhost:5173' },
      payload: {
        username: 'viewer',
        password: 'viewer-password-123',
        role: 'viewer',
      },
    });
    expect(create.statusCode).toBe(201);
    expect(create.json().user.role).toBe('viewer');

    const viewerCookie = await loginCookie(app, 'viewer', 'viewer-password-123');
    const viewerMe = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { cookie: viewerCookie },
    });
    expect(viewerMe.statusCode).toBe(200);
    expect(viewerMe.json().permissions).toEqual(['public.view']);

    const forbidden = await app.inject({
      method: 'GET',
      url: '/auth/users',
      headers: { cookie: viewerCookie },
    });
    expect(forbidden.statusCode).toBe(403);

    await app.close();
  });

  it('rejects foreign origins for mutations', async () => {
    const context = makeTestConfig();
    contexts.push(context);
    const app = await buildServer({ config: context.cfg });

    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      headers: { origin: 'https://evil.example' },
      payload: { username: 'admin', password: 'admin-password-123' },
    });
    expect(response.statusCode).toBe(403);

    await app.close();
  });
});
