import type { UserRecord } from './auth/users.js';

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: UserRecord;
  }
}

export {};
