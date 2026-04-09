-- Row Level Security (RLS) Policies
-- Requirement 3: Enable RLS on all 11 tables and define owner-based access policies

-- ============================================================
-- Enable RLS on all tables (Requirement 3.1)
-- ============================================================
ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE children            ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_list       ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaccination_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base      ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_articles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_analyses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_intake        ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE mother_health       ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- users: owner is the row itself (id = auth.uid())
-- Requirement 3.2
-- ============================================================
CREATE POLICY "users_self" ON users
  FOR ALL
  USING (id = auth.uid());

-- ============================================================
-- children: owner identified by parent_id
-- Requirement 3.3
-- ============================================================
CREATE POLICY "children_owner" ON children
  FOR ALL
  USING (parent_id = auth.uid());

-- ============================================================
-- medicine_list: owner identified by parent_id
-- Requirement 3.4
-- ============================================================
CREATE POLICY "medicine_list_owner" ON medicine_list
  FOR ALL
  USING (parent_id = auth.uid());

-- ============================================================
-- medicine_logs: owner identified by parent_id
-- Requirement 3.5
-- ============================================================
CREATE POLICY "medicine_logs_owner" ON medicine_logs
  FOR ALL
  USING (parent_id = auth.uid());

-- ============================================================
-- vaccination_records: owner identified by parent_id
-- Requirement 3.6
-- ============================================================
CREATE POLICY "vaccination_records_owner" ON vaccination_records
  FOR ALL
  USING (parent_id = auth.uid());

-- ============================================================
-- knowledge_base: all authenticated users can SELECT
-- Requirement 3.7
-- ============================================================
CREATE POLICY "kb_read_authenticated" ON knowledge_base
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================
-- saved_articles: owner identified by user_id
-- Requirement 3.8
-- ============================================================
CREATE POLICY "saved_articles_owner" ON saved_articles
  FOR ALL
  USING (user_id = auth.uid());

-- ============================================================
-- medical_analyses: owner identified by parent_id
-- Requirement 3.9
-- ============================================================
CREATE POLICY "medical_analyses_owner" ON medical_analyses
  FOR ALL
  USING (parent_id = auth.uid());

-- ============================================================
-- water_intake: owner identified by user_id
-- Requirement 3.10
-- ============================================================
CREATE POLICY "water_intake_owner" ON water_intake
  FOR ALL
  USING (user_id = auth.uid());

-- ============================================================
-- appointments: owner identified by user_id
-- Requirement 3.11
-- ============================================================
CREATE POLICY "appointments_owner" ON appointments
  FOR ALL
  USING (user_id = auth.uid());

-- ============================================================
-- mother_health: owner identified by user_id
-- Requirement 3.12
-- ============================================================
CREATE POLICY "mother_health_owner" ON mother_health
  FOR ALL
  USING (user_id = auth.uid());

-- ─── Yangi jadvallar uchun RLS ────────────────────────────────────────────────

ALTER TABLE child_growth ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "child_growth_owner" ON child_growth;
CREATE POLICY "child_growth_owner" ON child_growth FOR ALL USING (auth.uid() = parent_id);

ALTER TABLE child_allergies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "child_allergies_owner" ON child_allergies;
CREATE POLICY "child_allergies_owner" ON child_allergies FOR ALL USING (auth.uid() = parent_id);

ALTER TABLE child_doctor_visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "child_doctor_visits_owner" ON child_doctor_visits;
CREATE POLICY "child_doctor_visits_owner" ON child_doctor_visits FOR ALL USING (auth.uid() = parent_id);

ALTER TABLE child_symptoms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "child_symptoms_owner" ON child_symptoms;
CREATE POLICY "child_symptoms_owner" ON child_symptoms FOR ALL USING (auth.uid() = parent_id);

ALTER TABLE child_temperature_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "child_temperature_owner" ON child_temperature_log;
CREATE POLICY "child_temperature_owner" ON child_temperature_log FOR ALL USING (auth.uid() = parent_id);

ALTER TABLE child_sleep_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "child_sleep_owner" ON child_sleep_log;
CREATE POLICY "child_sleep_owner" ON child_sleep_log FOR ALL USING (auth.uid() = parent_id);

ALTER TABLE child_feeding_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "child_feeding_owner" ON child_feeding_log;
CREATE POLICY "child_feeding_owner" ON child_feeding_log FOR ALL USING (auth.uid() = parent_id);

ALTER TABLE child_diaper_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "child_diaper_owner" ON child_diaper_log;
CREATE POLICY "child_diaper_owner" ON child_diaper_log FOR ALL USING (auth.uid() = parent_id);

ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "milestones_owner" ON milestones;
CREATE POLICY "milestones_owner" ON milestones FOR ALL USING (auth.uid() = parent_id);

ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "emergency_contacts_owner" ON emergency_contacts;
CREATE POLICY "emergency_contacts_owner" ON emergency_contacts FOR ALL USING (auth.uid() = user_id);

ALTER TABLE pediatrician_info ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pediatrician_info_owner" ON pediatrician_info;
CREATE POLICY "pediatrician_info_owner" ON pediatrician_info FOR ALL USING (auth.uid() = user_id);

ALTER TABLE insurance_info ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insurance_info_owner" ON insurance_info;
CREATE POLICY "insurance_info_owner" ON insurance_info FOR ALL USING (auth.uid() = user_id);

ALTER TABLE blood_type_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "blood_type_owner" ON blood_type_records;
CREATE POLICY "blood_type_owner" ON blood_type_records FOR ALL USING (auth.uid() = user_id);

ALTER TABLE health_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "health_goals_owner" ON health_goals;
CREATE POLICY "health_goals_owner" ON health_goals FOR ALL USING (auth.uid() = user_id);

ALTER TABLE daily_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "daily_notes_owner" ON daily_notes;
CREATE POLICY "daily_notes_owner" ON daily_notes FOR ALL USING (auth.uid() = user_id);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_owner" ON notifications;
CREATE POLICY "notifications_owner" ON notifications FOR ALL USING (auth.uid() = user_id);

ALTER TABLE app_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "app_feedback_owner" ON app_feedback;
CREATE POLICY "app_feedback_owner" ON app_feedback FOR ALL USING (auth.uid() = user_id);

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "credit_transactions_owner" ON credit_transactions;
CREATE POLICY "credit_transactions_owner" ON credit_transactions FOR ALL USING (auth.uid() = user_id);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_settings_owner" ON user_settings;
CREATE POLICY "user_settings_owner" ON user_settings FOR ALL USING (auth.uid() = user_id);

ALTER TABLE medication_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "medication_history_owner" ON medication_history;
CREATE POLICY "medication_history_owner" ON medication_history FOR ALL USING (auth.uid() = parent_id);

ALTER TABLE vaccination_certificates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vaccination_certificates_owner" ON vaccination_certificates;
CREATE POLICY "vaccination_certificates_owner" ON vaccination_certificates FOR ALL USING (auth.uid() = parent_id);
