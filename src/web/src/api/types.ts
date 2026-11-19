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

export interface TimelinePoint {
  bucket: string;
  label: string;
  coins: number;
  eur_net: number;
  usd_net: number;
  eur_gross?: number;
  usd_gross?: number;
  events_count: number;
  unique_gifters: number;
  avg_coins_per_gift?: number;
  avg_eur_per_gifter?: number;
}

export interface TimeOfDayPoint {
  hour: number;
  label: string;
  coins: number;
  eur_net: number;
  usd_net: number;
  events_count: number;
}

export interface AnalyticsTopGift {
  gift_id?: number;
  gift_name: string;
  diamond_count?: number;
  total_quantity?: number;
  total_coins: number;
  usd_net?: number;
  eur_net?: number;
  events_count?: number;
  pct_of_total?: number;
}

export interface AnalyticsGifter {
  rank: number;
  sender_username: string;
  sender_nickname?: string;
  is_super_fan?: boolean;
  total_coins: number;
  usd_net?: number;
  eur_net?: number;
  gifts_sent?: number;
  transactions?: number;
  pct_of_total?: number;
}

export interface StreamerRanking {
  id: number;
  username: string;
  display_name: string;
  avatar_url?: string;
  follower_count?: number;
  current_viewers?: number;
  is_live?: boolean;
  is_tracking?: boolean;
  total_coins: number;
  eur_net: number;
  usd_net: number;
  gift_events_count?: number;
  total_gifts_sent?: number;
  unique_gifters?: number;
  pct_of_total?: number;
}

export interface AnalyticsSession {
  id: number;
  streamer_id?: number;
  streamer_username?: string;
  streamer_display_name?: string;
  title?: string | null;
  started_at?: string;
  ended_at?: string;
  duration_minutes?: number;
  peak_viewers?: number;
  status?: string;
  session_coins?: number;
  eur_net?: number;
  usd_net?: number;
  session_gifts?: number;
  coins_per_hour?: number;
}

export interface AnalyticsData {
  period: string;
  group_id?: number | null;
  selected_streamer_id?: number | null;
  selected_streamer?: StreamerOverview | null;
  totals: {
    total_coins: number;
    eur_net: number;
    usd_net: number;
    eur_gross?: number;
    usd_gross?: number;
    total_gifts_sent: number;
    gift_events_count: number;
    unique_gifters: number;
    avg_coins_per_gift?: number;
    avg_coins_per_gifter?: number;
    avg_eur_per_gifter?: number;
    whale_share_top1_pct?: number;
    whale_share_top3_pct?: number;
    whale_share_top5_pct?: number;
    sessions_count?: number;
    total_stream_minutes?: number;
  };
  timeline: TimelinePoint[];
  multi_streamer_datasets?: Array<{
    streamer_id: number;
    username: string;
    display_name: string;
    data: number[];
  }>;
  time_of_day: TimeOfDayPoint[];
  top_gifts: AnalyticsTopGift[];
  top_gifters: AnalyticsGifter[];
  streamers_ranking: StreamerRanking[];
  sessions: AnalyticsSession[];
}

export interface ToktrackerSettings {
  usd_per_diamond?: number;
  gross_usd_per_coin?: number;
  usd_to_eur_rate?: number;
  currency_primary?: string;
  poll_interval_seconds?: number;
  api_key?: string;
  telegram_access_mode?: string;
  public_banner_enabled?: boolean;
  public_banner_title?: string;
  public_banner_text?: string;
  public_banner_style?: string;
  public_banner_btn_text?: string;
  public_banner_btn_url?: string;
  public_show_donors?: boolean;
  [key: string]: unknown;
}

export interface RevenueProfile {
  id: number;
  name: string;
  gross_region?: string;
  creator_region?: string;
  coin_price_usd?: number;
  creator_share_pct?: number;
  agency_share_pct?: number;
  payout_fee_pct?: number;
  tax_pct?: number;
  coin_price_uncertainty_pct?: number;
  creator_share_uncertainty_pct?: number;
  agency_share_max_pct?: number;
  tax_max_pct?: number;
  fx_rate?: number;
  fx_uncertainty_pct?: number;
  valid_from?: string;
  is_default?: number;
  [key: string]: unknown;
}

