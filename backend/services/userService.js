/**
 * User service - handles profile updates and onboarding
 */
const pool = require('../config/database');
const AppError = require('../utils/AppError');

/**
 * Complete user onboarding
 */
async function completeOnboarding(userId, data) {
    const {
        age,
        gender,
        height_cm,
        weight_kg,
        activity_level,
        fitness_goal,
        target_weight
    } = data;

    const result = await pool.query(
        `UPDATE users 
     SET age = $1, 
         gender = $2, 
         height_cm = $3, 
         weight_kg = $4, 
         activity_level = $5, 
         fitness_goal = $6, 
         target_weight = $7,
         onboarding_completed = TRUE
     WHERE id = $8
     RETURNING id, name, email, onboarding_completed`,
        [age, gender, height_cm, weight_kg, activity_level, fitness_goal, target_weight, userId]
    );

    if (result.rows.length === 0) {
        throw new AppError('User not found', 404);
    }

    return result.rows[0];
}

module.exports = {
    completeOnboarding,
};
