-- Migration: Add calorie tracking columns to workouts table
ALTER TABLE workouts 
ADD COLUMN IF NOT EXISTS calories_burned DECIMAL(8,2),
ADD COLUMN IF NOT EXISTS calories_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS calories_estimated_at TIMESTAMP;

-- Create an index for faster dashboard aggregation
CREATE INDEX IF NOT EXISTS idx_workouts_calories ON workouts (user_id, calories_status, date);
