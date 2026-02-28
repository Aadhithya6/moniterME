/**
 * Workout tracking routes (protected)
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const workoutController = require('../controllers/workoutController');

router.use(auth);

router.post('/session', workoutController.createSession);
router.post('/exercise', workoutController.addExercise);
router.get('/history', workoutController.getHistory);

module.exports = router;
