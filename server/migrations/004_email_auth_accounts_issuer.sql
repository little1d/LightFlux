-- Better Auth's account model has no `issuer` concept: when it stores a
-- credential (email + password) row it only writes `provider_id`, `account_id`,
-- and `password`. The original 002 migration declared `issuer` NOT NULL with no
-- default and made the unique key `(issuer, account_id)`, so every credential
-- INSERT failed the NOT NULL constraint. The symptom was that "set password"
-- silently never persisted and email+password sign-in could never work for any
-- user. `email_auth_accounts` has always been empty, so relaxing this is safe.

-- Drop the unused NOT NULL constraint on `issuer` and remove its default-less
-- requirement. Keep the column nullable for backward compatibility with any
-- external reference to the schema.
ALTER TABLE email_auth_accounts
  ALTER COLUMN issuer DROP NOT NULL;

-- Better Auth looks accounts up by (provider_id, account_id); replace the
-- issuer-based unique key with the one the auth layer actually enforces.
ALTER TABLE email_auth_accounts
  DROP CONSTRAINT IF EXISTS email_auth_accounts_issuer_account_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS email_auth_accounts_provider_account_id_key
  ON email_auth_accounts (provider_id, account_id);
