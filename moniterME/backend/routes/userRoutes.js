const express = require('express');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.post('/onboarding', authMiddleware, userController.completeOnboarding);

module.exports = router;
