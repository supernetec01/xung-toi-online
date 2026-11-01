-- PostgreSQL 15+ — Database tham khảo cho V2; chạy khi chuyển prototype thành game có backend.
-- Tuyệt đối không lưu lời xưng tội, nội dung cầu nguyện hay suy đoán tôn giáo người chơi.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_provider text NOT NULL DEFAULT 'guest' CHECK (auth_provider IN ('guest','email','oauth')),
  provider_subject text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(auth_provider, provider_subject)
);
CREATE TABLE IF NOT EXISTS player_profiles (
  account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  display_name varchar(24) NOT NULL CHECK (length(trim(display_name)) > 0),
  avatar_gender text NOT NULL DEFAULT 'female' CHECK (avatar_gender IN ('male','female')),
  skin_color varchar(7) NOT NULL DEFAULT '#f7cfac',
  scene_id varchar(48) NOT NULL DEFAULT 'courtyard',
  x numeric(6,3) NOT NULL DEFAULT 51 CHECK (x BETWEEN 0 AND 100),
  y numeric(6,3) NOT NULL DEFAULT 82 CHECK (y BETWEEN 0 AND 100),
  xp integer NOT NULL DEFAULT 0 CHECK (xp >= 0),
  tracked_quest_id varchar(64),
  low_motion boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS scenes (
  id varchar(48) PRIMARY KEY,
  name text NOT NULL,
  subtitle text,
  scene_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  walkable_geometry jsonb,
  background_asset_path text,
  is_enabled boolean NOT NULL DEFAULT true
);
ALTER TABLE player_profiles
  ADD CONSTRAINT fk_player_scene FOREIGN KEY (scene_id) REFERENCES scenes(id)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE IF NOT EXISTS npc_definitions (
  id varchar(64) PRIMARY KEY,
  name text NOT NULL,
  role_name text,
  default_scene_id varchar(48) REFERENCES scenes(id),
  initial_x numeric(6,3),initial_y numeric(6,3),
  avatar_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  dialogue_key text,
  is_enabled boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS quest_definitions (
  id varchar(64) PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('main','service','lesson','event','activity','daily')),
  giver_npc_id varchar(64) REFERENCES npc_definitions(id),
  reward_xp integer NOT NULL DEFAULT 0 CHECK (reward_xp >= 0),
  reward_coins integer NOT NULL DEFAULT 0 CHECK (reward_coins >= 0),
  reward_kindness integer NOT NULL DEFAULT 0 CHECK (reward_kindness >= 0),
  is_repeatable boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS quest_requirements (
  quest_id varchar(64) NOT NULL REFERENCES quest_definitions(id) ON DELETE CASCADE,
  required_quest_id varchar(64) NOT NULL REFERENCES quest_definitions(id),
  PRIMARY KEY (quest_id,required_quest_id),
  CHECK (quest_id <> required_quest_id)
);
CREATE TABLE IF NOT EXISTS quest_objectives (
  quest_id varchar(64) NOT NULL REFERENCES quest_definitions(id) ON DELETE CASCADE,
  objective_index smallint NOT NULL CHECK (objective_index >= 0),
  event_code varchar(70) NOT NULL,
  display_text text NOT NULL,
  required_count integer NOT NULL DEFAULT 1 CHECK (required_count > 0),
  require_distinct_object_ids boolean NOT NULL DEFAULT false,
  PRIMARY KEY(quest_id,objective_index)
);
CREATE TABLE IF NOT EXISTS player_quests (
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  quest_id varchar(64) NOT NULL REFERENCES quest_definitions(id),
  status text NOT NULL CHECK (status IN ('accepted','ready','claimed')),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  claimed_at timestamptz,
  PRIMARY KEY(account_id,quest_id)
);
CREATE TABLE IF NOT EXISTS player_objectives (
  account_id uuid NOT NULL,
  quest_id varchar(64) NOT NULL,
  objective_index smallint NOT NULL,
  progress_count integer NOT NULL DEFAULT 0 CHECK (progress_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(account_id,quest_id,objective_index),
  FOREIGN KEY(account_id,quest_id) REFERENCES player_quests(account_id,quest_id) ON DELETE CASCADE,
  FOREIGN KEY(quest_id,objective_index) REFERENCES quest_objectives(quest_id,objective_index)
);
CREATE TABLE IF NOT EXISTS player_event_ledger (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  event_code varchar(70) NOT NULL,
  scene_id varchar(48) REFERENCES scenes(id),
  object_id varchar(64),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb, -- whitelist only; no sensitive content.
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id,request_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_object_action
 ON player_event_ledger(account_id,event_code,scene_id,object_id)
 WHERE object_id IS NOT NULL AND event_code IN ('water_flower','decorate','pickup_book','return_book','complete_gift');

CREATE TABLE IF NOT EXISTS wallet_balances (
  account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  coins bigint NOT NULL DEFAULT 150 CHECK (coins >= 0),
  kindness bigint NOT NULL DEFAULT 0 CHECK (kindness >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS wallet_ledger (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  transaction_key varchar(200) NOT NULL,
  currency text NOT NULL CHECK (currency IN ('coins','kindness')),
  delta bigint NOT NULL CHECK (delta <> 0),
  reason text NOT NULL CHECK (reason IN ('quest_reward','shop_purchase','admin_correction')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id,transaction_key,currency)
);
CREATE TABLE IF NOT EXISTS items (
  id varchar(64) PRIMARY KEY,
  name text NOT NULL,
  slot text NOT NULL CHECK(slot IN ('top','bottom','shoes','hair','acc')),
  appearance_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  required_level integer NOT NULL DEFAULT 1 CHECK(required_level > 0),
  coin_price integer NOT NULL DEFAULT 0 CHECK(coin_price >= 0),
  kindness_price integer NOT NULL DEFAULT 0 CHECK(kindness_price >= 0),
  is_active boolean NOT NULL DEFAULT true,
  CHECK (coin_price=0 OR kindness_price=0)
);
CREATE TABLE IF NOT EXISTS player_items (
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  item_id varchar(64) NOT NULL REFERENCES items(id),
  obtained_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(account_id,item_id)
);
CREATE TABLE IF NOT EXISTS player_equipment (
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  slot text NOT NULL CHECK(slot IN ('top','bottom','shoes','hair','acc')),
  item_id varchar(64) NOT NULL REFERENCES items(id),
  equipped_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(account_id,slot),
  FOREIGN KEY(account_id,item_id) REFERENCES player_items(account_id,item_id)
);
CREATE TABLE IF NOT EXISTS world_object_states (
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  scene_id varchar(48) NOT NULL REFERENCES scenes(id),
  object_id varchar(64) NOT NULL,
  state_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(account_id,scene_id,object_id)
);
-- Chỉ dùng khi có multiplayer, không cần cho bản demo offline.
CREATE TABLE IF NOT EXISTS seat_leases (
  scene_instance_id uuid NOT NULL,
  seat_id varchar(64) NOT NULL,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY(scene_instance_id,seat_id)
);
CREATE INDEX IF NOT EXISTS idx_quests_active ON player_quests(account_id,status);
CREATE INDEX IF NOT EXISTS idx_event_user_time ON player_event_ledger(account_id,received_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_history ON wallet_ledger(account_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seat_expiry ON seat_leases(expires_at);

-- TRANSACTION MẪU claim quest: server phải xác nhận status=ready từ objectives, 
-- SELECT FOR UPDATE (player_quests, wallet_balances), UPDATE status=claimed + cấp XP / Xu / Điểm sẻ chia,
-- và INSERT wallet_ledger transaction_key='claim:<quest_id>:<season_id>' trong MỘT transaction.
-- Nếu conflict, chỉ trả về kết quả giao dịch đã thành công, không thưởng lần hai.
