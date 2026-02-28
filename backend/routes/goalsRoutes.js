/**
 * Goals routes (protected)
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const goalsController = require('../controllers/goalsController');

router.use(auth);

router.post('/', goalsController.upsertGoals);
router.get('/', goalsController.getGoals);

module.exports = router;
