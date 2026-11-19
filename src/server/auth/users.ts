import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { AppConfig } from '../config.js';
import {
  type Permission,
  type Role,
  isPermission,
  isRole,
  normalizePermissions,
} from './permissions.js';
import { generatePassword, hashPassword } from './passwords.js';

export interface UserRecord {
  id: string;
  username: string;
  passwordHash: string;
  role: Role;
  grants: Permission[];
  denies: Permission[];
  disabled: boolean;
  sessionVersion: number;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface PublicUser {
  id: string;
  username: string;
  role: Role;
  grants: Permission[];
  denies: Permission[];
  disabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

interface UserStore {
  version: 1;
  users: UserRecord[];
}

export type UserStoreErrorCode = 'not_found' | 'conflict' | 'last_admin' | 'invalid';

export class UserStoreError extends Error {
  constructor(
    public readonly code: UserStoreErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'UserStoreError';
  }
}

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,32}$/;

function emptyStore(): UserStore {
  return { version: 1, users: [] };
}

function ensureParentDir(file: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

function readStore(file: string): UserStore {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw) as Partial<UserStore>;
    if (!Array.isArray(parsed.users)) return emptyStore();
    const users = parsed.users.filter((entry): entry is UserRecord => {
      if (!entry || typeof entry !== 'object') return false;
      const user = entry as Partial<UserRecord>;
      return (
        typeof user.id === 'string' &&
        typeof user.username === 'string' &&
        typeof user.passwordHash === 'string' &&
        isRole(user.role)
      );
    });
    return { version: 1, users };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return emptyStore();
    throw new Error(`Benutzerdatei konnte nicht gelesen werden: ${(error as Error).message}`);
  }
}

