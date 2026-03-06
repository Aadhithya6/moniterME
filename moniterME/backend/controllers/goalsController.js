/**
 * Goals controller
 */
const goalsService = require('../services/goalsService');

async function upsertGoals(req, res, next) {
  try {
    const { calorie_goal, protein_goal, water_goal, target_weight } = req.body;
    const userId = req.user.id;

    const goals = await goalsService.upsertGoals(userId, {
      calorieGoal: calorie_goal,
      proteinGoal: protein_goal,
      waterGoal: water_goal,
      targetWeight: target_weight,
    });
    res.json({ success: true, data: goals });
  } catch (error) {
    next(error);
  }
}

async function getGoals(req, res, next) {
  try {
    const userId = req.user.id;
    const goals = await goalsService.getGoals(userId);
    res.json({ success: true, data: goals });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  upsertGoals,
  getGoals,
};
