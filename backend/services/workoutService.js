/**
 * Workout tracking service - sessions, exercises, sets, and progress
 */
const pool = require('../config/database');
const AppError = require('../utils/AppError');

/**
 * Exercise Library
 */
async function searchExercises(query, muscleGroup) {
  let sql = 'SELECT * FROM exercises WHERE 1=1';
  const params = [];

  if (query) {
    params.push(`%${query}%`);
    sql += ` AND name ILIKE $${params.length}`;
  }

  if (muscleGroup) {
    params.push(muscleGroup);
    sql += ` AND muscle_group = $${params.length}`;
  }

  sql += ' ORDER BY name ASC LIMIT 50';
  const result = await pool.query(sql, params);
  return result.rows;
}

/**
 * Create a new workout session (V2)
 */
async function createWorkout(userId, name, date = new Date().toISOString().split('T')[0]) {
  const result = await pool.query(
    `INSERT INTO workouts (user_id, name, date)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, name, date, created_at`,
    [userId, name || 'Morning Workout', date]
  );
  return result.rows[0];
}

/**
 * Add exercise to workout
 */
async function addExerciseToWorkout(workoutId, exerciseId, orderIndex, notes = '') {
  const result = await pool.query(
    `INSERT INTO workout_exercises (workout_id, exercise_id, order_index, notes)
     VALUES ($1, $2, $3, $4)
     RETURNING id, workout_id, exercise_id, order_index, notes`,
    [workoutId, exerciseId, orderIndex, notes]
  );
  return result.rows[0];
}

/**
 * Add sets to a workout exercise
 */
async function addSets(workoutExerciseId, sets) {
  // sets: [{ set_number, weight, reps, rest_seconds }]
  const values = sets.map((s, i) =>
    `('${workoutExerciseId}', ${s.set_number || i + 1}, ${s.weight || 0}, ${s.reps}, ${s.rest_seconds || 60})`
  ).join(',');

  const result = await pool.query(
    `INSERT INTO workout_sets (workout_exercise_id, set_number, weight, reps, rest_seconds)
     VALUES ${values}
     RETURNING id, workout_exercise_id, set_number, weight, reps, rest_seconds`
  );
  return result.rows;
}

/**
 * Get workout details with exercises and sets
 */
async function getWorkoutDetails(workoutId, userId) {
  const result = await pool.query(
    `SELECT w.*, 
            json_agg(
              json_build_object(
                'id', we.id,
                'exercise_id', we.exercise_id,
                'name', e.name,
                'muscle_group', e.muscle_group,
                'notes', we.notes,
                'sets', (
                  SELECT json_agg(
                    json_build_object(
                      'id', ws.id,
                      'set_number', ws.set_number,
                      'weight', ws.weight,
                      'reps', ws.reps,
                      'rest_seconds', ws.rest_seconds
                    ) ORDER BY ws.set_number ASC
                  )
                  FROM workout_sets ws
                  WHERE ws.workout_exercise_id = we.id
                )
              ) ORDER BY we.order_index ASC
            ) as exercises
     FROM workouts w
     LEFT JOIN workout_exercises we ON we.workout_id = w.id
     LEFT JOIN exercises e ON e.id = we.exercise_id
     WHERE w.id = $1 AND w.user_id = $2
     GROUP BY w.id`,
    [workoutId, userId]
  );

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  // Filter out null exercises (if no exercises added yet)
  row.exercises = row.exercises.filter(ex => ex.id !== null);
  return row;
}

/**
 * Get workout history for user
 */
async function getHistory(userId, limit = 30) {
  const result = await pool.query(
    `SELECT w.id, w.name, w.date, w.created_at,
            (SELECT COUNT(*) FROM workout_exercises WHERE workout_id = w.id) as exercise_count,
            (SELECT SUM(ws.weight * ws.reps) 
             FROM workout_sets ws 
             JOIN workout_exercises we ON we.id = ws.workout_exercise_id 
             WHERE we.workout_id = w.id) as total_volume
     FROM workouts w
     WHERE w.user_id = $1
     ORDER BY w.date DESC, w.created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}

/**
 * Get personal records for an exercise
 */
async function getPersonalRecords(userId, exerciseId) {
  const result = await pool.query(
    `SELECT * FROM personal_records 
     WHERE user_id = $1 AND exercise_id = $2
     ORDER BY achieved_at DESC LIMIT 1`,
    [userId, exerciseId]
  );
  return result.rows[0];
}

/**
 * Legacy support for dashboard workout count
 */
async function getWorkoutCountByDate(userId, date) {
  const result = await pool.query(
    `SELECT COUNT(*) as count
     FROM workouts
     WHERE user_id = $1 AND date = $2`,
    [userId, date]
  );
  return parseInt(result.rows[0].count, 10);
}

module.exports = {
  searchExercises,
  createWorkout,
  addExerciseToWorkout,
  addSets,
  getWorkoutDetails,
  getHistory,
  getPersonalRecords,
  getWorkoutCountByDate,
};