function writeStore(file: string, store: UserStore): void {
  ensureParentDir(file);
  const tempFile = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempFile, `${JSON.stringify(store, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(tempFile, file);
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeUsername(value: string): string {
  return value.trim();
}

function assertUsername(username: string): void {
  if (!USERNAME_PATTERN.test(username)) {
    throw new UserStoreError(
      'invalid',
      'Benutzername muss 3–32 Zeichen lang sein und darf nur Buchstaben, Zahlen, Punkt, Unterstrich und Bindestrich enthalten.',
    );
  }
}

function assertPassword(password: string): void {
  if (password.length < 8) {
    throw new UserStoreError('invalid', 'Das Passwort muss mindestens 8 Zeichen lang sein.');
  }
  if (password.length > 200) {
    throw new UserStoreError('invalid', 'Das Passwort ist zu lang.');
  }
}

function assertUniqueUsername(store: UserStore, username: string, exceptId?: string): void {
  const exists = store.users.some(
    (user) => user.id !== exceptId && user.username.toLowerCase() === username.toLowerCase(),
  );
  if (exists) {
    throw new UserStoreError('conflict', `Der Benutzername „${username}“ ist bereits vergeben.`);
  }
}

function enabledAdminCount(store: UserStore): number {
  return store.users.filter((user) => user.role === 'admin' && !user.disabled).length;
}

export function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    grants: [...user.grants],
    denies: [...user.denies],
    disabled: user.disabled,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    ...(user.lastLoginAt ? { lastLoginAt: user.lastLoginAt } : {}),
  };
}

export function findUserByUsername(file: string, username: string): UserRecord | undefined {
  const normalized = username.trim().toLowerCase();
  return readStore(file).users.find((user) => user.username.toLowerCase() === normalized);
}

export function findUserById(file: string, id: string): UserRecord | undefined {
  return readStore(file).users.find((user) => user.id === id);
}

export function listUsers(file: string): PublicUser[] {
  return readStore(file)
    .users.map(toPublicUser)
    .sort((a, b) => a.username.localeCompare(b.username, 'de'));
}

export interface CreateUserInput {
  username: string;
  password: string;
  role: Role;
  grants?: string[];
  denies?: string[];
}

export function createUser(file: string, input: CreateUserInput): PublicUser {
  const username = normalizeUsername(input.username);
  assertUsername(username);
  assertPassword(input.password);
  if (!isRole(input.role)) {
    throw new UserStoreError('invalid', 'Unbekannte Rolle.');
  }

  const store = readStore(file);
  assertUniqueUsername(store, username);
  const timestamp = nowIso();
  const user: UserRecord = {
    id: crypto.randomUUID(),
    username,
    passwordHash: hashPassword(input.password),
    role: input.role,
    grants: normalizePermissions(input.grants),
    denies: normalizePermissions(input.denies),
    disabled: false,
    sessionVersion: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  store.users.push(user);
  writeStore(file, store);
  return toPublicUser(user);
}

export interface UpdateUserInput {
  username?: string;
  password?: string;
  role?: Role;
  grants?: string[];
  denies?: string[];
  disabled?: boolean;
}

export function updateUser(file: string, id: string, patch: UpdateUserInput): PublicUser {
  const store = readStore(file);
  const user = store.users.find((entry) => entry.id === id);
  if (!user) throw new UserStoreError('not_found', 'Benutzer nicht gefunden.');

  let invalidateSessions = false;

  if (patch.username !== undefined) {
    const username = normalizeUsername(patch.username);
    assertUsername(username);
    assertUniqueUsername(store, username, id);
    if (username !== user.username) {
      user.username = username;
      invalidateSessions = true;
    }
  }

  if (patch.password !== undefined) {
    assertPassword(patch.password);
    user.passwordHash = hashPassword(patch.password);
    invalidateSessions = true;
  }

  if (patch.role !== undefined) {
    if (!isRole(patch.role)) throw new UserStoreError('invalid', 'Unbekannte Rolle.');
    if (user.role === 'admin' && patch.role !== 'admin' && enabledAdminCount(store) <= 1) {
      throw new UserStoreError('last_admin', 'Der letzte aktive Administrator kann nicht herabgestuft werden.');
    }
    if (patch.role !== user.role) {
      user.role = patch.role;
      invalidateSessions = true;
    }
  }

  if (patch.disabled !== undefined && patch.disabled !== user.disabled) {
    if (patch.disabled && user.role === 'admin' && enabledAdminCount(store) <= 1) {
      throw new UserStoreError('last_admin', 'Der letzte aktive Administrator kann nicht deaktiviert werden.');
    }
    user.disabled = patch.disabled;
    invalidateSessions = true;
  }

  if (patch.grants !== undefined) {
    const grants = normalizePermissions(patch.grants);
    if (grants.join('|') !== user.grants.join('|')) {
      user.grants = grants;
      invalidateSessions = true;
    }
  }

  if (patch.denies !== undefined) {
    const denies = normalizePermissions(patch.denies);
    if (denies.join('|') !== user.denies.join('|')) {
      user.denies = denies;
      invalidateSessions = true;
    }
  }

  if (invalidateSessions) user.sessionVersion += 1;
  user.updatedAt = nowIso();
  writeStore(file, store);
  return toPublicUser(user);
}

export function deleteUser(file: string, id: string): void {
  const store = readStore(file);
  const index = store.users.findIndex((entry) => entry.id === id);
  if (index === -1) throw new UserStoreError('not_found', 'Benutzer nicht gefunden.');
  const user = store.users[index];
  if (user.role === 'admin' && !user.disabled && enabledAdminCount(store) <= 1) {
    throw new UserStoreError('last_admin', 'Der letzte aktive Administrator kann nicht gelöscht werden.');
  }
  store.users.splice(index, 1);
  writeStore(file, store);
}

export function recordLogin(file: string, id: string): void {
  const store = readStore(file);
  const user = store.users.find((entry) => entry.id === id);
  if (!user) return;
  user.lastLoginAt = nowIso();
  writeStore(file, store);
}

export function ensureSeedAdmin(cfg: AppConfig): {
  created: boolean;
  generatedPassword?: string;
} {
  const store = readStore(cfg.usersFile);
  if (store.users.length > 0) return { created: false };

  const generatedPassword = cfg.adminPassword ? undefined : generatePassword();
  const password = cfg.adminPassword ?? generatedPassword!;
  const timestamp = nowIso();
  const admin: UserRecord = {
    id: crypto.randomUUID(),
    username: cfg.adminUsername,
    passwordHash: hashPassword(password),
    role: 'admin',
    grants: [],
    denies: [],
    disabled: false,
    sessionVersion: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  store.users.push(admin);
  writeStore(cfg.usersFile, store);
  return { created: true, generatedPassword };
}

export function isValidPermissionList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isPermission);
}
