export type Role = 'viewer' | 'user' | 'moderator' | 'admin';

export interface PublicUser {
  id: string;
  username: string;
  role: Role;
  grants: string[];
  denies: string[];
  disabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface AuthPayload {
  user: PublicUser;
  permissions: string[];
  roles: Role[];
  roleLabels: Record<Role, string>;
  permissionLabels: Record<string, string>;
  allPermissions: string[];
}

export interface DashboardTotals {
  streamer_count?: number;
  live_count?: number;
  tracking_count?: number;
  total_coins?: number;
  usd_net?: number;
  eur_net?: number;
  usd_gross?: number;
  eur_gross?: number;
  usd_net_low?: number;
  usd_net_high?: number;
  eur_net_low?: number;
  eur_net_high?: number;
  total_gifts_sent?: number;
  gift_events_count?: number;
}

export interface TopGift {
  gift_name?: string;
  coins?: number;
  count?: number;
}

export interface TopGifter {
  sender_username?: string;
  sender_nickname?: string;
  coins?: number;
}

export interface StreamerOverview {
  id: number;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
  is_live?: number | boolean;
  is_tracking?: number | boolean;
  is_tracking_active?: boolean;
  monitor_status?: string | null;
  total_coins?: number;
  usd_net?: number;
  eur_net?: number;
  usd_gross?: number;
  eur_gross?: number;
  unique_gifters?: number;
  total_gifts_sent?: number;
  gift_events_count?: number;
  top_gift?: TopGift | null;
  top_gifter?: TopGifter | null;
  follower_count?: number | null;
  current_viewers?: number | null;
  peak_viewers?: number | null;
  total_diamonds?: number | null;
  last_seen_live?: string | null;
  worker_diagnostics?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface RecentGift {
  id: number;
  streamer_id?: number;
  streamer_username?: string;
  streamer_display_name?: string;
  gift_name?: string;
  diamond_count?: number;
  repeat_count?: number;
  total_coins?: number;
  usd_net?: number;
  eur_net?: number;
  usd_gross?: number;
  eur_gross?: number;
  sender_username?: string;
  sender_nickname?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface SystemDiagnostics {
  tiktoklive_available?: boolean;
  workers_total?: number;
  workers_running?: number;
  workers_connected?: number;
  workers_stalled?: number;
  telegram_bot?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface DashboardOverview {
  period: string;
  group_id?: number | null;
  selected_group?: Record<string, unknown> | null;
  settings?: Record<string, unknown>;
  totals: DashboardTotals;
  streamers: StreamerOverview[];
  recent_gifts: RecentGift[];
  telegram_users?: unknown[];
  system?: SystemDiagnostics;
  gift_catalog?: unknown[];
  revenue_profiles?: unknown[];
  [key: string]: unknown;
}
