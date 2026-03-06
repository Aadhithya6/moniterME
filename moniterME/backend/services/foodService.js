/**
 * Food logging service with AI-powered macro calculation
 */
const axios = require('axios');
const pool = require('../config/database');
const config = require('../config');
const AppError = require('../utils/AppError');

const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const NVIDIA_MODEL = 'meta/llama-3.1-8b-instruct';

const MACRO_SYSTEM_PROMPT = `You are a nutrition expert. Given a food description, return ONLY a valid JSON object with these exact keys:
{
  "calories": number,
  "protein": number,
  "carbs": number,
  "fats": number
}
All values must be numbers. Estimate based on typical serving sizes. Return nothing else - no markdown, no explanation, just the JSON.`;

/**
 * Get macro nutrients from NVIDIA AI
 */
async function getMacrosFromAI(foodText) {
  if (!config.openaiApiKey) {
    throw new AppError('NVIDIA API key is not configured. Set OPENAI_API_KEY.', 503);
  }

  try {
    const response = await axios.post(
      NVIDIA_API_URL,
      {
        model: NVIDIA_MODEL,
        messages: [
          { role: 'system', content: MACRO_SYSTEM_PROMPT },
          { role: 'user', content: foodText },
        ],
        temperature: 0.3,
        max_tokens: 200,
      },
      {
        headers: {
          'Authorization': `Bearer ${config.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const content = response.data.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new AppError('AI could not parse the food. Please try a more specific description.', 400);
    }

    // Remove markdown code blocks if present
    const jsonStr = content.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
    const parsed = JSON.parse(jsonStr);

    if (
      typeof parsed.calories !== 'number' ||
      typeof parsed.protein !== 'number' ||
      typeof parsed.carbs !== 'number' ||
      typeof parsed.fats !== 'number'
    ) {
      throw new AppError('Invalid AI response format.', 500);
    }

    return {
      calories: Math.round(parsed.calories),
      protein: Math.round(parsed.protein),
      carbs: Math.round(parsed.carbs),
      fats: Math.round(parsed.fats),
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new AppError('AI returned invalid data. Please try again.', 500);
    }
    if (error.response?.status === 429) {
      throw new AppError('AI service rate limit. Please try again later.', 503);
    }
    if (error.response?.status === 401) {
      throw new AppError('Invalid NVIDIA API key.', 503);
    }
    throw error;
  }
}

/**
 * Log food entry for user
 */
async function logFood(userId, foodText, date = new Date().toISOString().split('T')[0]) {
  const macros = await getMacrosFromAI(foodText);

  const result = await pool.query(
    `INSERT INTO food_logs (user_id, food_name, calories, protein, carbs, fats, date)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, user_id, food_name, calories, protein, carbs, fats, date, created_at`,
    [userId, foodText, macros.calories, macros.protein, macros.carbs, macros.fats, date]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    foodName: row.food_name,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fats: row.fats,
    date: row.date,
    createdAt: row.created_at,
  };
}

/**
 * Get food logs for user by date
 */
async function getFoodLogsByDate(userId, date) {
  const result = await pool.query(
    `SELECT id, food_name, calories, protein, carbs, fats, date, created_at
     FROM food_logs
     WHERE user_id = $1 AND date = $2
     ORDER BY created_at DESC`,
    [userId, date]
  );
  return result.rows;
}

module.exports = {
  logFood,
  getFoodLogsByDate,
  getMacrosFromAI,
};
