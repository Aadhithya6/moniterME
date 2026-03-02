/**
 * User controller
 */
const userService = require('../services/userService');

async function completeOnboarding(req, res, next) {
    try {
        const userId = req.user.id;
        const userData = req.body;

        const user = await userService.completeOnboarding(userId, userData);

        res.json({
            success: true,
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                onboardingCompleted: user.onboarding_completed
            }
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    completeOnboarding,
};
