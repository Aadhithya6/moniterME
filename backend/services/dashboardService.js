/**
 * Dashboard aggregation service
 */
const pool = require('../config/database');
const goalsService = require('./goalsService');

/**
 * Get today's dashboard data with goal completion percentages
 */
async function getTodayDashboard(userId) {
  const today = new Date().toISOString().split('T')[0];

  // Aggregate food totals
  const foodResult = await pool.query(
    `SELECT 
       COALESCE(SUM(calories), 0) as total_calories,
       COALESCE(SUM(protein), 0) as total_protein,
       COALESCE(SUM(carbs), 0) as total_carbs,
       COALESCE(SUM(fats), 0) as total_fats
     FROM food_logs
     WHERE user_id = $1 AND date = $2`,
    [userId, today]
  );

  // Water total
  const waterResult = await pool.query(
    `SELECT COALESCE(SUM(amount_ml), 0) as total_water
     FROM water_logs
     WHERE user_id = $1 AND date = $2`,
    [userId, today]
  );

  // Workout count
  const workoutResult = await pool.query(
    `SELECT COUNT(*) as count
     FROM workout_sessions
     WHERE user_id = $1 AND date = $2`,
    [userId, today]
  );

  const food = foodResult.rows[0];
  const totalCalories = parseInt(food.total_calories, 10);
  const totalProtein = parseInt(food.total_protein, 10);
  const totalCarbs = parseInt(food.total_carbs, 10);
  const totalFats = parseInt(food.total_fats, 10);
  const totalWater = parseInt(waterResult.rows[0].total_water, 10);
  const workoutCount = parseInt(workoutResult.rows[0].count, 10);

  const goals = await goalsService.getGoals(userId);

  const calcPercent = (actual, goal) => {
    if (!goal || goal <= 0) return null;
    return Math.min(100, Math.round((actual / goal) * 100));
  };

  return {
    date: today,
    totals: {
      calories: totalCalories,
      protein: totalProtein,
      carbs: totalCarbs,
      fats: totalFats,
      waterMl: totalWater,
      workoutCount,
    },
    goals: goals
      ? {
          calorieGoal: goals.calorieGoal,
          proteinGoal: goals.proteinGoal,
          waterGoal: goals.waterGoal,
          targetWeight: goals.targetWeight,
        }
      : null,
    completion: {
      calories: calcPercent(totalCalories, goals?.calorieGoal),
      protein: calcPercent(totalProtein, goals?.proteinGoal),
      water: calcPercent(totalWater, goals?.waterGoal),
    },
  };
}

module.exports = {
  getTodayDashboard,
};
