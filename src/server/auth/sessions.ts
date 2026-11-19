import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AppConfig } from '../config.js';
import { findUserByUsername, type UserRecord } from './users.js';

export const SESSION_COOKIE = 'ttw_session';

interface SessionCookie {
  sub: string;
  v: number;
  exp: number;
}

function encodeSession(user: UserRecord, ttlSeconds: number): string {
  const payload: SessionCookie = {
    sub: user.username,
    v: user.sessionVersion,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodeSession(value: string): SessionCookie | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as SessionCookie;
    if (
      !parsed ||
      typeof parsed.sub !== 'string' ||
      typeof parsed.v !== 'number' ||
      typeof parsed.exp !== 'number'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setSessionCookie(reply: FastifyReply, cfg: AppConfig, user: UserRecord): void {
  reply.setCookie(SESSION_COOKIE, encodeSession(user, cfg.sessionTtlSeconds), {
    path: '/',
    httpOnly: true,
    secure: cfg.cookieSecure,
    sameSite: 'lax',
    signed: true,
    maxAge: cfg.sessionTtlSeconds,
  });
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE, { path: '/' });
}

export function readSession(request: FastifyRequest, cfg: AppConfig): UserRecord | null {
  const raw = request.cookies[SESSION_COOKIE];
  if (!raw) return null;

  const unsigned = request.unsignCookie(raw);
  if (!unsigned.valid || !unsigned.value) return null;

  const payload = decodeSession(unsigned.value);
  if (!payload) return null;
  if (payload.exp <= Math.floor(Date.now() / 1000)) return null;

  const user = findUserByUsername(cfg.usersFile, payload.sub);
  if (!user || user.disabled) return null;
  if (user.sessionVersion !== payload.v) return null;

  return user;
}
