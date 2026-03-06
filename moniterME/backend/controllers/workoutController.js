/**
 * Workout tracking controller
 */
const workoutService = require('../services/workoutService');

async function searchExercises(req, res, next) {
  try {
    const { q, type, bodyPart, equipment, level, page, limit } = req.query;
    const result = await workoutService.searchExercises(q, bodyPart, type, equipment, level, page, limit);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

async function createWorkout(req, res, next) {
  try {
    const { name, date } = req.body;
    const userId = req.user.id;
    const workout = await workoutService.createWorkout(userId, name, date);
    res.status(201).json({ success: true, data: workout });
  } catch (error) {
    next(error);
  }
}

async function getWorkout(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const workout = await workoutService.getWorkoutDetails(id, userId);
    if (!workout) {
      return res.status(404).json({ success: false, error: 'Workout not found' });
    }
    res.json({ success: true, data: workout });
  } catch (error) {
    next(error);
  }
}

async function addExercise(req, res, next) {
  try {
    const { workout_id, exercise_id, order_index, notes, sets } = req.body;

    const workoutEx = await workoutService.addExerciseToWorkout(
      workout_id,
      exercise_id,
      order_index,
      notes
    );

    if (sets && sets.length > 0) {
      const addedSets = await workoutService.addSets(workoutEx.id, sets);
      workoutEx.sets = addedSets;
    }

    res.status(201).json({ success: true, data: workoutEx });
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

async function getStats(req, res, next) {
  try {
    const userId = req.user.id;
    // Basic stats for now, can be expanded
    const history = await workoutService.getHistory(userId, 365);
    const totalVolume = history.reduce((sum, w) => sum + parseFloat(w.total_volume || 0), 0);
    const totalWorkouts = history.length;

    res.json({
      success: true,
      data: {
        totalWorkouts,
        totalVolume,
        history: history.slice(0, 7) // Last 7 for charts
      }
    });
  } catch (error) {
    next(error);
  }
}

async function completeWorkout(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const result = await workoutService.completeWorkout(id, userId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function retryCalories(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const result = await workoutService.retryCalories(id, userId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  searchExercises,
  createWorkout,
  getWorkout,
  addExercise,
  getHistory,
  getStats,
  completeWorkout,
  retryCalories,
};
