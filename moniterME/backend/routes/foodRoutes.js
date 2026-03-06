/**
 * Food logging routes (protected)
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const foodController = require('../controllers/foodController');

router.use(auth);

router.post('/', foodController.logFood);
router.get('/', foodController.getFoodLogs);

module.exports = router;