export interface RevenueStreamer {
  id: number;
  username: string;
  display_name?: string | null;
  revenue_profile_id?: number | null;
}

export interface RevenueProfilesResponse {
  profiles: RevenueProfile[];
  streamers: RevenueStreamer[];
}

export interface GiftCreateResponse {
  ok: boolean;
  created: boolean;
  event: RecentGift;
  [key: string]: unknown;
}

export interface PublicOverview {
  period: string;
  totals: DashboardTotals;
  streamers: StreamerOverview[];
  recent_gifts: RecentGift[];
  rates?: {
    usd_per_diamond?: number;
    gross_usd_per_coin?: number;
    usd_to_eur_rate?: number;
    [key: string]: unknown;
  };
  banner?: {
    enabled?: boolean;
    title?: string;
    text?: string;
    style?: string;
    btn_text?: string;
    btn_url?: string;
  } | null;
}

export interface LiveStreamer {
  id: number;
  username: string;
  display_name?: string;
  avatar_url?: string | null;
  is_live: boolean | number;
  is_tracking: boolean | number;
  auto_monitor: boolean | number;
  current_viewers?: number;
  last_seen_at?: string | null;
}

export interface LiveResponse {
  count: number;
  generated_at: string;
  streamers: LiveStreamer[];
}

export interface ReportTotals {
  streamers_count?: number;
  live_count?: number;
  period_coins?: number;
  period_eur_net?: number;
  period_usd_net?: number;
  period_eur_gross?: number;
  period_usd_gross?: number;
  period_gifts_sent?: number;
}

export interface ReportGiftStat {
  gift_name?: string;
  total_coins?: number;
  count?: number;
}

export interface ReportGifterStat {
  sender_username?: string;
  sender_nickname?: string;
  total_coins?: number;
}

export interface StreamerReportCard {
  streamer_id: number;
  username: string;
  display_name: string;
  is_live: boolean;
  is_tracking_active: boolean;
  worker_state: string;
  current_viewers: number;
  follower_count: number;
  period_hours: number;
  period_coins: number;
  period_gifts_sent: number;
  period_gift_events: number;
  period_unique_gifters: number;
  period_usd_net: number;
  period_eur_net: number;
  period_usd_gross: number;
  period_eur_gross: number;
  period_sessions_count: number;
  period_peak_viewers: number;
  alltime_coins: number;
  alltime_usd_net: number;
  alltime_eur_net: number;
  top_gifts?: ReportGiftStat[];
  top_gifters?: ReportGifterStat[];
  telegram_text?: string;
}

export interface DailyReport {
  generated_at: string;
  period_hours: number;
  cutoff_timestamp: string;
  currency_primary: string;
  totals: ReportTotals;
  streamers: StreamerReportCard[];
  telegram_markdown: string;
  telegram_html: string;
}

export interface PublicGiftBreakdownItem {
  gift_name?: string;
  diamond_count?: number;
  total_quantity?: number;
  total_coins?: number;
  usd_net?: number;
  eur_net?: number;
  events_count?: number;
}

export interface PublicGifter {
  sender_username?: string;
  sender_nickname?: string;
  is_super_fan?: boolean;
  total_coins?: number;
  gifts_sent?: number;
  eur_net?: number;
}

export interface PublicSession {
  id?: number;
  started_at?: string;
  ended_at?: string;
  status?: string;
  peak_viewers?: number;
  diamonds_collected?: number;
}

export interface PublicStreamerDetail {
  streamer: StreamerOverview;
  summary: Record<string, number | string | undefined>;
  gift_breakdown: PublicGiftBreakdownItem[];
  top_gifters: PublicGifter[];
  sessions: PublicSession[];
}

