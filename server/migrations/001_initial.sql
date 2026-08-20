CREATE TABLE users (
  id uuid PRIMARY KEY,
  display_name text NOT NULL,
  avatar_url text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE auth_identities (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('web', 'mobile')),
  app_id text NOT NULL,
  open_id text NOT NULL,
  union_id text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  UNIQUE (provider, app_id, open_id)
);

CREATE INDEX auth_identities_union_id_idx
  ON auth_identities (provider, union_id)
  WHERE union_id IS NOT NULL;

CREATE INDEX auth_identities_user_id_idx
  ON auth_identities (user_id);

CREATE TABLE sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE CHECK (length(token_hash) = 64),
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL
);

CREATE INDEX sessions_user_id_idx ON sessions (user_id);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);

CREATE TABLE app_states (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  state jsonb NOT NULL CHECK (jsonb_typeof(state) = 'object'),
  state_updated_at bigint NOT NULL CHECK (state_updated_at >= 0),
  updated_at timestamptz NOT NULL
);
