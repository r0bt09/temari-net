-- ============================================================================
-- LOCAL STANDALONE COMPANION DATABASE ONLY — DESTRUCTIVE RESET SCRIPT
--
-- WARNING: This script DROPS and recreates the four local application tables.
-- Run it only against your own local PostgreSQL database (temari_net_db).
-- NEVER run this script or any reset command against a managed, shared, or
-- production database. Seed-account hashes are intentionally unusable. To
-- activate local seed accounts, set SEED_*_PASSWORD variables in backend/.env
-- and run `npm run seed:passwords` from the backend directory.
-- ============================================================================
BEGIN;
DROP TABLE IF EXISTS progress, sponsorships, lessons, users CASCADE;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(16) NOT NULL DEFAULT 'student'
    CHECK (role IN ('student', 'teacher', 'admin')),
  grade_level VARCHAR(16) NOT NULL DEFAULT 'Grade 1'
    CHECK (grade_level IN ('Pre-K', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4')),
  coins INTEGER NOT NULL DEFAULT 50 CHECK (coins >= 0),
  streak INTEGER NOT NULL DEFAULT 1 CHECK (streak >= 0),
  registered_by_teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE lessons (
  id SERIAL PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  subject VARCHAR(16) NOT NULL CHECK (subject IN ('Amharic', 'Math', 'English', 'Science')),
  grade_level VARCHAR(16) NOT NULL
    CHECK (grade_level IN ('Pre-K', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4')),
  question TEXT NOT NULL,
  options JSONB NOT NULL
    CHECK (jsonb_typeof(options) = 'array' AND jsonb_array_length(options) = 4),
  correct_answer TEXT NOT NULL,
  pronunciation_word VARCHAR(120),
  reward_coins INTEGER NOT NULL DEFAULT 15 CHECK (reward_coins >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (options ? correct_answer)
);

CREATE TABLE progress (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  completed_at TIMESTAMPTZ,
  UNIQUE (student_id, lesson_id)
);

CREATE TABLE sponsorships (
  id SERIAL PRIMARY KEY,
  sponsor_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  phone_number VARCHAR(32) NOT NULL,
  amount_etb NUMERIC(10, 2) NOT NULL DEFAULT 50 CHECK (amount_etb >= 1 AND amount_etb <= 1000000),
  student_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed')),
  tx_ref VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX users_role_coins_idx ON users (role, coins DESC);
CREATE INDEX lessons_grade_subject_idx ON lessons (grade_level, subject, id);
CREATE INDEX progress_student_idx ON progress (student_id, completed_at DESC);
CREATE INDEX sponsorships_status_created_idx ON sponsorships (status, created_at DESC);
CREATE INDEX sponsorships_student_idx ON sponsorships (student_id, created_at DESC);

-- The '!' password hash is deliberately unusable; no usable passwords belong
-- in source control. Activate local accounts using the environment-based tool.
INSERT INTO users (full_name, email, password_hash, role, grade_level) VALUES
  ('Temari Net Administrator', 'admin@temarinet.et', '!', 'admin', 'Grade 1'),
  ('Temari Net Teacher', 'teacher@temarinet.et', '!', 'teacher', 'Grade 1'),
  ('Abebe', 'abebe@temarinet.et', '!', 'student', 'Grade 2'),
  ('Hanna', 'hanna@temarinet.et', '!', 'student', 'Grade 1'),
  ('Dawit', 'dawit@temarinet.et', '!', 'student', 'Grade 3');

INSERT INTO lessons
  (title, subject, grade_level, question, options, correct_answer, pronunciation_word, reward_coins)
VALUES
  (
    'Amharic Fidel: ሀ, ለ, ሐ, መ', 'Amharic', 'Grade 1',
    'Which sequence shows ሀ, ለ, ሐ, መ in the correct order?',
    '["ሀ, ለ, ሐ, መ", "ሀ, ሐ, ለ, መ", "መ, ሐ, ለ, ሀ", "ለ, ሀ, መ, ሐ"]'::jsonb, 'ሀ, ለ, ሐ, መ', 'ሀ, ለ, ሐ, መ', 15
  ),
  (
    'Math at the Fruit Market', 'Math', 'Grade 2',
    'A banana costs 3 birr and an orange costs 2 birr. How many birr do they cost together?',
    '["4 birr", "5 birr", "6 birr", "7 birr"]'::jsonb, '5 birr', NULL, 15
  ),
  (
    'English: A Friendly Greeting', 'English', 'Grade 1',
    'Which is a friendly way to greet your classmate?',
    '["Good morning!", "Go away!", "I will not listen.", "Give me your book."]'::jsonb, 'Good morning!', NULL, 15
  ),
  (
    'Science: Ethiopian Highland Wildlife', 'Science', 'Grade 3',
    'Which animal lives in groups in the Ethiopian highlands and eats grass?',
    '["Gelada", "Penguin", "Dolphin", "Camel"]'::jsonb, 'Gelada', NULL, 15
  ),
  (
    'Science: Keep Rivers Clean', 'Science', 'Grade 2',
    'What is a safe way to care for a river near your community?',
    '["Put rubbish in the water", "Keep rubbish out of the river", "Wash paint into the river", "Leave plastic on the riverbank"]'::jsonb,
    'Keep rubbish out of the river', NULL, 15
  ),
  (
    'Amharic Fidel: Find መ', 'Amharic', 'Pre-K',
    'Which letter is መ?',
    '["ሀ", "ለ", "ሐ", "መ"]'::jsonb, 'መ', 'መ', 15
  );
COMMIT;
