-- =============================================================================
-- PediaMom PostgreSQL Schema
-- Migration: Firebase/Firestore → Supabase (PostgreSQL)
--
-- Tables: users, children, medicine_list, medicine_logs, vaccination_records,
--         knowledge_base, saved_articles, medical_analyses, water_intake,
--         appointments, mother_health
--
-- All foreign keys use ON DELETE CASCADE.
-- Each table includes a firestore_id TEXT UNIQUE column for migration idempotency.
-- Run this script in the Supabase SQL Editor before running migrateToSupabase.js.
-- =============================================================================

-- Users (linked to Supabase Auth UID)
CREATE TABLE users (
  id               UUID PRIMARY KEY,
  email            TEXT,
  display_name     TEXT,
  role             TEXT DEFAULT 'parent',
  telegram_chat_id TEXT,
  firestore_id     TEXT UNIQUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Children
CREATE TABLE children (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  age         INTEGER,
  age_unit    TEXT,
  gender      TEXT,
  birth_date  DATE,
  firestore_id TEXT UNIQUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Medicine List
CREATE TABLE medicine_list (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  child_id      UUID REFERENCES children(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  dosage        TEXT,
  times_per_day INTEGER,
  firestore_id  TEXT UNIQUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Medicine Logs
CREATE TABLE medicine_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  medicine_id UUID REFERENCES medicine_list(id) ON DELETE CASCADE,
  child_id    UUID REFERENCES children(id) ON DELETE CASCADE,
  date        DATE,
  time_slot   TEXT,
  taken       BOOLEAN DEFAULT FALSE,
  firestore_id TEXT UNIQUE,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Vaccination Records
CREATE TABLE vaccination_records (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id       UUID REFERENCES children(id) ON DELETE CASCADE,
  parent_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  vaccine_name   TEXT NOT NULL,
  scheduled_date DATE,
  taken_date     DATE,
  status         TEXT DEFAULT 'pending',
  firestore_id   TEXT UNIQUE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge Base
CREATE TABLE knowledge_base (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  category   TEXT,
  summary    TEXT,
  content    TEXT,
  notified   BOOLEAN DEFAULT FALSE,
  firestore_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved Articles
CREATE TABLE saved_articles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  article_id UUID REFERENCES knowledge_base(id) ON DELETE CASCADE,
  firestore_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, article_id)
);

-- Medical Analyses
CREATE TABLE medical_analyses (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  child_id   UUID REFERENCES children(id) ON DELETE CASCADE,
  type       TEXT,
  data       JSONB,
  firestore_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Water Intake (one record per user, upsert pattern)
CREATE TABLE water_intake (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  daily_liters NUMERIC,
  start_hour   INTEGER,
  end_hour     INTEGER,
  firestore_id TEXT UNIQUE,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments (one record per user, upsert pattern)
CREATE TABLE appointments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  appointment_date DATE,
  firestore_id     TEXT UNIQUE,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Mother Health (one record per user, upsert pattern)
CREATE TABLE mother_health (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  symptoms         TEXT,
  last_period_date DATE,
  cycle_length     INTEGER,
  firestore_id     TEXT UNIQUE,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
