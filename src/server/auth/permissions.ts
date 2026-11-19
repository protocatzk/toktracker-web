/**
 * Zentrale Rollen- und Rechte-Matrix.
 *
 * Die Capabilities spiegeln die TokTracker-Matrix (shared/permissions.py),
 * damit die externe Oberfläche dieselben Sichtbarkeiten abbilden kann. Der
 * BFF setzt sie durch, bevor ein Request an die TokTracker-API geht.
 */

export const ROLE_VIEWER = 'viewer';
export const ROLE_USER = 'user';
export const ROLE_MODERATOR = 'moderator';
export const ROLE_ADMIN = 'admin';

export type Role = typeof ROLE_VIEWER | typeof ROLE_USER | typeof ROLE_MODERATOR | typeof ROLE_ADMIN;

export const ROLES: Role[] = [ROLE_VIEWER, ROLE_USER, ROLE_MODERATOR, ROLE_ADMIN];

export const ROLE_LABELS: Record<Role, string> = {
  viewer: 'Gast / Zuschauer',
  user: 'Nutzer / Mitglied',
  moderator: 'Moderator',
  admin: 'Administrator',
};

export const PERM_PUBLIC_VIEW = 'public.view';
export const PERM_RADAR_VIEW = 'radar.view';
export const PERM_CHATINTEL_VIEW = 'chatintel.view';
export const PERM_ANALYTICS_VIEW = 'analytics.view';
export const PERM_EXPORT_DOWNLOAD = 'export.download';
export const PERM_SYSTEM_VIEW = 'system.view';
export const PERM_CRM_EDIT = 'crm.edit';
export const PERM_STREAMERS_MANAGE = 'streamers.manage';
export const PERM_GIFTS_BOOK = 'gifts.book';
export const PERM_SETTINGS_MANAGE = 'settings.manage';
export const PERM_USERS_MANAGE = 'users.manage';
export const PERM_SYSTEM_MANAGE = 'system.manage';
export const PERM_REPORTS_SEND = 'reports.send';

export const ALL_PERMISSIONS = [
  PERM_PUBLIC_VIEW,
  PERM_RADAR_VIEW,
  PERM_CHATINTEL_VIEW,
  PERM_ANALYTICS_VIEW,
  PERM_EXPORT_DOWNLOAD,
  PERM_SYSTEM_VIEW,
  PERM_CRM_EDIT,
  PERM_STREAMERS_MANAGE,
  PERM_GIFTS_BOOK,
  PERM_SETTINGS_MANAGE,
  PERM_USERS_MANAGE,
  PERM_SYSTEM_MANAGE,
  PERM_REPORTS_SEND,
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<Permission, string> = {
  'public.view': 'Öffentliche Seiten ansehen',
  'radar.view': 'Spender-Radar & Chatlogs ansehen',
  'chatintel.view': 'Chat-Intelligence ansehen',
  'analytics.view': 'Statistiken & Analytics ansehen',
  'export.download': 'CSV-Exporte herunterladen',
  'system.view': 'Systemstatus ansehen',
  'crm.edit': 'CRM & VIP-Markierungen bearbeiten',
  'streamers.manage': 'Streamer verwalten & tracken',
  'gifts.book': 'Geschenke manuell buchen',
  'settings.manage': 'Einstellungen & Zugriffsmodus verwalten',
  'users.manage': 'Nutzer, Whitelist & Rollen verwalten',
  'system.manage': 'System verwalten',
  'reports.send': 'Reports versenden',
};

const VIEWER_PERMISSIONS: Permission[] = [PERM_PUBLIC_VIEW];

const USER_PERMISSIONS: Permission[] = [
  PERM_PUBLIC_VIEW,
  PERM_RADAR_VIEW,
  PERM_CHATINTEL_VIEW,
];

const MODERATOR_PERMISSIONS: Permission[] = [
  PERM_PUBLIC_VIEW,
  PERM_RADAR_VIEW,
  PERM_CHATINTEL_VIEW,
  PERM_ANALYTICS_VIEW,
  PERM_EXPORT_DOWNLOAD,
  PERM_SYSTEM_VIEW,
];

export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  viewer: new Set(VIEWER_PERMISSIONS),
  user: new Set(USER_PERMISSIONS),
  moderator: new Set(MODERATOR_PERMISSIONS),
  admin: new Set(ALL_PERMISSIONS),
};

