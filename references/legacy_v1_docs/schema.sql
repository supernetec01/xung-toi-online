-- GIAO XU AN HOA: PostgreSQL 15+ reference schema (MVP, production-oriented)
-- Use managed Auth / secure backend for password handling; NEVER store plaintext passwords.
-- Sensitive religious confession content is deliberately outside this database.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_subject text UNIQUE NOT NULL,
  display_name varchar(32) NOT NULL,
  avatar_key varchar(64) NOT NULL DEFAULT 'avatar_01',
  app_role varchar(16) NOT NULL DEFAULT 'player' CHECK (app_role IN ('player','moderator','admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE game_scenes (
  id varchar(64) PRIMARY KEY,
  name_vi varchar(120) NOT NULL,
  scene_type varchar(24) NOT NULL CHECK(scene_type IN ('exterior','interior')),
  design_width int NOT NULL DEFAULT 1150,
  design_height int NOT NULL DEFAULT 670,
  map_asset_path text,
  tilemap_path text,
  walkable_regions jsonb NOT NULL DEFAULT '[]'::jsonb,
  spawn_points jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE scene_objects (
  id varchar(80) PRIMARY KEY,
  scene_id varchar(64) NOT NULL REFERENCES game_scenes(id),
  object_type varchar(32) NOT NULL CHECK(object_type IN ('portal','hotspot','seat','decoration','prop','npc_spawner')),
  label_vi varchar(140) NOT NULL,
  pos_x numeric(7,3) NOT NULL CHECK(pos_x BETWEEN 0 AND 100),
  pos_y numeric(7,3) NOT NULL CHECK(pos_y BETWEEN 0 AND 100),
  action_code varchar(64),
  destination_scene_id varchar(64) REFERENCES game_scenes(id),
  collision_shape jsonb NOT NULL DEFAULT '{}'::jsonb,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true
);
CREATE INDEX idx_scene_objects_scene ON scene_objects(scene_id);

CREATE TABLE npcs (
  id varchar(60) PRIMARY KEY,
  display_name varchar(90) NOT NULL,
  description_vi text,
  sprite_key varchar(90) NOT NULL,
  default_scene_id varchar(64) REFERENCES game_scenes(id),
  default_pos_x numeric(7,3),
  default_pos_y numeric(7,3),
  active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE npc_schedules (
  id bigserial PRIMARY KEY,
  npc_id varchar(60) NOT NULL REFERENCES npcs(id),
  scene_id varchar(64) NOT NULL REFERENCES game_scenes(id),
  day_of_week int CHECK(day_of_week BETWEEN 0 AND 6),
  start_minute int NOT NULL CHECK(start_minute BETWEEN 0 AND 1439),
  end_minute int NOT NULL CHECK(end_minute BETWEEN 1 AND 1440),
  pos_x numeric(7,3) NOT NULL,
  pos_y numeric(7,3) NOT NULL,
  CHECK(start_minute < end_minute)
);
CREATE TABLE npc_dialogue_nodes (
  id varchar(90) PRIMARY KEY,
  npc_id varchar(60) NOT NULL REFERENCES npcs(id),
  speaker varchar(90) NOT NULL,
  line_vi text NOT NULL,
  response_options jsonb NOT NULL DEFAULT '[]'::jsonb,
  condition_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  event_on_visit varchar(64),
  sort_order int NOT NULL DEFAULT 0
);

CREATE TABLE quest_definitions (
  id varchar(80) PRIMARY KEY,
  title_vi varchar(160) NOT NULL,
  description_vi text NOT NULL,
  giver_npc_id varchar(60) REFERENCES npcs(id),
  category varchar(24) NOT NULL CHECK(category IN ('story','side','daily','seasonal','tutorial')),
  min_level int NOT NULL DEFAULT 1 CHECK(min_level>=1),
  is_repeatable boolean NOT NULL DEFAULT false,
  cooldown_hours int NOT NULL DEFAULT 0 CHECK(cooldown_hours>=0),
  reward_xp int NOT NULL DEFAULT 0 CHECK(reward_xp>=0),
  reward_coins int NOT NULL DEFAULT 0 CHECK(reward_coins>=0),
  reward_kindness int NOT NULL DEFAULT 0 CHECK(reward_kindness>=0),
  enabled boolean NOT NULL DEFAULT true,
  version int NOT NULL DEFAULT 1,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE quest_requirements (
  quest_id varchar(80) NOT NULL REFERENCES quest_definitions(id) ON DELETE CASCADE,
  required_quest_id varchar(80) NOT NULL REFERENCES quest_definitions(id),
  PRIMARY KEY(quest_id,required_quest_id),
  CHECK (quest_id<>required_quest_id)
);
CREATE TABLE quest_steps (
  id varchar(100) PRIMARY KEY,
  quest_id varchar(80) NOT NULL REFERENCES quest_definitions(id) ON DELETE CASCADE,
  seq int NOT NULL CHECK(seq>=1),
  event_code varchar(64) NOT NULL,
  needed_count int NOT NULL DEFAULT 1 CHECK(needed_count>0),
  label_vi varchar(180) NOT NULL,
  target_scene_id varchar(64) REFERENCES game_scenes(id),
  target_object_id varchar(80) REFERENCES scene_objects(id),
  UNIQUE(quest_id,seq)
);

CREATE TABLE player_profiles (
  user_id uuid PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  xp bigint NOT NULL DEFAULT 0 CHECK(xp>=0),
  last_scene_id varchar(64) REFERENCES game_scenes(id),
  pos_x numeric(7,3) NOT NULL DEFAULT 51,
  pos_y numeric(7,3) NOT NULL DEFAULT 79,
  story_route varchar(24) NOT NULL DEFAULT 'visitor' CHECK(story_route IN('visitor','learning','community')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE player_wallets (
  user_id uuid PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  coins bigint NOT NULL DEFAULT 0 CHECK(coins>=0),
  kindness bigint NOT NULL DEFAULT 0 CHECK(kindness>=0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Wallet changes MUST be server-side within a transaction.
CREATE TABLE reward_ledger (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  currency varchar(16) NOT NULL CHECK(currency IN('coins','kindness','xp')),
  delta bigint NOT NULL,
  reason_code varchar(40) NOT NULL CHECK(reason_code IN('quest_claim','shop_purchase','admin_adjustment','event_award')),
  source_key varchar(150) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,currency,source_key)
);
CREATE INDEX idx_reward_ledger_user_date ON reward_ledger(user_id,created_at DESC);

-- cycle_key: 'once' for story quests, 'YYYY-MM-DD@Asia/Ho_Chi_Minh' for daily,
-- 'eventId' for seasonal. Decide and enforce on SERVER.
CREATE TABLE player_quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  quest_id varchar(80) NOT NULL REFERENCES quest_definitions(id),
  quest_version int NOT NULL,
  cycle_key varchar(100) NOT NULL DEFAULT 'once',
  status varchar(16) NOT NULL CHECK(status IN('active','ready','claimed','abandoned')),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ready_at timestamptz,
  claimed_at timestamptz,
  UNIQUE(user_id,quest_id,cycle_key)
);
CREATE INDEX idx_player_quests_user_status ON player_quests(user_id,status);
CREATE TABLE player_quest_progress (
  player_quest_id uuid NOT NULL REFERENCES player_quests(id) ON DELETE CASCADE,
  step_id varchar(100) NOT NULL REFERENCES quest_steps(id),
  completed_count int NOT NULL DEFAULT 0 CHECK(completed_count>=0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(player_quest_id,step_id)
);

CREATE TABLE player_action_events (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  client_event_id uuid NOT NULL,
  event_code varchar(64) NOT NULL,
  scene_id varchar(64) REFERENCES game_scenes(id),
  object_id varchar(80) REFERENCES scene_objects(id),
  server_time timestamptz NOT NULL DEFAULT now(),
  safe_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(user_id,client_event_id)
);
CREATE INDEX idx_action_events_user_time ON player_action_events(user_id,server_time DESC);

CREATE TABLE shop_items (
  id varchar(80) PRIMARY KEY,
  name_vi varchar(120) NOT NULL,
  slot varchar(24) NOT NULL CHECK(slot IN('outfit','hair','accessory','emote','furniture')),
  sprite_key varchar(120) NOT NULL,
  icon varchar(20),
  min_level int NOT NULL DEFAULT 1 CHECK(min_level>=1),
  price_coins int NOT NULL DEFAULT 0 CHECK(price_coins>=0),
  price_kindness int NOT NULL DEFAULT 0 CHECK(price_kindness>=0),
  seasonal_event_id varchar(64),
  is_sacred_object boolean NOT NULL DEFAULT false CHECK(is_sacred_object=false),
  enabled boolean NOT NULL DEFAULT true
);
CREATE TABLE player_inventory (
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  item_id varchar(80) NOT NULL REFERENCES shop_items(id),
  acquired_at timestamptz NOT NULL DEFAULT now(),
  acquire_source varchar(32) NOT NULL DEFAULT 'quest',
  PRIMARY KEY(user_id,item_id)
);
CREATE TABLE player_equipment (
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  slot varchar(24) NOT NULL,
  item_id varchar(80) NOT NULL REFERENCES shop_items(id),
  equipped_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,slot),
  FOREIGN KEY(user_id,item_id) REFERENCES player_inventory(user_id,item_id)
);

-- Generic interaction cooldown: prevents repeating an object indefinitely for rewards.
CREATE TABLE player_object_actions (
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  object_id varchar(80) NOT NULL REFERENCES scene_objects(id),
  cycle_key varchar(100) NOT NULL,
  action_code varchar(64) NOT NULL,
  performed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,object_id,cycle_key,action_code)
);
-- For multiplayer: occupancy has time-to-live and must be leased / expired by server.
CREATE TABLE seat_occupancy (
  scene_instance_id varchar(90) NOT NULL,
  seat_object_id varchar(80) NOT NULL REFERENCES scene_objects(id),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY(scene_instance_id,seat_object_id),
  UNIQUE(scene_instance_id,user_id)
);
CREATE TABLE seasonal_events (
  id varchar(64) PRIMARY KEY,
  name_vi varchar(160) NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  CHECK(starts_at<ends_at)
);
CREATE TABLE player_event_decorations (
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  event_id varchar(64) NOT NULL REFERENCES seasonal_events(id),
  object_id varchar(80) NOT NULL REFERENCES scene_objects(id),
  placed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,event_id,object_id)
);
CREATE TABLE admin_content_audit (
  id bigserial PRIMARY KEY,
  actor_user_id uuid REFERENCES app_users(id),
  action varchar(80) NOT NULL,
  entity_type varchar(50) NOT NULL,
  entity_id varchar(100) NOT NULL,
  patch_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Application security notes:
-- 1. Client must not directly UPDATE balances / xp / quest claims / inventory.
-- 2. Endpoints must derive user_id from verified session JWT, not request JSON.
-- 3. Use server-side transaction + SELECT ... FOR UPDATE + unique source keys.
-- 4. Enable RLS when using Supabase; keep protected writes behind RPC or server roles.
-- 5. Never persist confession contents, spiritual status, actual baptism history.
