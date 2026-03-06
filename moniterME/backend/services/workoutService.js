/**
 * Workout tracking service - sessions, exercises, sets, and progress
 */
const pool = require('../config/database');
const AppError = require('../utils/AppError');

/**
 * Exercise Library
 */
async function searchExercises(query, bodyPart, type, equipment, level, page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const params = [
    query || null,
    type || null,
    bodyPart || null,
    equipment || null,
    level || null,
    limit,
    offset
  ];

  const sql = `
    SELECT *, COUNT(*) OVER() as total_count
    FROM exercises
    WHERE
        ($1::VARCHAR IS NULL OR name ILIKE '%' || $1 || '%')
    AND ($2::exercise_type_enum IS NULL OR exercise_type = $2)
    AND ($3::VARCHAR IS NULL OR body_part = $3)
    AND ($4::VARCHAR IS NULL OR equipment = $4)
    AND ($5::exercise_level IS NULL OR level = $5)
    ORDER BY name ASC
    LIMIT $6 OFFSET $7
  `;

  const result = await pool.query(sql, params);
  const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count, 10) : 0;

  return {
    exercises: result.rows.map(r => {
      const { total_count, ...rest } = r;
      return rest;
    }),
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      pages: Math.ceil(total / limit)
    }
  };
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
  // sets: [{ set_number, weight, reps, rest_seconds, is_completed }]
  const values = sets.map((s, i) =>
    `('${workoutExerciseId}', ${s.set_number || i + 1}, ${s.weight || 0}, ${s.reps}, ${s.rest_seconds || 60}, ${s.is_completed !== false})`
  ).join(',');

  const result = await pool.query(
    `INSERT INTO workout_sets (workout_exercise_id, set_number, weight, reps, rest_seconds, is_completed)
     VALUES ${values}
     RETURNING id, workout_exercise_id, set_number, weight, reps, rest_seconds, is_completed`
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
                'body_part', e.body_part,
                'exercise_type', e.exercise_type,
                'notes', we.notes,
                'sets', (
                  SELECT json_agg(
                    json_build_object(
                      'id', ws.id,
                      'set_number', ws.set_number,
                      'weight', ws.weight,
                      'reps', ws.reps,
                      'rest_seconds', ws.rest_seconds,
                      'is_completed', ws.is_completed
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
            COALESCE((SELECT SUM(ws.weight * ws.reps) 
             FROM workout_sets ws 
             JOIN workout_exercises we ON we.id = ws.workout_exercise_id 
             WHERE we.workout_id = w.id AND ws.is_completed = TRUE), 0) as total_volume,
            COALESCE((
              SELECT json_agg(
                json_build_object(
                  'id', we.id,
                  'exerciseName', e.name,
                  'sets', (SELECT COUNT(*) FROM workout_sets WHERE workout_exercise_id = we.id),
                  'reps', (SELECT reps FROM workout_sets WHERE workout_exercise_id = we.id LIMIT 1),
                  'weight', (SELECT weight FROM workout_sets WHERE workout_exercise_id = we.id LIMIT 1)
                ) ORDER BY we.order_index ASC
              )
               FROM workout_exercises we
              JOIN exercises e ON e.id = we.exercise_id
              WHERE we.workout_id = w.id
            ), '[]'::json) as exercises,
            w.calories_burned, w.calories_status
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

/**
 * Complete a workout and trigger AI calorie estimation (background)
 */
async function completeWorkout(workoutId, userId) {
  // 1. Update status to processing
  await pool.query(
    `UPDATE workouts SET calories_status = 'processing' WHERE id = $1 AND user_id = $2`,
    [workoutId, userId]
  );

  // 2. Fetch workout data and user weight for AI
  const workoutData = await getWorkoutDetails(workoutId, userId);

  const userResult = await pool.query(
    'SELECT weight_kg, height_cm, age, gender FROM users WHERE id = $1',
    [userId]
  );
  const userProfile = userResult.rows[0];

  // 3. Trigger background estimation (do not await)
  processCaloriesInBackground(workoutId, workoutData, userProfile);

  return { id: workoutId, status: 'processing' };
}

/**
 * Background worker for AI estimation
 */
async function processCaloriesInBackground(workoutId, workoutData, userProfile) {
  const aiService = require('./aiService'); // Lazy load to avoid circular dep

  try {
    const calories = await aiService.estimateWorkoutCalories(workoutData, userProfile);

    await pool.query(
      `UPDATE workouts 
       SET calories_burned = $1, 
           calories_status = 'completed', 
           calories_estimated_at = NOW() 
       WHERE id = $2`,
      [calories, workoutId]
    );
  } catch (error) {
    console.error(`Background calorie estimation failed for workout ${workoutId}:`, error.message);
    await pool.query(
      `UPDATE workouts SET calories_status = 'failed' WHERE id = $1`,
      [workoutId]
    );
  }
}

/**
 * Retry calorie estimation
 */
async function retryCalories(workoutId, userId) {
  return completeWorkout(workoutId, userId);
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
  completeWorkout,
  retryCalories
};
