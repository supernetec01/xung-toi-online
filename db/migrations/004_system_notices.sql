CREATE TABLE system_notices(id bigserial PRIMARY KEY,body text NOT NULL,created_by uuid NOT NULL REFERENCES game_users(id),created_at timestamptz NOT NULL DEFAULT now());
