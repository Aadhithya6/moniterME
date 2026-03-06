/**
 * Water intake tracking service
 */
const pool = require('../config/database');

/**
 * Log water intake
 */
async function logWater(userId, amountMl, date = new Date().toISOString().split('T')[0]) {
  const result = await pool.query(
    `INSERT INTO water_logs (user_id, amount_ml, date)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, amount_ml, date, created_at`,
    [userId, amountMl, date]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    amountMl: row.amount_ml,
    date: row.date,
    createdAt: row.created_at,
  };
}

/**
 * Get total water intake for today
 */
async function getTodayWater(userId) {
  const today = new Date().toISOString().split('T')[0];
  const result = await pool.query(
    `SELECT COALESCE(SUM(amount_ml), 0) as total
     FROM water_logs
     WHERE user_id = $1 AND date = $2`,
    [userId, today]
  );
  return parseInt(result.rows[0].total, 10);
}

/**
 * Get water logs for a specific date
 */
async function getWaterLogsByDate(userId, date) {
  const result = await pool.query(
    `SELECT id, amount_ml, date, created_at
     FROM water_logs
     WHERE user_id = $1 AND date = $2
     ORDER BY created_at DESC`,
    [userId, date]
  );
  return result.rows;
}

module.exports = {
  logWater,
  getTodayWater,
  getWaterLogsByDate,
};
