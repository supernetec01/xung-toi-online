-- Mô hình tham khảo PostgreSQL V3 cho backend thực tế.
-- QUAN TRỌNG: chỉ server transaction mới cập nhật coins/cooldowns và xác nhận real donations.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TYPE donation_state AS ENUM ('pending','needs_review','confirmed','rejected','expired','refunded');
CREATE TYPE action_state AS ENUM ('started','completed','expired','cancelled');
CREATE TABLE game_users(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 auth_subject TEXT NOT NULL UNIQUE,
 display_name VARCHAR(36) NOT NULL,
 avatar_gender VARCHAR(16) NOT NULL CHECK(avatar_gender IN ('female','male')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 disabled_at TIMESTAMPTZ
);
CREATE TABLE game_wallets(
 user_id UUID PRIMARY KEY REFERENCES game_users(id),
 coins BIGINT NOT NULL DEFAULT 150 CHECK(coins>=0),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE coin_ledger(
 id BIGSERIAL PRIMARY KEY,
 user_id UUID NOT NULL REFERENCES game_users(id),
 delta BIGINT NOT NULL CHECK(delta<>0),
 source_type TEXT NOT NULL,
 source_ref TEXT NOT NULL,
 balance_after BIGINT NOT NULL CHECK(balance_after>=0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE (user_id, source_type, source_ref)
);
CREATE INDEX idx_coin_user_date ON coin_ledger(user_id,created_at DESC);
CREATE TABLE action_definitions(
 id VARCHAR(48) PRIMARY KEY,
 scene_id VARCHAR(48) NOT NULL,
 title TEXT NOT NULL,
 pose_key VARCHAR(32) NOT NULL,
 duration_seconds INT NOT NULL DEFAULT 3 CHECK(duration_seconds BETWEEN 1 AND 30),
 cooldown_seconds INT NOT NULL CHECK(cooldown_seconds BETWEEN 60 AND 600),
 coin_reward INT NOT NULL CHECK(coin_reward BETWEEN 1 AND 100),
 active BOOLEAN NOT NULL DEFAULT TRUE,
 daily_reward_limit INT CHECK(daily_reward_limit>=0)
);
CREATE TABLE player_action_states(
 user_id UUID NOT NULL REFERENCES game_users(id),
 action_id VARCHAR(48) NOT NULL REFERENCES action_definitions(id),
 ready_at TIMESTAMPTZ NOT NULL DEFAULT '-infinity',
 performed_count INT NOT NULL DEFAULT 0,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY(user_id,action_id)
);
CREATE INDEX idx_player_actions_due ON player_action_states(user_id,ready_at);
CREATE TABLE action_executions(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL REFERENCES game_users(id),
 action_id VARCHAR(48) NOT NULL REFERENCES action_definitions(id),
 idempotency_key TEXT NOT NULL,
 started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 complete_after TIMESTAMPTZ NOT NULL,
 completed_at TIMESTAMPTZ,
 state action_state NOT NULL DEFAULT 'started',
 coins_awarded INT NOT NULL DEFAULT 0,
 UNIQUE(user_id,idempotency_key)
);
CREATE INDEX idx_action_executions_user ON action_executions(user_id,started_at DESC);
CREATE UNIQUE INDEX ux_single_live_action ON action_executions(user_id) WHERE state='started';
CREATE TABLE quest_definitions(
 id VARCHAR(48) PRIMARY KEY, title TEXT NOT NULL,
 steps JSONB NOT NULL, coin_reward INT NOT NULL CHECK(coin_reward>=0),
 repeat_rule VARCHAR(16) NOT NULL DEFAULT 'once' CHECK(repeat_rule IN ('once','daily','weekly')),
 enabled BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE player_quests(
 user_id UUID NOT NULL REFERENCES game_users(id),
 quest_id VARCHAR(48) NOT NULL REFERENCES quest_definitions(id),
 period_key DATE NOT NULL DEFAULT DATE '1970-01-01',
 status VARCHAR(16) NOT NULL CHECK(status IN ('accepted','completed','claimed')),
 progress JSONB NOT NULL DEFAULT '{}'::jsonb,
 claimed_at TIMESTAMPTZ,
 PRIMARY KEY(user_id,quest_id,period_key)
);
CREATE TABLE shop_items(id VARCHAR(48) PRIMARY KEY,slot VARCHAR(16) NOT NULL,gender_allowed TEXT[],asset_id TEXT NOT NULL,coin_price INT NOT NULL CHECK(coin_price>=0),available BOOLEAN NOT NULL DEFAULT TRUE);
CREATE TABLE player_inventory(user_id UUID NOT NULL REFERENCES game_users(id),item_id VARCHAR(48) NOT NULL REFERENCES shop_items(id),acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(user_id,item_id));
CREATE TABLE player_appearance(user_id UUID PRIMARY KEY REFERENCES game_users(id),hair VARCHAR(48),top VARCHAR(48),bottom VARCHAR(48),shoes VARCHAR(48),accessory VARCHAR(48),skin_hex VARCHAR(7));
CREATE TABLE scene_seats(scene_id VARCHAR(48) NOT NULL, seat_id VARCHAR(48) NOT NULL, x NUMERIC NOT NULL,y NUMERIC NOT NULL, PRIMARY KEY(scene_id,seat_id));
CREATE TABLE seat_presence(scene_id VARCHAR(48) NOT NULL,seat_id VARCHAR(48) NOT NULL,user_id UUID NOT NULL REFERENCES game_users(id),expires_at TIMESTAMPTZ NOT NULL,PRIMARY KEY(scene_id,seat_id));
CREATE TABLE virtual_projects(id VARCHAR(48) PRIMARY KEY,name TEXT NOT NULL,coins_goal BIGINT NOT NULL CHECK(coins_goal>0),coins_received BIGINT NOT NULL DEFAULT 0);
CREATE TABLE virtual_contributions(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID NOT NULL REFERENCES game_users(id),project_id VARCHAR(48) NOT NULL REFERENCES virtual_projects(id),coin_amount INT NOT NULL CHECK(coin_amount>0),created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),idempotency_key TEXT NOT NULL,UNIQUE(user_id,idempotency_key));
-- TIỀN THẬT: quản lý tách hẳn game wallet.
CREATE TABLE donation_beneficiaries(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 legal_entity_name TEXT NOT NULL,bank_name TEXT NOT NULL,account_holder TEXT NOT NULL,
 encrypted_account_number BYTEA NOT NULL,public_display_account TEXT NOT NULL,
 verified BOOLEAN NOT NULL DEFAULT FALSE,purpose_description TEXT NOT NULL,
 verified_at TIMESTAMPTZ,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE donation_intents(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID REFERENCES game_users(id),
 beneficiary_id UUID NOT NULL REFERENCES donation_beneficiaries(id),
 transfer_reference VARCHAR(30) NOT NULL UNIQUE,
 requested_amount_vnd BIGINT CHECK(requested_amount_vnd>0),
 state donation_state NOT NULL DEFAULT 'pending',
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),confirmed_at TIMESTAMPTZ,
 consent_public_name BOOLEAN NOT NULL DEFAULT FALSE,
 requested_public_name VARCHAR(36)
);
CREATE TABLE verified_bank_transfers(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 provider TEXT NOT NULL,provider_txn_ref TEXT NOT NULL,
 amount_vnd BIGINT NOT NULL CHECK(amount_vnd>0),
 received_at TIMESTAMPTZ NOT NULL,recipient_beneficiary_id UUID NOT NULL REFERENCES donation_beneficiaries(id),
 intent_id UUID UNIQUE REFERENCES donation_intents(id),
 provider_signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
 reconciled_by UUID REFERENCES game_users(id),
 reconciled_at TIMESTAMPTZ,
 UNIQUE(provider,provider_txn_ref)
);
CREATE TABLE donor_publications(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),intent_id UUID NOT NULL UNIQUE REFERENCES donation_intents(id),
 public_name VARCHAR(36) NOT NULL,public_opt_in_at TIMESTAMPTZ NOT NULL,
 moderation_state VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK(moderation_state IN ('pending','approved','rejected','hidden')),
 published_at TIMESTAMPTZ,hidden_at TIMESTAMPTZ
);
CREATE INDEX idx_public_donors ON donor_publications(published_at DESC) WHERE moderation_state='approved' AND hidden_at IS NULL;
CREATE TABLE admin_user_roles(user_id UUID NOT NULL REFERENCES game_users(id),role_key VARCHAR(32) NOT NULL CHECK(role_key IN ('SUPERADMIN','FINANCE_REVIEWER','CONTENT_MODERATOR')),PRIMARY KEY(user_id,role_key));
CREATE TABLE admin_audit_events(
 id BIGSERIAL PRIMARY KEY,actor_id UUID REFERENCES game_users(id),
 event_key TEXT NOT NULL,subject_type TEXT NOT NULL,subject_ref TEXT NOT NULL,
 change_before JSONB,change_after JSONB,reason TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Chỉ hiển thị tên cho intent đã được xác minh, có opt-in và moderator duyệt.
CREATE VIEW public_donor_wall AS
 SELECT p.public_name,p.published_at
 FROM donor_publications p JOIN donation_intents d ON d.id=p.intent_id
 WHERE d.state='confirmed' AND d.consent_public_name=TRUE
 AND p.moderation_state='approved' AND p.hidden_at IS NULL;
-- Migration/auth, RLS/GRANT, crypto key rotation, provider webhook verification cần bổ sung trước public launch.