/** Kritische Rechte können einem Administrator nicht entzogen werden. */
const UNDENIABLE_ADMIN_PERMISSIONS = new Set<Permission>([
  PERM_USERS_MANAGE,
  PERM_SETTINGS_MANAGE,
  PERM_SYSTEM_MANAGE,
]);

const PERMISSION_SET = new Set<string>(ALL_PERMISSIONS);

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as string[]).includes(value);
}

export function isPermission(value: unknown): value is Permission {
  return typeof value === 'string' && PERMISSION_SET.has(value);
}

export function normalizePermissions(values: unknown): Permission[] {
  if (!Array.isArray(values)) return [];
  return values.filter(isPermission);
}

export function resolvePermissions(
  role: Role,
  grants: readonly string[] = [],
  denies: readonly string[] = [],
): Permission[] {
  const effective = new Set<Permission>(ROLE_PERMISSIONS[role]);
  for (const grant of grants) {
    if (isPermission(grant)) effective.add(grant);
  }
  for (const deny of denies) {
    if (!isPermission(deny)) continue;
    if (role === ROLE_ADMIN && UNDENIABLE_ADMIN_PERMISSIONS.has(deny)) continue;
    effective.delete(deny);
  }
  return ALL_PERMISSIONS.filter((permission) => effective.has(permission));
}

export interface PermissionHolder {
  role: Role;
  permissions: readonly string[];
}

export function hasPermission(holder: PermissionHolder, permission: string): boolean {
  return holder.permissions.includes(permission);
}

export function hasAllPermissions(holder: PermissionHolder, permissions: readonly string[]): boolean {
  return permissions.every((permission) => hasPermission(holder, permission));
}

/* ------------------------------------------------------------------------- */
/* Proxy-Richtlinien: welcher TokTracker-Endpunkt braucht welches Recht?     */
/* ------------------------------------------------------------------------- */

export interface ProxyAllowed {
  allowed: true;
  permissions: Permission[];
  publicAccess: boolean;
}

export interface ProxyDenied {
  allowed: false;
  reason: 'disabled' | 'unknown';
}

export type ProxyPolicy = ProxyAllowed | ProxyDenied;

interface ProxyRule {
  methods: string[];
  pattern: RegExp;
  permissions: Permission[];
  publicAccess?: boolean;
}

const GET = ['GET', 'HEAD'];

