-- V4 REFERENCE SQL ONLY. DO NOT RUN AS-IS IN PRODUCTION.
-- Requires existing game_users(id UUID) + shop_items(id VARCHAR(48)) from V3 reference.
-- Inspect actual Codex repo schema; convert into reviewed migrations, permissions and rollback plan.
-- Types kept TEXT + CHECK for portability. UTC timestamps; display localized in Asia/Ho_Chi_Minh.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Staff roles: independent from legacy admin_user_roles; migrate existing role grants intentionally.
CREATE TABLE IF NOT EXISTS game_role_grants (
  user_id UUID NOT NULL REFERENCES game_users(id),
  role_key VARCHAR(32) NOT NULL CHECK (role_key IN ('PLAYER','MODERATOR','CONTENT_EDITOR','ADMIN','SUPER_ADMIN')),
  granted_by UUID REFERENCES game_users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, role_key)
);

-- CMS staging, validation, publication and rollback pointers.
CREATE TABLE IF NOT EXISTS catalog_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type VARCHAR(32) NOT NULL CHECK (content_type IN ('shop_item','npc','quest','action','scene','event','config')),
  stable_content_id VARCHAR(96) NOT NULL,
  payload JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK(version > 0),
  status VARCHAR(24) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','validated','published','archived')),
  last_validation JSONB,
  created_by UUID NOT NULL REFERENCES game_users(id),
  updated_by UUID REFERENCES game_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_catalog_drafts_search ON catalog_drafts(content_type, stable_content_id, updated_at DESC);
CREATE TABLE IF NOT EXISTS catalog_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES catalog_drafts(id),
  content_type VARCHAR(32) NOT NULL,
  stable_content_id VARCHAR(96) NOT NULL,
  revision_no INTEGER NOT NULL CHECK(revision_no>0),
  snapshot JSONB NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_by UUID NOT NULL REFERENCES game_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rolled_back_at TIMESTAMPTZ,
  UNIQUE(content_type,stable_content_id,revision_no)
);
CREATE INDEX IF NOT EXISTS ix_catalog_public_current ON catalog_publications(content_type,stable_content_id,effective_at DESC);

-- Asset mapping for wardrobe; archive item without removing owned player inventory.
CREATE TABLE IF NOT EXISTS wardrobe_asset_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id VARCHAR(48) NOT NULL REFERENCES shop_items(id),
  rig_type VARCHAR(16) NOT NULL CHECK(rig_type IN ('male','female','unisex')),
  pose_key VARCHAR(32) NOT NULL,
  direction VARCHAR(8) NOT NULL CHECK(direction IN ('up','down','left','right')),
  asset_uri TEXT NOT NULL,
  asset_checksum VARCHAR(128) NOT NULL,
  anchor_x NUMERIC(7,3) NOT NULL,
  anchor_y NUMERIC(7,3) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(item_id,rig_type,pose_key,direction)
);

