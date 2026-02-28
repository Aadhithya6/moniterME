/**
 * Water tracking controller
 */
const waterService = require('../services/waterService');

async function logWater(req, res, next) {
  try {
    const { amount_ml, date } = req.body;
    const userId = req.user.id;

    if (!amount_ml || amount_ml < 1) {
      return res.status(400).json({
        success: false,
        error: 'amount_ml is required and must be a positive number',
      });
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    const entry = await waterService.logWater(userId, parseInt(amount_ml, 10), targetDate);
    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
}

async function getTodayWater(req, res, next) {
  try {
    const userId = req.user.id;
    const { date } = req.query;
    
    if (date) {
      // If date provided, get water for that date
      const logs = await waterService.getWaterLogsByDate(userId, date);
      const total = logs.reduce((sum, log) => sum + parseInt(log.amount_ml, 10), 0);
      return res.json({ success: true, data: { totalMl: total, date } });
    }
    
    // Otherwise get today's water
    const total = await waterService.getTodayWater(userId);
    res.json({ success: true, data: { totalMl: total } });
  } catch (error) {
    next(error);
  }
}

async function getWaterByDate(req, res, next) {
  try {
    const userId = req.user.id;
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'date query parameter is required (format: YYYY-MM-DD)',
      });
    }

    const logs = await waterService.getWaterLogsByDate(userId, date);
    const total = logs.reduce((sum, log) => sum + parseInt(log.amount_ml, 10), 0);
    
    res.json({ 
      success: true, 
      data: { 
        date,
        totalMl: total,
        logs 
      } 
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  logWater,
  getTodayWater,
  getWaterByDate,
};
