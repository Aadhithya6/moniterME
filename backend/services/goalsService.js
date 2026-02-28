/**
 * Fitness goals service
 */
const pool = require('../config/database');

/**
 * Create or update user goals
 */
async function upsertGoals(userId, { calorieGoal, proteinGoal, waterGoal, targetWeight }) {
  const existing = await pool.query(
    'SELECT id FROM goals WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1',
    [userId]
  );

  if (existing.rows.length > 0) {
    const goalId = existing.rows[0].id;
    const result = await pool.query(
      `UPDATE goals 
       SET calorie_goal = COALESCE($2, calorie_goal),
           protein_goal = COALESCE($3, protein_goal),
           water_goal = COALESCE($4, water_goal),
           target_weight = COALESCE($5, target_weight),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, user_id, calorie_goal, protein_goal, water_goal, target_weight, updated_at`,
      [goalId, calorieGoal, proteinGoal, waterGoal, targetWeight]
    );
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      calorieGoal: row.calorie_goal,
      proteinGoal: row.protein_goal,
      waterGoal: row.water_goal,
      targetWeight: row.target_weight ? parseFloat(row.target_weight) : null,
      updatedAt: row.updated_at,
    };
  }

  const result = await pool.query(
    `INSERT INTO goals (user_id, calorie_goal, protein_goal, water_goal, target_weight)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, calorie_goal, protein_goal, water_goal, target_weight, updated_at`,
    [userId, calorieGoal, proteinGoal, waterGoal, targetWeight]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    calorieGoal: row.calorie_goal,
    proteinGoal: row.protein_goal,
    waterGoal: row.water_goal,
    targetWeight: row.target_weight ? parseFloat(row.target_weight) : null,
    updatedAt: row.updated_at,
  };
}

/**
 * Get user's current goals
 */
async function getGoals(userId) {
  const result = await pool.query(
    `SELECT id, calorie_goal, protein_goal, water_goal, target_weight, updated_at
     FROM goals
     WHERE user_id = $1
     ORDER BY updated_at DESC
     LIMIT 1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    calorieGoal: row.calorie_goal,
    proteinGoal: row.protein_goal,
    waterGoal: row.water_goal,
    targetWeight: row.target_weight ? parseFloat(row.target_weight) : null,
    updatedAt: row.updated_at,
  };
}

module.exports = {
  upsertGoals,
  getGoals,
};
