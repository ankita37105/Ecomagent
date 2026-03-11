-- Run this in Supabase Dashboard → SQL Editor

-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
  account_id         TEXT PRIMARY KEY,
  email              TEXT NOT NULL DEFAULT '',
  plan               TEXT NOT NULL DEFAULT 'free_trial',
  request_limit      TEXT NOT NULL DEFAULT '100',
  token_limit        TEXT NOT NULL DEFAULT '10M',
  api_key            TEXT,
  api_key_name       TEXT,
  provider_user_id   TEXT,
  plan_starts_at     TIMESTAMPTZ,
  plan_ends_at       TIMESTAMPTZ,
  api_key_created_at TIMESTAMPTZ,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add validity columns to existing deployments
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS plan_starts_at TIMESTAMPTZ;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS plan_ends_at       TIMESTAMPTZ;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS api_key_created_at TIMESTAMPTZ;

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  txn_id                  TEXT PRIMARY KEY,
  account_id              TEXT NOT NULL,
  email                   TEXT NOT NULL DEFAULT '',
  plan                    TEXT NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'pending',
  amount                  TEXT NOT NULL DEFAULT '',
  currency                TEXT NOT NULL DEFAULT '',
  status_text             TEXT NOT NULL DEFAULT '',
  confirmations           INTEGER NOT NULL DEFAULT 0,
  confirmations_required  INTEGER NOT NULL DEFAULT 3,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One signup per IP (stored as salted hash)
CREATE TABLE IF NOT EXISTS signup_ip_locks (
  ip_hash           TEXT PRIMARY KEY,
  email             TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Disable RLS so the service role key can read/write freely from server-side routes
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE signup_ip_locks DISABLE ROW LEVEL SECURITY;
