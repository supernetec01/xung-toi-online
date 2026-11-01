ALTER TABLE game_users ADD COLUMN IF NOT EXISTS mfa_pending text;
ALTER TABLE coin_ledger ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}';
ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS progress integer NOT NULL DEFAULT 0 CHECK(progress>=0);
