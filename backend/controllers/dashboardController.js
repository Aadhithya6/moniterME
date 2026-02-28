/**
 * Dashboard controller
 */
const dashboardService = require('../services/dashboardService');

async function getTodayDashboard(req, res, next) {
  try {
    const userId = req.user.id;
    const dashboard = await dashboardService.getTodayDashboard(userId);
    res.json({ success: true, data: dashboard });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getTodayDashboard,
};
