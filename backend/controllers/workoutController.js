/**
 * Workout tracking controller
 */
const workoutService = require('../services/workoutService');

async function createSession(req, res, next) {
  try {
    const { date } = req.body;
    const userId = req.user.id;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const session = await workoutService.createSession(userId, targetDate);
    res.status(201).json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
}

async function addExercise(req, res, next) {
  try {
    const { session_id, exercise_name, sets, reps, weight } = req.body;
    const userId = req.user.id;

    if (!session_id || !exercise_name || sets === undefined || reps === undefined) {
      return res.status(400).json({
        success: false,
        error: 'session_id, exercise_name, sets, and reps are required',
      });
    }

    const exercise = await workoutService.addExercise(
      session_id,
      userId,
      exercise_name,
      parseInt(sets, 10),
      parseInt(reps, 10),
      weight != null ? parseFloat(weight) : null
    );
    res.status(201).json({ success: true, data: exercise });
  } catch (error) {
    next(error);
  }
}

async function getHistory(req, res, next) {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit, 10) || 30;
    const history = await workoutService.getHistory(userId, limit);
    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createSession,
  addExercise,
  getHistory,
};
