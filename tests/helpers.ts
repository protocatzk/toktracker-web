import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AppConfig } from '../src/server/config.js';

export interface TestContext {
  cfg: AppConfig;
  dir: string;
}

export function makeTestConfig(overrides: Partial<AppConfig> = {}): TestContext {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ttw-test-'));
  const cfg: AppConfig = {
    nodeEnv: 'test',
    host: '127.0.0.1',
    port: 0,
    logLevel: 'silent',
    trustProxy: false,
    appOrigins: ['http://localhost:5173'],
    cookieSecure: false,
    sessionSecret: 'test-secret-test-secret-test-secret-1234',
    sessionTtlSeconds: 3600,
    toktrackerApiBase: 'https://example.test/track/api',
    toktrackerApiKey: 'test-api-key',
    toktrackerTimeoutMs: 5_000,
    dataDir: dir,
    usersFile: path.join(dir, 'users.json'),
    webDist: path.join(dir, 'web'),
    adminUsername: 'admin',
    adminPassword: 'admin-password-123',
    loginRateMax: 100,
    loginRateWindow: '1 minute',
    ...overrides,
  };
  return { cfg, dir };
}

export function cleanup(context: TestContext): void {
  fs.rmSync(context.dir, { recursive: true, force: true });
}

export async function loginCookie(
  app: { inject: (options: unknown) => Promise<{ headers: Record<string, unknown> }> },
  username = 'admin',
  password = 'admin-password-123',
): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/login',
    headers: { origin: 'http://localhost:5173' },
    payload: { username, password },
  });
  const raw = response.headers['set-cookie'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string') throw new Error('Kein Session-Cookie erhalten.');
  return value.split(';')[0];
}