export interface SiteBotSession {
  id: number;
  session_type?: string;
  telegram_id?: number | null;
  username?: string | null;
  first_name?: string | null;
  client_ip_hash?: string;
  status?: string;
  details_json?: string;
  created_at?: string;
  last_active_at?: string;
}

export interface SiteChallenge {
  challenge_id?: string;
  created_at?: string;
  expires_at?: string;
  status?: string;
  attempts?: number;
  admin_label?: string;
  client_info?: string;
  code?: string;
}

export interface SiteTikTokWorker {
  id: number;
  username: string;
  display_name?: string;
  avatar_url?: string | null;
  is_live?: boolean | number;
  is_monitoring?: boolean;
  status?: string;
  connected_since?: string | null;
  total_diamonds?: number;
  gifts_received_session?: number;
  reconnect_count?: number;
  last_seen_live?: string | null;
  last_error?: string;
}

export interface TelegramDiagnostics {
  state?: string;
  bot_username?: string;
  access_mode?: string;
  allowed_users_count?: number;
  pending_users_count?: number;
  last_report_sent_at?: string;
  last_error?: string;
  has_token?: boolean;
  sdk_available?: boolean;
  group_support?: boolean;
  default_chat_id?: string | number | null;
  logs?: string[];
  [key: string]: unknown;
}

export interface SiteAnalyticsKpis {
  total_views?: number;
  unique_visitors?: number;
  avg_latency?: number;
  mobile_views?: number;
  desktop_views?: number;
  error_views?: number;
  [key: string]: unknown;
}

export interface SiteTimelinePoint {
  bucket: string;
  label: string;
  views?: number;
  visitors?: number;
  calls?: number;
  callers?: number;
  avg_ms?: number;
  errors?: number;
}

export interface SiteAnalytics {
  period: string;
  kpis: SiteAnalyticsKpis;
  timeline: SiteTimelinePoint[];
  paths: Array<{ path: string; views: number; visitors: number; avg_ms?: number }>;
  devices: Array<{ device: string; count: number; visitors: number }>;
  referrers: Array<{ referrer: string; count: number }>;
  recent_views: Array<{
    id: number;
    path: string;
    visitor_hash?: string;
    device_type?: string;
    referrer?: string;
    status_code?: number;
    response_time_ms?: number;
    created_at?: string;
  }>;
  bot_sessions: SiteBotSession[];
  telegram_users?: TelegramUser[];
  api_analytics?: ApiAnalytics;
  tiktok_workers?: SiteTikTokWorker[];
  recent_challenges?: SiteChallenge[];
  telegram_diagnostics?: TelegramDiagnostics;
}

export interface ApiAnalyticsKpis {
  total_calls?: number;
  unique_callers?: number;
  avg_latency?: number;
  status_2xx?: number;
  status_4xx?: number;
  status_5xx?: number;
  error_calls?: number;
  error_rate_pct?: number;
  auth_breakdown?: Record<string, number>;
  [key: string]: unknown;
}

export interface ApiAnalytics {
  period: string;
  only_external?: boolean;
  kpis: ApiAnalyticsKpis;
  timeline: SiteTimelinePoint[];
  endpoints: Array<{
    endpoint: string;
    method: string;
    count: number;
    unique_callers?: number;
    avg_ms?: number;
    errors?: number;
  }>;
  consumers: Array<{
    ip_hash?: string;
    user_agent?: string;
    auth_type?: string;
    api_key_name?: string;
    call_count: number;
    last_seen?: string;
    avg_ms?: number;
    error_count?: number;
  }>;
  recent_calls: Array<{
    id: number;
    endpoint: string;
    method: string;
    status_code?: number;
    response_time_ms?: number;
    client_ip_masked?: string;
    ip_hash?: string;
    user_agent?: string;
    auth_type?: string;
    api_key_name?: string;
    is_external?: boolean;
    query_params?: string;
    created_at?: string;
  }>;
}

