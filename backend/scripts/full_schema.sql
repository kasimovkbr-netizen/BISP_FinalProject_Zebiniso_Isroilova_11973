-- =============================================================================
-- PediaMom — To'liq PostgreSQL Schema (50+ jadval)
-- Supabase SQL Editor da ishga tushiring
-- =============================================================================

-- ─── 1. USERS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                     UUID PRIMARY KEY,
  email                  TEXT UNIQUE,
  display_name           TEXT,
  role                   TEXT DEFAULT 'parent',
  telegram_chat_id       TEXT,
  credits                INTEGER NOT NULL DEFAULT 50,
  free_credits_used      INTEGER NOT NULL DEFAULT 0,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  subscription_status    TEXT,
  subscription_period_end TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. CHILDREN ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS children (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  age          INTEGER,
  age_unit     TEXT DEFAULT 'years',
  gender       TEXT,
  birth_date   DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 3. MEDICINE LIST ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medicine_list (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  child_id      UUID REFERENCES children(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  dosage        TEXT,
  times_per_day INTEGER DEFAULT 1,
  notes         TEXT,
  active        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 4. MEDICINE LOGS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medicine_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  medicine_id UUID REFERENCES medicine_list(id) ON DELETE CASCADE,
  child_id    UUID REFERENCES children(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  time_slot   TEXT,
  taken       BOOLEAN DEFAULT FALSE,
  taken_at    TIMESTAMPTZ,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 5. VACCINATION RECORDS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vaccination_records (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id       UUID REFERENCES children(id) ON DELETE CASCADE,
  parent_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  vaccine_name   TEXT NOT NULL,
  scheduled_date DATE,
  taken_date     DATE,
  status         TEXT DEFAULT 'pending',
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 6. KNOWLEDGE BASE ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS knowledge_base (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  category   TEXT,
  summary    TEXT,
  content    TEXT,
  warning    TEXT,
  author     TEXT DEFAULT 'PediaMom',
  views      INTEGER DEFAULT 0,
  notified   BOOLEAN DEFAULT FALSE,
  status     TEXT DEFAULT 'published',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 7. SAVED ARTICLES ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_articles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  article_id UUID REFERENCES knowledge_base(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, article_id)
);

-- ─── 8. MEDICAL ANALYSES ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medical_analyses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  child_id        UUID REFERENCES children(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,
  data            JSONB,
  ai_result       JSONB,
  ai_analyzed_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 9. WATER INTAKE ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS water_intake (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  daily_liters NUMERIC DEFAULT 2.0,
  start_hour   INTEGER DEFAULT 7,
  end_hour     INTEGER DEFAULT 22,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 10. APPOINTMENTS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  appointment_date DATE,
  doctor_name      TEXT,
  clinic_name      TEXT,
  notes            TEXT,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 11. MOTHER HEALTH ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mother_health (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  symptoms         TEXT,
  last_period_date DATE,
  cycle_length     INTEGER DEFAULT 28,
  period_end_date  DATE,
  flow_level       TEXT,
  period_duration  INTEGER,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 12. CYCLE HISTORY ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cycle_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end   DATE,
  flow_level   TEXT,
  cycle_length INTEGER,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, period_start)
);

-- ─── 13. CHILD GROWTH RECORDS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS child_growth (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id    UUID REFERENCES children(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  weight_kg   NUMERIC,
  height_cm   NUMERIC,
  head_cm     NUMERIC,
  measured_at DATE NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 14. CHILD ALLERGIES ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS child_allergies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id    UUID REFERENCES children(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  allergen    TEXT NOT NULL,
  severity    TEXT DEFAULT 'mild',
  reaction    TEXT,
  diagnosed_at DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 15. CHILD DOCTOR VISITS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS child_doctor_visits (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id     UUID REFERENCES children(id) ON DELETE CASCADE,
  parent_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  visit_date   DATE NOT NULL,
  doctor_name  TEXT,
  clinic       TEXT,
  diagnosis    TEXT,
  prescription TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 16. CHILD SYMPTOMS LOG ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS child_symptoms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id    UUID REFERENCES children(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  symptom     TEXT NOT NULL,
  severity    TEXT DEFAULT 'mild',
  started_at  DATE,
  ended_at    DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 17. CHILD SLEEP LOG ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS child_sleep_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id    UUID REFERENCES children(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  sleep_start TIMESTAMPTZ NOT NULL,
  sleep_end   TIMESTAMPTZ,
  quality     TEXT DEFAULT 'good',
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 18. CHILD FEEDING LOG ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS child_feeding_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id     UUID REFERENCES children(id) ON DELETE CASCADE,
  parent_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  feeding_type TEXT DEFAULT 'breast',
  amount_ml    INTEGER,
  duration_min INTEGER,
  fed_at       TIMESTAMPTZ NOT NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 19. CHILD TEMPERATURE LOG ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS child_temperature_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id     UUID REFERENCES children(id) ON DELETE CASCADE,
  parent_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  temperature  NUMERIC NOT NULL,
  unit         TEXT DEFAULT 'C',
  method       TEXT DEFAULT 'axillary',
  measured_at  TIMESTAMPTZ NOT NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 20. CHILD DIAPER LOG ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS child_diaper_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id    UUID REFERENCES children(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  color       TEXT,
  consistency TEXT,
  logged_at   TIMESTAMPTZ NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 21. NOTIFICATIONS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT,
  message     TEXT,
  read        BOOLEAN DEFAULT FALSE,
  data        JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 22. USER SETTINGS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  language              TEXT DEFAULT 'uz',
  dark_mode             BOOLEAN DEFAULT FALSE,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  email_notifications   BOOLEAN DEFAULT TRUE,
  telegram_notifications BOOLEAN DEFAULT TRUE,
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 23. CREDIT TRANSACTIONS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS credit_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  amount      INTEGER NOT NULL,
  balance_after INTEGER,
  description TEXT,
  stripe_session_id TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 24. ARTICLE VIEWS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS article_views (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES knowledge_base(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  viewed_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 25. ARTICLE RATINGS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS article_ratings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES knowledge_base(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  rating     INTEGER CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(article_id, user_id)
);

-- ─── 26. ARTICLE COMMENTS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS article_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES knowledge_base(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 27. ARTICLE TAGS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS article_tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES knowledge_base(id) ON DELETE CASCADE,
  tag        TEXT NOT NULL
);

-- ─── 28. MEDICINE REMINDERS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medicine_reminders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id UUID REFERENCES medicine_list(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  remind_at   TIME NOT NULL,
  enabled     BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 29. VACCINATION CERTIFICATES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vaccination_certificates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id       UUID REFERENCES children(id) ON DELETE CASCADE,
  parent_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  vaccine_name   TEXT NOT NULL,
  certificate_no TEXT,
  issued_by      TEXT,
  issued_at      DATE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 30. HEALTH GOALS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS health_goals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  child_id    UUID REFERENCES children(id) ON DELETE CASCADE,
  goal_type   TEXT NOT NULL,
  target      TEXT,
  achieved    BOOLEAN DEFAULT FALSE,
  due_date    DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 31. DAILY NOTES ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  child_id   UUID REFERENCES children(id) ON DELETE CASCADE,
  note       TEXT NOT NULL,
  mood       TEXT,
  date       DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 32. EMERGENCY CONTACTS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  relationship TEXT,
  phone        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 33. CHILD MEDICATIONS HISTORY ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medication_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id     UUID REFERENCES children(id) ON DELETE CASCADE,
  parent_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  medicine_name TEXT NOT NULL,
  dosage       TEXT,
  start_date   DATE,
  end_date     DATE,
  reason       TEXT,
  prescribed_by TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 34. BLOOD TYPE RECORDS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blood_type_records (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  child_id   UUID REFERENCES children(id) ON DELETE CASCADE,
  blood_type TEXT NOT NULL,
  rh_factor  TEXT,
  confirmed  BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 35. INSURANCE INFO ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS insurance_info (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  provider        TEXT,
  policy_number   TEXT,
  valid_until     DATE,
  coverage_notes  TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 36. PEDIATRICIAN INFO ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pediatrician_info (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  clinic       TEXT,
  phone        TEXT,
  address      TEXT,
  is_primary   BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 37. CHILD DENTAL RECORDS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS child_dental_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id    UUID REFERENCES children(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  visit_date  DATE NOT NULL,
  dentist     TEXT,
  procedure   TEXT,
  notes       TEXT,
  next_visit  DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 38. CHILD EYE RECORDS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS child_eye_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id    UUID REFERENCES children(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  visit_date  DATE NOT NULL,
  right_eye   TEXT,
  left_eye    TEXT,
  diagnosis   TEXT,
  glasses     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 39. CHILD HEARING RECORDS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS child_hearing_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id    UUID REFERENCES children(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  test_date   DATE NOT NULL,
  result      TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 40. PREGNANCY RECORDS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pregnancy_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  due_date        DATE,
  last_period     DATE,
  weeks           INTEGER,
  doctor          TEXT,
  hospital        TEXT,
  notes           TEXT,
  status          TEXT DEFAULT 'active',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 41. PRENATAL VISITS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prenatal_visits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  visit_date  DATE NOT NULL,
  week        INTEGER,
  weight_kg   NUMERIC,
  bp_systolic INTEGER,
  bp_diastolic INTEGER,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 42. BREASTFEEDING LOG ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS breastfeeding_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  child_id     UUID REFERENCES children(id) ON DELETE CASCADE,
  side         TEXT,
  duration_min INTEGER,
  started_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 43. PUMPING LOG ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pumping_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  amount_ml   INTEGER,
  side        TEXT,
  pumped_at   TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 44. SOLID FOOD INTRO ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS solid_food_intro (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id     UUID REFERENCES children(id) ON DELETE CASCADE,
  parent_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  food_name    TEXT NOT NULL,
  introduced_at DATE NOT NULL,
  reaction     TEXT DEFAULT 'none',
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 45. MILESTONE TRACKER ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS milestones (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id     UUID REFERENCES children(id) ON DELETE CASCADE,
  parent_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  milestone    TEXT NOT NULL,
  category     TEXT DEFAULT 'motor',
  achieved_at  DATE,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 46. ACTIVITY LOG ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  action       TEXT NOT NULL,
  entity_type  TEXT,
  entity_id    UUID,
  metadata     JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 47. SUPPORT TICKETS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  subject     TEXT NOT NULL,
  message     TEXT NOT NULL,
  status      TEXT DEFAULT 'open',
  priority    TEXT DEFAULT 'normal',
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 48. ADMIN LOGS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   UUID,
  details     JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 49. APP FEEDBACK ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  rating      INTEGER CHECK (rating BETWEEN 1 AND 5),
  message     TEXT,
  category    TEXT DEFAULT 'general',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 50. SYSTEM CONFIG ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_config (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT UNIQUE NOT NULL,
  value       TEXT,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 51. PUSH TOKENS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL,
  platform    TEXT DEFAULT 'web',
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- ─── 52. REFERRALS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  referred_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  credits_given INTEGER DEFAULT 10,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id)
);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_children_parent ON children(parent_id);
CREATE INDEX IF NOT EXISTS idx_medicine_list_parent ON medicine_list(parent_id);
CREATE INDEX IF NOT EXISTS idx_medicine_list_child ON medicine_list(child_id);
CREATE INDEX IF NOT EXISTS idx_medicine_logs_date ON medicine_logs(date);
CREATE INDEX IF NOT EXISTS idx_vaccination_parent_child ON vaccination_records(parent_id, child_id);
CREATE INDEX IF NOT EXISTS idx_vaccination_status ON vaccination_records(status);
CREATE INDEX IF NOT EXISTS idx_medical_analyses_parent ON medical_analyses(parent_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_saved_articles_user ON saved_articles(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_cycle_history_user ON cycle_history(user_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_child_growth_child ON child_growth(child_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_stripe ON users(stripe_customer_id);