const PROXY_RULES: ProxyRule[] = [
  // Öffentliche Daten. Der BFF hält den API-Key, damit das Gate passiert.
  {
    methods: GET,
    pattern: /^\/api\/health$/,
    permissions: [],
    publicAccess: true,
  },
  {
    methods: GET,
    pattern: /^\/(?:api|api\/v1)\/public\//,
    permissions: [PERM_PUBLIC_VIEW],
    publicAccess: true,
  },
  {
    methods: GET,
    pattern: /^\/api(?:\/v1)?\/live$/,
    permissions: [PERM_PUBLIC_VIEW],
    publicAccess: true,
  },

  // Reporting
  {
    methods: GET,
    pattern: /^\/api\/v1\/reports\/daily$/,
    permissions: [PERM_ANALYTICS_VIEW],
  },
  {
    methods: GET,
    pattern: /^\/api\/v1\/streamers\/[^/]+\/report$/,
    permissions: [PERM_ANALYTICS_VIEW],
  },
  {
    methods: ['POST'],
    pattern: /^\/api\/v1\/telegram\/send-report$/,
    permissions: [PERM_REPORTS_SEND],
  },

  // Donor-Radar: Schreibaktionen zuerst, sonst die Lese-Routen.
  {
    methods: ['POST'],
    pattern: /^\/api(?:\/v1)?\/donor-radar\/donors\/[^/]+\/(?:crm|toggle-vip)$/,
    permissions: [PERM_CRM_EDIT],
  },
  {
    methods: GET,
    pattern: /^\/api(?:\/v1)?\/donor-radar(?:\/|$)/,
    permissions: [PERM_RADAR_VIEW],
  },
  {
    methods: GET,
    pattern: /^\/api(?:\/v1)?\/chat-logs$/,
    permissions: [PERM_RADAR_VIEW],
  },

  // Chat-Intelligence: Export braucht zusätzlich das Export-Recht.
  {
    methods: GET,
    pattern: /^\/api(?:\/v1)?\/chat-intelligence\/export$/,
    permissions: [PERM_CHATINTEL_VIEW, PERM_EXPORT_DOWNLOAD],
  },
  {
    methods: GET,
    pattern: /^\/api(?:\/v1)?\/chat-intelligence(?:\/|$)/,
    permissions: [PERM_CHATINTEL_VIEW],
  },

  // Systemstatus (lesend) und Systemverwaltung (Demo-Daten).
  {
    methods: GET,
    pattern: /^\/api(?:\/v1)?\/system\/(?:status|health)$/,
    permissions: [PERM_SYSTEM_VIEW],
  },
  {
    methods: ['POST'],
    pattern: /^\/api\/demo\/(?:seed|clear)$/,
    permissions: [PERM_SYSTEM_MANAGE],
  },

  // Einstellungen, Nutzer und Telegram-Whitelist.
  {
    methods: ['GET', 'POST'],
    pattern: /^\/api\/settings$/,
    permissions: [PERM_SETTINGS_MANAGE],
  },
  {
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    pattern: /^\/api(?:\/v1)?\/telegram\/users(?:\/|$)/,
    permissions: [PERM_USERS_MANAGE],
  },

  // Revenue-Profile.
  {
    methods: ['GET', 'POST'],
    pattern: /^\/api\/revenue\/profiles(?:\/|$)/,
    permissions: [PERM_SETTINGS_MANAGE],
  },
  {
    methods: ['POST'],
    pattern: /^\/api\/revenue\/assign$/,
    permissions: [PERM_STREAMERS_MANAGE],
  },

  // Exporte.
  {
    methods: GET,
    pattern: /^\/api\/export\/(?:gifts|battles)\.csv$/,
    permissions: [PERM_EXPORT_DOWNLOAD],
  },

  // Streamer-Schreibaktionen (vor den Lese-Routen).
  {
    methods: ['POST', 'DELETE'],
    pattern: /^\/api(?:\/v1)?\/streamers(?:\/|$)/,
    permissions: [PERM_STREAMERS_MANAGE],
  },
  {
    methods: ['POST', 'PUT', 'DELETE'],
    pattern: /^\/api(?:\/v1)?\/streamer-groups(?:\/|$)/,
    permissions: [PERM_STREAMERS_MANAGE],
  },
  {
    methods: ['POST'],
    pattern: /^\/api(?:\/v1)?\/gifts$/,
    permissions: [PERM_GIFTS_BOOK],
  },

  // Analytics und Dashboard (lesend).
  {
    methods: GET,
    pattern: /^\/api(?:\/v1)?\/(?:overview|analytics|site-analytics)(?:\/|$)/,
    permissions: [PERM_ANALYTICS_VIEW],
  },
  {
    methods: GET,
    pattern: /^\/api(?:\/v1)?\/battles(?:\/|$)/,
    permissions: [PERM_ANALYTICS_VIEW],
  },
  {
    methods: GET,
    pattern: /^\/api(?:\/v1)?\/streamers\/[^/]+$/,
    permissions: [PERM_ANALYTICS_VIEW],
  },
  {
    methods: GET,
    pattern: /^\/api(?:\/v1)?\/streamer-groups(?:\/|$)/,
    permissions: [PERM_ANALYTICS_VIEW],
  },
];

export function resolveProxyPolicy(method: string, pathname: string): ProxyPolicy {
  const normalizedMethod = method.toUpperCase();
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

  // Auth- und Legacy-Mini-App-Endpunkte dürfen nie über den Proxy laufen.
  if (
    normalizedPath === '/api/auth' ||
    normalizedPath.startsWith('/api/auth/') ||
    normalizedPath === '/api/miniapp' ||
    normalizedPath.startsWith('/api/miniapp/')
  ) {
    return { allowed: false, reason: 'disabled' };
  }

  for (const rule of PROXY_RULES) {
    if (!rule.methods.includes(normalizedMethod)) continue;
    if (!rule.pattern.test(normalizedPath)) continue;
    return {
      allowed: true,
      permissions: rule.permissions,
      publicAccess: rule.publicAccess ?? false,
    };
  }

  return { allowed: false, reason: 'unknown' };
}