export interface ChatSession {
  id: number;
  streamer_id?: number;
  room_id?: string | null;
  title?: string | null;
  started_at?: string;
  ended_at?: string;
  peak_viewers?: number;
  last_fan_tickets?: number;
  status?: string;
  streamer_username?: string;
  streamer_display_name?: string;
  streamer_avatar_url?: string | null;
  chat_count?: number;
}

export interface ChatSessionsResponse {
  ok: boolean;
  sessions: ChatSession[];
  count: number;
}

export interface ChatAnalysis {
  total_messages: number;
  unique_chatters: number;
  whale_messages: number;
  avg_chars_per_msg: number;
  chatter_diversity_pct: number;
  words: Array<{ text: string; count: number; weight?: number }>;
  phrases: Array<{ phrase: string; count: number; pct?: number; words?: number }>;
  emojis: Array<{ emoji: string; count: number; pct?: number }>;
  top_chatters: Array<{
    username: string;
    nickname?: string;
    avatar_url?: string | null;
    is_whale?: boolean;
    whale_tier?: string;
    count: number;
    pct?: number;
  }>;
}

export interface ChatAnalysisResponse {
  ok: boolean;
  data: ChatAnalysis;
}

export interface ChatMessage {
  id: number;
  streamer_id?: number;
  session_id?: number;
  user_id?: string;
  username?: string;
  nickname?: string;
  avatar_url?: string | null;
  comment?: string;
  is_whale?: boolean;
  whale_tier?: string;
  created_at?: string;
  streamer_username?: string;
  streamer_display_name?: string;
}

export interface ChatLogsResponse {
  ok: boolean;
  messages: ChatMessage[];
  count: number;
  total?: number;
  limit?: number;
  offset?: number;
}

export interface RadarDonor {
  uname_key?: string;
  username: string;
  display_name?: string;
  total_coins: number;
  total_eur_net: number;
  total_usd_net?: number;
  total_eur_gross?: number;
  total_usd_gross?: number;
  total_gifts?: number;
  streamer_count?: number;
  first_seen?: string;
  last_seen?: string;
  is_vip: boolean;
  tags: string[];
  notes?: string;
  has_notes?: boolean;
  tier?: string;
  is_cross_streamer?: boolean;
  [key: string]: unknown;
}

export interface RadarKpis {
  whales?: number;
  sharks?: number;
  dolphins?: number;
  cross_streamer_whales?: number;
  total_tracked_whales?: number;
  whale_coins?: number;
  whale_eur_net?: number;
  total_chat_messages?: number;
  vip_donors?: number;
  [key: string]: unknown;
}

export interface RadarResponse {
  ok: boolean;
  data: {
    period: string;
    kpis: RadarKpis;
    donors: RadarDonor[];
    streamers: Array<{
      id: number;
      username: string;
      display_name?: string;
      avatar_url?: string | null;
      is_live?: boolean | number;
    }>;
  };
}

export interface RadarDonorDetail {
  ok: boolean;
  data: {
    profile: RadarDonor & {
      avatar_url?: string | null;
      is_cross_streamer?: boolean;
    };
    streamers: Array<{
      streamer_id: number;
      streamer_username: string;
      streamer_display_name?: string;
      streamer_avatar_url?: string | null;
      coins_given?: number;
      eur_net?: number;
      gift_count?: number;
      last_gift_at?: string;
    }>;
    top_gifts: Array<{
      gift_name: string;
      gift_icon_url?: string | null;
      total_sent?: number;
      total_coins?: number;
    }>;
    recent_chats: Array<{
      id: number;
      streamer_id?: number;
      comment?: string;
      created_at?: string;
      streamer_username?: string;
      streamer_display_name?: string;
    }>;
    crm: {
      id?: number;
      username?: string;
      is_vip?: boolean;
      tags?: string[];
      notes?: string;
      created_at?: string;
      updated_at?: string;
    };
    loyalty?: {
      score?: number;
      tier?: string;
      label?: string;
      badge?: string;
      color?: string;
      primary_streamer?: string;
      primary_streamer_display?: string;
      primary_coins?: number;
      streamer_count?: number;
    };
    frontenwechsel?: {
      is_shifted?: boolean;
      status_label?: string;
      description?: string;
      from_streamer?: Record<string, unknown>;
      to_streamer?: Record<string, unknown>;
    };
  };
}

