/**
 * AI Service - handles LLM interactions for calorie estimation
 */
const { OpenAI } = require('openai');
const config = require('../config');

const openai = new OpenAI({
    apiKey: config.openaiApiKey,
    baseURL: 'https://integrate.api.nvidia.com/v1',
});

/**
 * Estimate calories burned for a workout session
 */
async function estimateWorkoutCalories(workoutData, userProfile) {
    const prompt = `
    You are a sports physiology assistant.
    Estimate total calories burned for this completed workout.

    Return ONLY valid JSON:
    {
      "calories_burned": number
    }

    Consider:
    - User body weight: ${userProfile.weight_kg}kg
    - User height: ${userProfile.height_cm}cm
    - User age: ${userProfile.age}
    - User gender: ${userProfile.gender}
    - Total volume (weight × reps)
    - Exercise types
    - Workout duration
    - Rest intervals
    - Overall intensity

    Workout Data:
    ${JSON.stringify(workoutData, null, 2)}

    Do not return explanations. 
    Do not return text outside JSON.
  `;

    try {
        const response = await openai.chat.completions.create({
            model: "abacusai/dracarys-llama-3.1-70b-instruct",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1,
            max_tokens: 150,
            response_format: { type: "json_object" }
        });

        let content = response.choices[0].message.content.trim();

        // Find JSON block if AI wrapped it in markdown
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in AI response');
        }

        const result = JSON.parse(jsonMatch[0]);

        if (!result.calories_burned || typeof result.calories_burned !== 'number') {
            throw new Error('Invalid AI response format');
        }

        const cals = result.calories_burned;

        // Validation: 0 < calories < 3000
        if (cals <= 0 || cals > 3000) {
            throw new Error(`Unrealistic calorie value: ${cals}`);
        }

        return cals;
    } catch (error) {
        console.error('AI Calorie Estimation Error:', error.message);
        throw error;
    }
}

module.exports = {
    estimateWorkoutCalories,
};
