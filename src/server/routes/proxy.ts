import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { AppConfig } from '../config.js';
import {
  hasAllPermissions,
  resolvePermissions,
  resolveProxyPolicy,
} from '../auth/permissions.js';
import { readSession } from '../auth/sessions.js';

export interface ProxyOptions {
  fetchImpl?: typeof fetch;
}

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value.join(', ');
  return value;
}

function bodyForUpstream(request: FastifyRequest): string | Buffer | undefined {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD') return undefined;
  if (request.body === undefined || request.body === null) return undefined;

  if (Buffer.isBuffer(request.body)) return request.body;
  if (typeof request.body === 'string') return request.body;

  const contentType = headerValue(request.headers['content-type']) ?? '';
  if (contentType.includes('application/json')) {
    return JSON.stringify(request.body);
  }
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(request.body as Record<string, unknown>)) {
      if (Array.isArray(value)) {
        for (const item of value) params.append(key, String(item));
      } else if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    }
    return params.toString();
  }
  return JSON.stringify(request.body);
}

function upstreamUrl(cfg: AppConfig, request: FastifyRequest): URL {
  const raw = request.raw.url ?? '/';
  const parsed = new URL(raw, 'http://bff.local');
  const apiPath = parsed.pathname.replace(/^\/api/, '') || '/';
  return new URL(`${cfg.toktrackerApiBase}${apiPath}${parsed.search}`);
}

function filterResponseHeaders(upstream: Response): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const name of [
    'content-type',
    'content-disposition',
    'cache-control',
    'etag',
    'last-modified',
  ]) {
    const value = upstream.headers.get(name);
    if (value) headers[name] = value;
  }
  return headers;
}

function sendUpstreamFailure(
  request: FastifyRequest,
  reply: FastifyReply,
  status: number,
  detail: string,
): void {
  request.log.warn({ upstreamStatus: status, path: request.url }, detail);
  reply.code(502).send({ detail });
}

export async function registerProxyRoutes(
  app: FastifyInstance,
  cfg: AppConfig,
  options: ProxyOptions = {},
): Promise<void> {
  const fetchImpl = options.fetchImpl ?? fetch;

  app.all('/api/*', async (request, reply) => {
    const user = readSession(request, cfg);
    const requestUrl = new URL(request.raw.url ?? request.url, 'http://bff.local');
    const policy = resolveProxyPolicy(request.method, requestUrl.pathname);

    if (!policy.allowed) {
      if (policy.reason === 'disabled') {
        return reply.code(404).send({ detail: 'Dieser Endpunkt ist über den externen Proxy nicht verfügbar.' });
      }
      request.log.warn({ method: request.method, path: request.url }, 'Proxy-Endpunkt ohne Richtlinie');
      return reply.code(403).send({
        detail: 'Dieser Endpunkt ist im externen Frontend nicht freigegeben.',
      });
    }

    if (!policy.publicAccess) {
      if (!user) {
        return reply.code(401).send({ detail: 'Nicht angemeldet.' });
      }
      const permissions = resolvePermissions(user.role, user.grants, user.denies);
      if (!hasAllPermissions({ role: user.role, permissions }, policy.permissions)) {
        const missing = policy.permissions.filter((permission) => !permissions.includes(permission));
        return reply.code(403).send({
          detail: `Zugriff verweigert: Fehlende Rechte: ${missing.join(', ')}.`,
        });
      }
    }

    if (!cfg.toktrackerApiKey) {
      request.log.error('TOKTRACKER_API_KEY ist nicht gesetzt.');
      return reply.code(503).send({
        detail: 'Der BFF ist nicht mit einem TokTracker-API-Key konfiguriert.',
      });
    }

    const url = upstreamUrl(cfg, request);
    const headers = new Headers();
    const accept = headerValue(request.headers.accept);
    if (accept) headers.set('accept', accept);
    const contentType = headerValue(request.headers['content-type']);
    if (contentType) headers.set('content-type', contentType);
    headers.set('x-api-key', cfg.toktrackerApiKey);
    headers.set('user-agent', 'toktracker-web-bff/0.1');

    try {
      const upstream = await fetchImpl(url, {
        method: request.method,
        headers,
        body: bodyForUpstream(request) as RequestInit['body'],
        redirect: 'manual',
        signal: AbortSignal.timeout(cfg.toktrackerTimeoutMs),
      });

      if (upstream.status === 401 || upstream.status === 403) {
        sendUpstreamFailure(
          request,
          reply,
          upstream.status,
          'TokTracker hat den Zugriff abgelehnt. Bitte API-Key und Rechte des BFF prüfen.',
        );
        return;
      }

      reply.code(upstream.status);
      for (const [name, value] of Object.entries(filterResponseHeaders(upstream))) {
        reply.header(name, value);
      }

      if (request.method.toUpperCase() === 'HEAD' || upstream.status === 204 || upstream.status === 304) {
        return reply.send();
      }

      const buffer = Buffer.from(await upstream.arrayBuffer());
      return reply.send(buffer);
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        request.log.warn({ path: request.url }, 'TokTracker-Timeout');
        return reply.code(504).send({ detail: 'TokTracker antwortet nicht rechtzeitig.' });
      }
      request.log.error({ err: error, path: request.url }, 'Proxy-Fehler');
      return reply.code(502).send({ detail: 'TokTracker ist aktuell nicht erreichbar.' });
    }
  });
}