export interface Frontenwechsler {
  username: string;
  display_name?: string;
  avatar_url?: string | null;
  is_vip?: boolean;
  tier?: string;
  tags?: string[];
  total_coins?: number;
  total_net_eur?: number;
  loyalty_score?: number;
  classification?: string;
  label?: string;
  color?: string;
  recent_share_percent?: number;
  shift_volume_coins?: number;
  shift_volume_eur?: number;
  migration_type?: string;
  frontenwechsel?: {
    shifted?: boolean;
    old_streamer?: string;
    old_streamer_display?: string;
    new_streamer?: string;
    new_streamer_display?: string;
    old_coins?: number;
    new_coins?: number;
    shift_ratio?: number;
  };
  from_streamer?: Record<string, unknown>;
  to_streamer?: Record<string, unknown>;
}

export interface OverlapSharedDonor {
  username?: string;
  display_name?: string;
  total_coins?: number;
  coins?: number;
  is_vip?: boolean;
  tier?: string;
}

export interface OverlapEntry {
  s1_id?: number;
  s2_id?: number;
  streamer_a_username?: string;
  streamer_a_display_name?: string;
  streamer_a_avatar?: string;
  streamer_b_username?: string;
  streamer_b_display_name?: string;
  streamer_b_avatar?: string;
  shared_donors_count?: number;
  total_coins_a?: number;
  total_coins_b?: number;
  total_shared_coins?: number;
  streamer_a_pct?: number;
  streamer_b_pct?: number;
  shared_volume_eur?: number;
  top_donors?: OverlapSharedDonor[];
  top_shared_donors?: OverlapSharedDonor[];
  [key: string]: unknown;
}

export interface LoyaltyOverlapResponse {
  ok: boolean;
  data: {
    frontenwechsler: Frontenwechsler[];
    overlap_matrix: OverlapEntry[];
    days_recent: number;
    summary: Record<string, unknown>;
  };
}

export interface WhaleAlert {
  id: number;
  username?: string;
  nickname?: string;
  streamer_username?: string;
  streamer_display_name?: string;
  streamer_avatar_url?: string | null;
  gift_name?: string;
  total_coins?: number;
  eur_net?: number;
  created_at?: string;
  is_vip?: boolean;
  tags?: string[];
  tier?: string;
  [key: string]: unknown;
}

export interface WhaleAlertsResponse {
  ok: boolean;
  alerts: WhaleAlert[];
}

export interface BattleRow {
  id: number;
  battle_id?: string;
  battle_mode?: string;
  streamer_username?: string;
  streamer_display_name?: string;
  streamer_avatar_url?: string;
  streamer_score?: number;
  teammate_username?: string | null;
  opponent_username?: string | null;
  opponent_display_name?: string | null;
  opponent_score?: number;
  opponent2_username?: string | null;
  opponent3_username?: string | null;
  result?: string;
  status?: string;
  coins_earned?: number;
  eur_net?: number;
  usd_net?: number;
  started_at?: string;
  ended_at?: string;
  duration_seconds?: number;
  is_internal?: boolean;
  is_ffa?: boolean;
  streamer_a?: {
    username?: string;
    display_name?: string;
    score?: number;
    result?: string;
    eur_net?: number;
  };
  streamer_b?: {
    username?: string;
    display_name?: string;
    score?: number;
    result?: string;
    eur_net?: number;
  };
  participants?: Array<{
    username?: string;
    display_name?: string;
    score?: number;
    rank?: number;
    eur_net?: number;
  }>;
  winner_username?: string;
  total_coins?: number;
  total_eur_net?: number;
  [key: string]: unknown;
}

export interface LiveBattleEntry {
  streamer_id: number;
  username: string;
  display_name?: string;
  avatar_url?: string | null;
  is_internal?: boolean;
  battle?: BattleRow;
}

