import './types.js';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyError, type FastifyInstance, type FastifyRequest } from 'fastify';
import { APP_VERSION, config, type AppConfig } from './config.js';
import { ensureSeedAdmin } from './auth/users.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerProxyRoutes, type ProxyOptions } from './routes/proxy.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export interface BuildServerOptions extends ProxyOptions {
  config?: AppConfig;
}

function requestOriginAllowed(cfg: AppConfig, request: FastifyRequest): boolean {
  const origin = request.headers.origin as string | undefined;
  if (!origin) return true;

  const allowed = new Set(cfg.appOrigins);
  const host = request.headers.host;
  if (host) {
    allowed.add(`${request.protocol}://${host}`);
  }
  return allowed.has(origin);
}

export async function buildServer(options: BuildServerOptions = {}): Promise<FastifyInstance> {
  const cfg = options.config ?? config;
  const app = Fastify({
    logger: {
      level: cfg.logLevel,
      transport:
        cfg.nodeEnv === 'development'
          ? {
              target: 'pino-pretty',
              options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
            }
          : undefined,
    },
    trustProxy: cfg.trustProxy,
    bodyLimit: 10 * 1024 * 1024,
  });

  await app.register(cookie, { secret: cfg.sessionSecret });
  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
  });
  await app.register(rateLimit, { global: false });

  app.addHook('onRequest', async (request, reply) => {
    if (SAFE_METHODS.has(request.method.toUpperCase())) return;
    if (requestOriginAllowed(cfg, request)) return;
    return reply.code(403).send({ detail: 'Origin nicht erlaubt.' });
  });

  app.get('/health', async () => ({
    status: 'ok',
    version: APP_VERSION,
    upstream: cfg.toktrackerApiBase,
  }));

  app.get('/version', async () => ({ version: APP_VERSION }));

  const seeded = ensureSeedAdmin(cfg);
  if (seeded.created) {
    if (seeded.generatedPassword) {
      app.log.warn(
        'Es wurde ein Administrator-Konto angelegt. Benutzername: %s · Einmal-Passwort: %s',
        cfg.adminUsername,
        seeded.generatedPassword,
      );
      app.log.warn('Bitte nach dem ersten Login unter /users das Passwort ändern.');
    } else {
      app.log.info('Administrator-Konto „%s“ wurde aus ADMIN_PASSWORD angelegt.', cfg.adminUsername);
    }
  }

  registerAuthRoutes(app, cfg);
  await registerProxyRoutes(app, cfg, options);

  const webDist = path.resolve(cfg.webDist);
  const hasWebBuild = fs.existsSync(path.join(webDist, 'index.html'));
  if (hasWebBuild) {
    await app.register(fastifyStatic, {
      root: webDist,
      prefix: '/',
      index: ['index.html'],
      wildcard: false,
    });
  }

  app.setNotFoundHandler((request, reply) => {
    const pathname = request.raw.url?.split('?')[0] ?? '/';
    if (pathname.startsWith('/api/') || pathname.startsWith('/auth/')) {
      return reply.code(404).send({ detail: 'Nicht gefunden.' });
    }
    if (hasWebBuild) {
      return reply.type('text/html').sendFile('index.html');
    }
    return reply
      .code(404)
      .type('text/plain')
      .send(
        'Frontend-Build nicht gefunden. Im Dev-Modus läuft die Oberfläche unter http://localhost:5173.',
      );
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    const status = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
    if (status >= 500) {
      request.log.error({ err: error }, 'Unbehandelter Fehler');
      return reply.code(500).send({ detail: 'Interner Serverfehler.' });
    }
    return reply.code(status).send({ detail: error.message });
  });

  return app;
}

async function main(): Promise<void> {
  const app = await buildServer();
  try {
    await app.listen({ host: config.host, port: config.port });
    app.log.info(
      'TokTracker-Web-BFF läuft auf http://%s:%d (Upstream: %s)',
      config.host,
      config.port,
      config.toktrackerApiBase,
    );
  } catch (error) {
    app.log.error({ err: error }, 'Server konnte nicht gestartet werden');
    process.exitCode = 1;
  }
}

const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (entry === import.meta.url) {
  void main();
}
