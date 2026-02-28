/**
 * Water tracking routes (protected)
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const waterController = require('../controllers/waterController');

router.use(auth);

router.post('/', waterController.logWater);
router.get('/today', waterController.getTodayWater);
router.get('/date', waterController.getWaterByDate);

module.exports = router;
