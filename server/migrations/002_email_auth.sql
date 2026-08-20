CREATE TABLE email_auth_users (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  email_verified boolean NOT NULL DEFAULT false,
  image text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE email_auth_sessions (
  id text PRIMARY KEY,
  auth_user_id text NOT NULL
    REFERENCES email_auth_users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE INDEX email_auth_sessions_auth_user_id_idx
  ON email_auth_sessions (auth_user_id);

CREATE TABLE email_auth_accounts (
  id text PRIMARY KEY,
  auth_user_id text NOT NULL
    REFERENCES email_auth_users(id) ON DELETE CASCADE,
  issuer text NOT NULL,
  account_id text NOT NULL,
  provider_id text NOT NULL,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  password text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  UNIQUE (issuer, account_id)
);

CREATE INDEX email_auth_accounts_auth_user_id_idx
  ON email_auth_accounts (auth_user_id);

CREATE TABLE email_auth_verifications (
  id text PRIMARY KEY,
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE INDEX email_auth_verifications_identifier_idx
  ON email_auth_verifications (identifier);

CREATE TABLE email_auth_rate_limits (
  id text PRIMARY KEY,
  key text NOT NULL UNIQUE,
  count integer NOT NULL,
  last_request bigint NOT NULL
);

CREATE TABLE federated_identities (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_subject text NOT NULL,
  verified_email text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  UNIQUE (provider, provider_subject)
);

CREATE INDEX federated_identities_user_id_idx
  ON federated_identities (user_id);
