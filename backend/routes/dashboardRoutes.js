/**
 * Dashboard routes (protected)
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

router.use(auth);

router.get('/today', dashboardController.getTodayDashboard);

module.exports = router;
