/**
 * Food logging controller
 */
const foodService = require('../services/foodService');

async function logFood(req, res, next) {
  try {
    const { food_text, date } = req.body;
    const userId = req.user.id;

    if (!food_text || typeof food_text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'food_text is required and must be a string',
      });
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    const entry = await foodService.logFood(userId, food_text.trim(), targetDate);
    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
}

async function getFoodLogs(req, res, next) {
  try {
    const { date } = req.query;
    const userId = req.user.id;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const logs = await foodService.getFoodLogsByDate(userId, targetDate);
    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  logFood,
  getFoodLogs,
};
