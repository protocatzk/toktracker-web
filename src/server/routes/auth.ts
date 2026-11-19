import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { AppConfig } from '../config.js';
import { verifyPassword } from '../auth/passwords.js';
import {
  ALL_PERMISSIONS,
  PERMISSION_LABELS,
  PERM_USERS_MANAGE,
  ROLE_LABELS,
  ROLES,
  isRole,
  resolvePermissions,
  type Permission,
} from '../auth/permissions.js';
import { clearSessionCookie, readSession, setSessionCookie } from '../auth/sessions.js';
import {
  createUser,
  deleteUser,
  findUserByUsername,
  listUsers,
  recordLogin,
  toPublicUser,
  updateUser,
  UserStoreError,
  type UpdateUserInput,
  type UserRecord,
} from '../auth/users.js';

const loginSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(200),
});

const createUserSchema = z.object({
  username: z.string().trim().min(3).max(32),
  password: z.string().min(8).max(200),
  role: z.enum(['viewer', 'user', 'moderator', 'admin']),
  grants: z.array(z.string()).optional(),
  denies: z.array(z.string()).optional(),
});

const updateUserSchema = z
  .object({
    username: z.string().trim().min(3).max(32).optional(),
    password: z.string().min(8).max(200).optional(),
    role: z.enum(['viewer', 'user', 'moderator', 'admin']).optional(),
    grants: z.array(z.string()).optional(),
    denies: z.array(z.string()).optional(),
    disabled: z.boolean().optional(),
  })
  .strict();

const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200),
});

function authPayload(user: UserRecord) {
  return {
    user: toPublicUser(user),
    permissions: resolvePermissions(user.role, user.grants, user.denies),
    roles: ROLES,
    roleLabels: ROLE_LABELS,
    permissionLabels: PERMISSION_LABELS,
    allPermissions: ALL_PERMISSIONS,
  };
}

function sendAuthError(reply: FastifyReply, error: unknown): void {
  if (error instanceof UserStoreError) {
    const status =
      error.code === 'not_found' ? 404 : error.code === 'invalid' ? 400 : 409;
    reply.code(status).send({ detail: error.message });
    return;
  }
  throw error;
}

function sessionUser(
  request: FastifyRequest,
  reply: FastifyReply,
  cfg: AppConfig,
): UserRecord | null {
  const user = readSession(request, cfg);
  if (!user) {
    reply.code(401).send({ detail: 'Nicht angemeldet.' });
    return null;
  }
  return user;
}

function withPermission(
  request: FastifyRequest,
  reply: FastifyReply,
  cfg: AppConfig,
  permission: Permission,
): UserRecord | null {
  const user = sessionUser(request, reply, cfg);
  if (!user) return null;
  const permissions = resolvePermissions(user.role, user.grants, user.denies);
  if (!permissions.includes(permission)) {
    reply.code(403).send({ detail: `Zugriff verweigert: Das Recht „${permission}“ fehlt.` });
    return null;
  }
  return user;
}

export function registerAuthRoutes(app: FastifyInstance, cfg: AppConfig): void {
  app.get('/auth/me', async (request, reply) => {
    const user = sessionUser(request, reply, cfg);
    if (!user) return;
    return authPayload(user);
  });

  app.post(
    '/auth/login',
    {
      config: {
        rateLimit: {
          max: cfg.loginRateMax,
          timeWindow: cfg.loginRateWindow,
        },
      },
    },
    async (request, reply) => {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ detail: 'Benutzername und Passwort sind erforderlich.' });
      }

      const user = findUserByUsername(cfg.usersFile, parsed.data.username);
      if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
        return reply.code(401).send({ detail: 'Benutzername oder Passwort ist falsch.' });
      }
      if (user.disabled) {
        return reply.code(403).send({ detail: 'Dieses Konto ist deaktiviert.' });
      }

      recordLogin(cfg.usersFile, user.id);
      setSessionCookie(reply, cfg, user);
      return { ok: true, ...authPayload(user) };
    },
  );

  app.post('/auth/logout', async (_request, reply) => {
    clearSessionCookie(reply);
    return { ok: true };
  });

  app.post('/auth/password', async (request, reply) => {
    const user = sessionUser(request, reply, cfg);
    if (!user) return;

    const parsed = passwordSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ detail: 'Aktuelles und neues Passwort sind erforderlich (neu: min. 8 Zeichen).' });
    }
    if (!verifyPassword(parsed.data.currentPassword, user.passwordHash)) {
      return reply.code(401).send({ detail: 'Das aktuelle Passwort ist falsch.' });
    }

    try {
      const updated = updateUser(cfg.usersFile, user.id, {
        password: parsed.data.newPassword,
      });
      const fresh = findUserByUsername(cfg.usersFile, updated.username);
      if (fresh) setSessionCookie(reply, cfg, fresh);
      return { ok: true };
    } catch (error) {
      return sendAuthError(reply, error);
    }
  });

  app.get('/auth/meta', async (request, reply) => {
    const user = sessionUser(request, reply, cfg);
    if (!user) return;
    return {
      roles: ROLES,
      roleLabels: ROLE_LABELS,
      permissions: ALL_PERMISSIONS,
      permissionLabels: PERMISSION_LABELS,
    };
  });

  app.get('/auth/users', async (request, reply) => {
    const user = withPermission(request, reply, cfg, PERM_USERS_MANAGE);
    if (!user) return;
    return { users: listUsers(cfg.usersFile) };
  });

  app.post('/auth/users', async (request, reply) => {
    const user = withPermission(request, reply, cfg, PERM_USERS_MANAGE);
    if (!user) return;

    const parsed = createUserSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ detail: 'Ungültige Benutzerdaten.' });
    }

    try {
      const created = createUser(cfg.usersFile, {
        username: parsed.data.username,
        password: parsed.data.password,
        role: parsed.data.role,
        grants: parsed.data.grants,
        denies: parsed.data.denies,
      });
      return reply.code(201).send({ user: created });
    } catch (error) {
      return sendAuthError(reply, error);
    }
  });

  app.put<{ Params: { id: string } }>('/auth/users/:id', async (request, reply) => {
    const user = withPermission(request, reply, cfg, PERM_USERS_MANAGE);
    if (!user) return;

    const parsed = updateUserSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ detail: 'Ungültige Benutzerdaten.' });
    }
    if (parsed.data.role !== undefined && !isRole(parsed.data.role)) {
      return reply.code(400).send({ detail: 'Unbekannte Rolle.' });
    }

    try {
      const patch: UpdateUserInput = { ...parsed.data };
      const updated = updateUser(cfg.usersFile, request.params.id, patch);
      return { user: updated };
    } catch (error) {
      return sendAuthError(reply, error);
    }
  });

  app.delete<{ Params: { id: string } }>('/auth/users/:id', async (request, reply) => {
    const user = withPermission(request, reply, cfg, PERM_USERS_MANAGE);
    if (!user) return;
    if (request.params.id === user.id) {
      return reply.code(400).send({ detail: 'Das eigene Konto kann nicht gelöscht werden.' });
    }

    try {
      deleteUser(cfg.usersFile, request.params.id);
      return { ok: true };
    } catch (error) {
      return sendAuthError(reply, error);
    }
  });

}
