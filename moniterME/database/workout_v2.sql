-- ============================================
-- EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM TYPES (Cleaner & Safer Than VARCHAR)
-- ============================================

CREATE TYPE exercise_level AS ENUM ('Beginner', 'Intermediate', 'Advanced');

CREATE TYPE exercise_type_enum AS ENUM ('Strength', 'Cardio', 'Flexibility', 'Mobility', 'Power');

-- ============================================
-- 1️⃣ EXERCISES TABLE (GLOBAL + CUSTOM)
-- ============================================

CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    name VARCHAR(255) NOT NULL,
    description TEXT,

    exercise_type exercise_type_enum,
    body_part VARCHAR(100),
    equipment VARCHAR(100),
    level exercise_level,

    rating DECIMAL(3,2),
    rating_desc TEXT,

    is_custom BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for filtering & search
CREATE INDEX idx_exercises_name ON exercises(name);
CREATE INDEX idx_exercises_body_part ON exercises(body_part);
CREATE INDEX idx_exercises_equipment ON exercises(equipment);
CREATE INDEX idx_exercises_level ON exercises(level);
CREATE INDEX idx_exercises_type ON exercises(exercise_type);

-- ============================================
-- 2️⃣ WORKOUTS TABLE
-- ============================================

CREATE TABLE workouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    name VARCHAR(255) DEFAULT 'Workout',
    date DATE NOT NULL DEFAULT CURRENT_DATE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workouts_user_id ON workouts(user_id);
CREATE INDEX idx_workouts_user_date ON workouts(user_id, date);

-- ============================================
-- 3️⃣ WORKOUT_EXERCISES TABLE
-- ============================================

CREATE TABLE workout_exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,

    order_index INTEGER NOT NULL,
    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workout_exercises_workout_id 
ON workout_exercises(workout_id);

-- ============================================
-- 4️⃣ WORKOUT_SETS TABLE
-- ============================================

CREATE TABLE workout_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    workout_exercise_id UUID NOT NULL 
        REFERENCES workout_exercises(id) ON DELETE CASCADE,

    set_number INTEGER NOT NULL,
    weight DECIMAL(6,2),      -- e.g. 999.99 kg max
    reps INTEGER NOT NULL,
    rest_seconds INTEGER DEFAULT 60,

    is_completed BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workout_sets_exercise 
ON workout_sets(workout_exercise_id);

-- ============================================
-- 5️⃣ PERSONAL RECORDS TABLE
-- ============================================

CREATE TABLE personal_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID NOT NULL 
        REFERENCES users(id) ON DELETE CASCADE,

    exercise_id UUID NOT NULL 
        REFERENCES exercises(id) ON DELETE CASCADE,

    max_weight DECIMAL(6,2),
    max_volume DECIMAL(10,2),

    achieved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    workout_set_id UUID 
        REFERENCES workout_sets(id) ON DELETE CASCADE
);

CREATE INDEX idx_pr_user_exercise 
ON personal_records(user_id, exercise_id);

-- Prevent duplicate PR entries per set
CREATE UNIQUE INDEX idx_unique_pr_per_set 
ON personal_records(workout_set_id)
WHERE workout_set_id IS NOT NULL;

-- ============================================
-- OPTIONAL: CALCULATED VOLUME VIEW
-- ============================================

CREATE VIEW workout_volume_view AS
SELECT 
    w.user_id,
    w.id AS workout_id,
    SUM(ws.weight * ws.reps) AS total_volume
FROM workouts w
JOIN workout_exercises we ON we.workout_id = w.id
JOIN workout_sets ws ON ws.workout_exercise_id = we.id
WHERE ws.is_completed = TRUE
GROUP BY w.user_id, w.id;

-- Seed Initial Exercises with new schema
INSERT INTO exercises (name, body_part, exercise_type, level) VALUES
('Bench Press', 'Chest', 'Strength', 'Intermediate'),
('Squat', 'Legs', 'Strength', 'Intermediate'),
('Deadlift', 'Back', 'Strength', 'Advanced'),
('Overhead Press', 'Shoulders', 'Strength', 'Intermediate'),
('Pull Up', 'Back', 'Strength', 'Intermediate'),
('Bicep Curl', 'Arms', 'Strength', 'Beginner'),
('Tricep Extension', 'Arms', 'Strength', 'Beginner'),
('Leg Press', 'Legs', 'Strength', 'Beginner'),
('Lat Pulldown', 'Back', 'Strength', 'Beginner'),
('Side Lateral Raise', 'Shoulders', 'Strength', 'Beginner');
