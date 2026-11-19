import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.string().default('info'),
  TRUST_PROXY: z.string().optional(),
  APP_ORIGIN: z.string().default('http://localhost:5173'),
  COOKIE_SECURE: z.string().optional(),
  SESSION_SECRET: z.string().optional(),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(86_400),
  TOKTRACKER_API_BASE: z.string().url().default('https://positronium.dev/track/api'),
  TOKTRACKER_API_KEY: z.string().default(''),
  TOKTRACKER_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  DATA_DIR: z.string().default('data'),
  ADMIN_USERNAME: z.string().default('admin'),
  ADMIN_PASSWORD: z.string().optional(),
  LOGIN_RATE_MAX: z.coerce.number().int().positive().default(10),
  LOGIN_RATE_WINDOW: z.string().default('15 minutes'),
});

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  host: string;
  port: number;
  logLevel: string;
  trustProxy: boolean;
  appOrigins: string[];
  cookieSecure: boolean;
  sessionSecret: string;
  sessionTtlSeconds: number;
  toktrackerApiBase: string;
  toktrackerApiKey: string;
  toktrackerTimeoutMs: number;
  dataDir: string;
  usersFile: string;
  webDist: string;
  adminUsername: string;
  adminPassword?: string;
  loginRateMax: number;
  loginRateWindow: string;
}

function parseBool(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function resolveSessionSecret(raw: string | undefined, dataDir: string, nodeEnv: string): string {
  const configured = (raw ?? '').trim();
  if (configured.length >= 32) return configured;
  if (configured.length > 0) {
    throw new Error('SESSION_SECRET muss mindestens 32 Zeichen lang sein.');
  }

  // In production a persistent secret is mandatory: otherwise every restart
  // invalidates all sessions. For local development we persist a generated one.
  const secretFile = path.join(dataDir, '.session-secret');
  if (nodeEnv !== 'production') {
    fs.mkdirSync(dataDir, { recursive: true });
    if (fs.existsSync(secretFile)) {
      const existing = fs.readFileSync(secretFile, 'utf8').trim();
      if (existing.length >= 32) return existing;
    }
    const generated = crypto.randomBytes(48).toString('hex');
    fs.writeFileSync(secretFile, `${generated}\n`, { mode: 0o600 });
    return generated;
  }

  throw new Error(
    'SESSION_SECRET fehlt. Bitte in der .env setzen (mindestens 32 Zeichen).',
  );
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env, cwd = process.cwd()): AppConfig {
  const parsed = envSchema.parse(env);
  const dataDir = path.resolve(cwd, parsed.DATA_DIR);
  const nodeEnv = parsed.NODE_ENV;

  const appOrigins = parsed.APP_ORIGIN.split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const secureFromOrigin = appOrigins.some((origin) => origin.startsWith('https://'));
  const cookieSecure = parseBool(parsed.COOKIE_SECURE) ?? (nodeEnv === 'production' || secureFromOrigin);

  return {
    nodeEnv,
    host: parsed.HOST,
    port: parsed.PORT,
    logLevel: parsed.LOG_LEVEL,
    trustProxy: parseBool(parsed.TRUST_PROXY) ?? nodeEnv === 'production',
    appOrigins,
    cookieSecure,
    sessionSecret: resolveSessionSecret(parsed.SESSION_SECRET, dataDir, nodeEnv),
    sessionTtlSeconds: parsed.SESSION_TTL_SECONDS,
    toktrackerApiBase: parsed.TOKTRACKER_API_BASE.replace(/\/+$/, ''),
    toktrackerApiKey: parsed.TOKTRACKER_API_KEY.trim(),
    toktrackerTimeoutMs: parsed.TOKTRACKER_TIMEOUT_MS,
    dataDir,
    usersFile: path.join(dataDir, 'users.json'),
    webDist: path.resolve(cwd, 'dist/web'),
    adminUsername: parsed.ADMIN_USERNAME,
    adminPassword: parsed.ADMIN_PASSWORD,
    loginRateMax: parsed.LOGIN_RATE_MAX,
    loginRateWindow: parsed.LOGIN_RATE_WINDOW,
  };
}

export const config = loadConfig();
export const APP_VERSION = '0.1.0';