-- Chat rooms and messages. seq globally increasing works as order cursor per room.
CREATE TABLE IF NOT EXISTS chat_rooms (
  id VARCHAR(64) PRIMARY KEY,
  kind VARCHAR(16) NOT NULL CHECK(kind IN ('global','scene','system')),
  display_name VARCHAR(96) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seq BIGSERIAL UNIQUE,
  room_id VARCHAR(64) NOT NULL REFERENCES chat_rooms(id),
  sender_user_id UUID NOT NULL REFERENCES game_users(id),
  client_request_id UUID NOT NULL,
  body_text VARCHAR(512) NOT NULL,
  status VARCHAR(16) NOT NULL CHECK(status IN ('published','held','hidden','rejected')),
  rule_version VARCHAR(32),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  hidden_at TIMESTAMPTZ,
  UNIQUE(sender_user_id, client_request_id)
);
CREATE INDEX IF NOT EXISTS ix_chat_room_seq ON chat_messages(room_id,seq DESC);
CREATE INDEX IF NOT EXISTS ix_chat_user_recent ON chat_messages(sender_user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS chat_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id),
  reporter_user_id UUID NOT NULL REFERENCES game_users(id),
  reason_code VARCHAR(32) NOT NULL CHECK(reason_code IN ('spam','harassment','profanity','privacy','other')),
  detail TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'open' CHECK(status IN ('open','under_review','dismissed','resolved')),
  reviewer_user_id UUID REFERENCES game_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  UNIQUE(message_id,reporter_user_id)
);
CREATE INDEX IF NOT EXISTS ix_chat_reports_open ON chat_reports(status,created_at DESC);
CREATE TABLE IF NOT EXISTS chat_sanctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID NOT NULL REFERENCES game_users(id),
  scope VARCHAR(16) NOT NULL CHECK(scope IN ('CHAT','ACCOUNT')),
  action VARCHAR(16) NOT NULL CHECK(action IN ('WARN','MUTE','BAN')),
  reason_code VARCHAR(48) NOT NULL,
  reason_text TEXT,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_by UUID REFERENCES game_users(id),
  revoked_by UUID REFERENCES game_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK(ends_at IS NULL OR ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS ix_chat_sanctions_active ON chat_sanctions(target_user_id,scope,starts_at DESC) WHERE revoked_at IS NULL;
CREATE TABLE IF NOT EXISTS chat_moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES chat_messages(id),
  sanction_id UUID REFERENCES chat_sanctions(id),
  admin_user_id UUID NOT NULL REFERENCES game_users(id),
  action_code VARCHAR(48) NOT NULL,
  reason TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS chat_appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES game_users(id),
  sanction_id UUID NOT NULL REFERENCES chat_sanctions(id),
  statement TEXT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'open' CHECK(status IN ('open','accepted','rejected')),
  reviewed_by UUID REFERENCES game_users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ambient NPC configurations only, actual living NPC state is ephemeral server/Redis.
CREATE TABLE IF NOT EXISTS ambient_scene_configs (
  scene_id VARCHAR(48) PRIMARY KEY,
  target_visual_actors INTEGER NOT NULL DEFAULT 16 CHECK(target_visual_actors BETWEEN 0 AND 300),
  ambient_min INTEGER NOT NULL DEFAULT 0 CHECK(ambient_min>=0),
  ambient_max INTEGER NOT NULL DEFAULT 18 CHECK(ambient_max>=0),
  scene_render_cap INTEGER NOT NULL DEFAULT 32 CHECK(scene_render_cap BETWEEN 1 AND 300),
  spawn_rate_per_second NUMERIC(5,2) NOT NULL DEFAULT 1 CHECK(spawn_rate_per_second>0),
  release_delay_seconds INTEGER NOT NULL DEFAULT 5 CHECK(release_delay_seconds BETWEEN 0 AND 120),
  waypoints JSONB NOT NULL DEFAULT '[]'::jsonb,
  schedules JSONB NOT NULL DEFAULT '[]'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by UUID REFERENCES game_users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK(ambient_min<=ambient_max),
  CHECK(ambient_max<=scene_render_cap)
);

-- Live sessions and deduplicated provider comments.
CREATE TABLE IF NOT EXISTS live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(32) NOT NULL,
  owner_user_id UUID NOT NULL REFERENCES game_users(id),
  status VARCHAR(16) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','running','paused','stopped','failed')),
  scene_id VARCHAR(48) NOT NULL,
  active_keyword VARCHAR(32) NOT NULL DEFAULT 'VAO',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS live_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_session_id UUID NOT NULL REFERENCES live_sessions(id),
  provider VARCHAR(32) NOT NULL,
  provider_event_id VARCHAR(255) NOT NULL,
  viewer_key_hash VARCHAR(128),
  public_display_name VARCHAR(36),
  event_type VARCHAR(24) NOT NULL CHECK(event_type IN ('comment','system')),
  keyword VARCHAR(32),
  acceptance_state VARCHAR(16) NOT NULL CHECK(acceptance_state IN ('accepted','rejected','queued','consumed','expired')),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(live_session_id,provider,provider_event_id)
);
CREATE INDEX IF NOT EXISTS ix_live_events_session_time ON live_events(live_session_id,received_at DESC);
CREATE TABLE IF NOT EXISTS live_guest_appearances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL UNIQUE REFERENCES live_events(id),
  actor_id VARCHAR(128) NOT NULL UNIQUE,
  sprite_id VARCHAR(64) NOT NULL,
  action_key VARCHAR(32) NOT NULL,
  scene_id VARCHAR(48) NOT NULL,
  spawned_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  state VARCHAR(16) NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','visible','finished','dropped')),
  CHECK(expires_at IS NULL OR spawned_at IS NULL OR expires_at>spawned_at)
);
CREATE TABLE IF NOT EXISTS live_campaign_progress (
  live_session_id UUID PRIMARY KEY REFERENCES live_sessions(id),
  progress_count INTEGER NOT NULL DEFAULT 0 CHECK(progress_count>=0),
  goal_count INTEGER NOT NULL DEFAULT 100 CHECK(goal_count>0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Feature flags: real money / external integration disabled until approved.
CREATE TABLE IF NOT EXISTS game_feature_flags (
  key VARCHAR(64) PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  changed_by UUID REFERENCES game_users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO game_feature_flags(key, enabled) VALUES
 ('TIKTOK_PROVIDER_ENABLED',FALSE),('REAL_DONATION_QR_ENABLED',FALSE),('CHAT_ENABLED',FALSE)
ON CONFLICT (key) DO NOTHING;

-- ADMIN dashboard must not be a normal public view. RBAC enforcement is application/DB policy.
-- Add appropriate foreign keys, row-level policies/grants, retention jobs after mapping actual schema.
-- Do not grant SELECT on chat moderation/raw live data / admin counts to public DB clients.
