-- Migration: Workout V2
-- This script extends the database to support complex workout tracking (sets, exercises, PRs)

-- 1. Predefined Exercises Library
CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    muscle_group VARCHAR(100),
    is_custom BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_exercises_name ON exercises(name);
CREATE INDEX idx_exercises_muscle_group ON exercises(muscle_group);

-- 2. Workouts Table (Successor to workout_sessions)
CREATE TABLE workouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) DEFAULT 'Morning Workout',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workouts_user_id ON workouts(user_id);
CREATE INDEX idx_workouts_user_date ON workouts(user_id, date);

-- 3. Workout Exercises (Mapping exercises to workouts)
CREATE TABLE workout_exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workout_exercises_workout_id ON workout_exercises(workout_id);

-- 4. Workout Sets (Individual sets with weight and reps)
CREATE TABLE workout_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workout_exercise_id UUID NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL,
    weight DECIMAL(6,2),
    reps INTEGER NOT NULL,
    rest_seconds INTEGER DEFAULT 60,
    is_completed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workout_sets_workout_exercise_id ON workout_sets(workout_exercise_id);

-- 5. Personal Records (PRs)
CREATE TABLE personal_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    max_weight DECIMAL(6,2),
    max_volume DECIMAL(10,2),
    achieved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    workout_set_id UUID REFERENCES workout_sets(id) ON DELETE CASCADE
);

CREATE INDEX idx_pr_user_exercise ON personal_records(user_id, exercise_id);

-- Seed Initial Exercises
INSERT INTO exercises (name, muscle_group) VALUES
('Bench Press', 'Chest'),
('Squat', 'Legs'),
('Deadlift', 'Back'),
('Overhead Press', 'Shoulders'),
('Pull Up', 'Back'),
('Bicep Curl', 'Arms'),
('Tricep Extension', 'Arms'),
('Leg Press', 'Legs'),
('Lat Pulldown', 'Back'),
('Side Lateral Raise', 'Shoulders');
