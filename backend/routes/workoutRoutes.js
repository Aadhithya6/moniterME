const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const workoutController = require('../controllers/workoutController');

router.use(auth);

router.get('/exercises', workoutController.searchExercises);
router.post('/sessions', workoutController.createWorkout);
router.get('/sessions/:id', workoutController.getWorkout);
router.post('/exercises', workoutController.addExercise);
router.get('/history', workoutController.getHistory);
router.get('/stats', workoutController.getStats);

module.exports = router;