export interface BattlesResponse {
  total: number;
  limit: number;
  offset: number;
  battles: BattleRow[];
  live_active_battles: LiveBattleEntry[];
}

export interface BattleRival {
  opponent_username: string;
  opponent_display_name?: string;
  opponent_avatar_url?: string;
  matches_count: number;
  wins: number;
  losses: number;
  draws: number;
  winrate_pct: number;
  total_coins?: number;
  total_eur_net?: number;
  avg_streamer_score?: number;
  avg_opponent_score?: number;
}

export interface BattleStats {
  total_battles: number;
  wins: number;
  losses: number;
  draws: number;
  ongoing: number;
  winrate_pct: number;
  total_coins: number;
  total_eur_net: number;
  max_streamer_score?: number;
  top_opponent?: BattleRival | null;
  rivals: BattleRival[];
}

export interface BattleDetail extends BattleRow {
  gifts?: RecentGift[];
  partner_battle?: BattleRow | null;
}

export interface HostMetric {
  total_gb?: number;
  used_gb?: number;
  free_gb?: number;
  percent?: number;
  status?: string;
  total_mb?: number;
  used_mb?: number;
  free_mb?: number;
  cores?: number;
}

export interface DockerContainer {
  id?: string;
  name?: string;
  display_name?: string;
  image?: string;
  state?: string;
  status?: string;
  is_healthy?: boolean;
  is_running?: boolean;
  size_rw_mb?: number;
  size_root_fs_mb?: number;
  memory_used_mb?: number;
  memory_limit_mb?: number;
  memory_percent?: number;
  cpu_percent?: number;
  [key: string]: unknown;
}

export interface SystemHealth {
  timestamp?: string;
  host?: {
    disk?: HostMetric;
    memory?: HostMetric;
    cpu?: HostMetric;
  };
  database?: {
    engine?: string;
    database_name?: string;
    total_mb?: number;
    data_mb?: number;
    index_mb?: number;
    table_count?: number;
  };
  docker?: {
    available?: boolean;
    error?: string;
    api_endpoint?: string;
    containers?: DockerContainer[];
    volumes?: Array<Record<string, unknown>>;
    total_volumes_mb?: number;
    total_images_mb?: number;
  };
  alerts?: Array<{ type?: string; level?: string; message?: string }>;
  is_healthy?: boolean;
}

export interface SystemStatus {
  tiktoklive_available?: boolean;
  env_config?: Record<string, unknown>;
  workers_total?: number;
  workers_running?: number;
  workers_connected?: number;
  workers_stalled?: number;
  workers?: Array<Record<string, unknown>>;
  telegram_bot?: Record<string, unknown>;
  system_health?: SystemHealth;
  [key: string]: unknown;
}

export interface TelegramUser {
  id: number;
  telegram_id?: number | null;
  username?: string | null;
  first_name?: string | null;
  role: Role;
  is_allowed: number;
  note?: string | null;
  permission_grants?: string[];
  permission_denies?: string[];
  effective_permissions?: string[];
  created_at?: string;
  last_seen_at?: string;
  [key: string]: unknown;
}

export interface TelegramUsersResponse {
  access_mode: string;
  users: TelegramUser[];
}

export interface TelegramPermissionMeta {
  key: string;
  label: string;
  scope: string;
}

export interface TelegramPermissionsResponse {
  user: TelegramUser;
  role: Role;
  role_permissions: string[];
  grants: string[];
  denies: string[];
  effective_permissions: string[];
  permissions: TelegramPermissionMeta[];
}

export interface StreamerGroup {
  id: number;
  name: string;
  description: string;
  color: string;
  streamer_ids: number[];
  member_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface GroupsResponse {
  ok: boolean;
  count: number;
  groups: StreamerGroup[];
}

export interface GiftCatalogItem {
  id: number;
  name: string;
  diamonds: number;
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
  gift_catalog?: GiftCatalogItem[];
  revenue_profiles?: unknown[];
  [key: string]: unknown;
}
