ALTER TABLE settings ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
CREATE TABLE settings_history(key text NOT NULL,version integer NOT NULL,value jsonb NOT NULL,actor_id uuid REFERENCES game_users(id),reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(key,version));
INSERT INTO settings_history(key,version,value,reason) SELECT key,version,value,'initial settings baseline' FROM settings ON CONFLICT DO NOTHING;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS payload_hash text;
