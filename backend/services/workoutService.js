/**
 * Workout tracking service - sessions and exercises
 */
const pool = require('../config/database');
const AppError = require('../utils/AppError');

/**
 * Create a new workout session
 */
async function createSession(userId, date = new Date().toISOString().split('T')[0]) {
  const result = await pool.query(
    `INSERT INTO workout_sessions (user_id, date)
     VALUES ($1, $2)
     RETURNING id, user_id, date, created_at`,
    [userId, date]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    createdAt: row.created_at,
  };
}

/**
 * Add exercise to workout session
 */
async function addExercise(sessionId, userId, exerciseName, sets, reps, weight = null) {
  // Verify session belongs to user
  const sessionCheck = await pool.query(
    'SELECT id FROM workout_sessions WHERE id = $1 AND user_id = $2',
    [sessionId, userId]
  );

  if (sessionCheck.rows.length === 0) {
    throw new AppError('Workout session not found', 404);
  }

  const result = await pool.query(
    `INSERT INTO exercises (workout_session_id, exercise_name, sets, reps, weight)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, workout_session_id, exercise_name, sets, reps, weight, created_at`,
    [sessionId, exerciseName, sets, reps, weight]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    workoutSessionId: row.workout_session_id,
    exerciseName: row.exercise_name,
    sets: row.sets,
    reps: row.reps,
    weight: row.weight,
    createdAt: row.created_at,
  };
}

/**
 * Get workout history for user
 */
async function getHistory(userId, limit = 30) {
  const result = await pool.query(
    `SELECT ws.id, ws.date, ws.created_at,
            json_agg(
              json_build_object(
                'id', e.id,
                'exerciseName', e.exercise_name,
                'sets', e.sets,
                'reps', e.reps,
                'weight', e.weight
              )
            ) as exercises
     FROM workout_sessions ws
     LEFT JOIN exercises e ON e.workout_session_id = ws.id
     WHERE ws.user_id = $1
     GROUP BY ws.id, ws.date, ws.created_at
     ORDER BY ws.date DESC
     LIMIT $2`,
    [userId, limit]
  );

  return result.rows.map((row) => ({
    id: row.id,
    date: row.date,
    createdAt: row.created_at,
    exercises: row.exercises?.filter((e) => e.id) || [],
  }));
}

/**
 * Get workout count for a specific date
 */
async function getWorkoutCountByDate(userId, date) {
  const result = await pool.query(
    `SELECT COUNT(*) as count
     FROM workout_sessions
     WHERE user_id = $1 AND date = $2`,
    [userId, date]
  );
  return parseInt(result.rows[0].count, 10);
}

module.exports = {
  createSession,
  addExercise,
  getHistory,
  getWorkoutCountByDate,
};
