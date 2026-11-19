import { describe, expect, it } from 'vitest';
import {
  PERM_ANALYTICS_VIEW,
  PERM_CHATINTEL_VIEW,
  PERM_EXPORT_DOWNLOAD,
  PERM_PUBLIC_VIEW,
  PERM_SETTINGS_MANAGE,
  PERM_SYSTEM_MANAGE,
  PERM_USERS_MANAGE,
  resolvePermissions,
  resolveProxyPolicy,
} from '../src/server/auth/permissions.js';

describe('permissions', () => {
  it('maps roles to the TokTracker capability matrix', () => {
    const moderator = resolvePermissions('moderator');
    expect(moderator).toContain(PERM_ANALYTICS_VIEW);
    expect(moderator).toContain(PERM_EXPORT_DOWNLOAD);
    expect(moderator).not.toContain(PERM_USERS_MANAGE);

    const viewer = resolvePermissions('viewer');
    expect(viewer).toEqual([PERM_PUBLIC_VIEW]);

    const admin = resolvePermissions('admin');
    expect(admin).toContain(PERM_USERS_MANAGE);
    expect(admin).toContain(PERM_SETTINGS_MANAGE);
    expect(admin).toContain(PERM_SYSTEM_MANAGE);
  });

  it('applies grants and denies; deny wins', () => {
    const permissions = resolvePermissions('viewer', [PERM_ANALYTICS_VIEW], [PERM_ANALYTICS_VIEW]);
    expect(permissions).not.toContain(PERM_ANALYTICS_VIEW);
  });

  it('protects critical admin permissions from denies', () => {
    const permissions = resolvePermissions('admin', [], [PERM_USERS_MANAGE, PERM_SETTINGS_MANAGE]);
    expect(permissions).toContain(PERM_USERS_MANAGE);
    expect(permissions).toContain(PERM_SETTINGS_MANAGE);
  });

  it('resolves proxy policies', () => {
    expect(resolveProxyPolicy('GET', '/api/overview')).toMatchObject({
      allowed: true,
      permissions: [PERM_ANALYTICS_VIEW],
    });
    expect(resolveProxyPolicy('GET', '/api/public/overview')).toMatchObject({
      allowed: true,
      publicAccess: true,
    });
    expect(resolveProxyPolicy('GET', '/api/chat-intelligence/export')).toMatchObject({
      allowed: true,
      permissions: [PERM_CHATINTEL_VIEW, PERM_EXPORT_DOWNLOAD],
    });
    expect(resolveProxyPolicy('POST', '/api/gifts')).toMatchObject({
      allowed: true,
      permissions: ['gifts.book'],
    });
    expect(resolveProxyPolicy('GET', '/api/system/status')).toMatchObject({
      allowed: true,
      permissions: ['system.view'],
    });
    expect(resolveProxyPolicy('POST', '/api/v1/telegram/send-report')).toMatchObject({
      allowed: true,
      permissions: ['reports.send'],
    });
    expect(resolveProxyPolicy('GET', '/api/v1/reports/daily')).toMatchObject({
      allowed: true,
      permissions: [PERM_ANALYTICS_VIEW],
    });
  });

  it('disables auth and legacy mini-app routes', () => {
    expect(resolveProxyPolicy('POST', '/api/auth/login')).toEqual({
      allowed: false,
      reason: 'disabled',
    });
    expect(resolveProxyPolicy('GET', '/api/miniapp/data')).toEqual({
      allowed: false,
      reason: 'disabled',
    });
  });

  it('denies unknown routes by default', () => {
    expect(resolveProxyPolicy('GET', '/api/unknown')).toEqual({
      allowed: false,
      reason: 'unknown',
    });
    expect(resolveProxyPolicy('DELETE', '/api/overview')).toEqual({
      allowed: false,
      reason: 'unknown',
    });
  });
});
