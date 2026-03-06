// ION.AI Demo Data Loader — Realistic 7-day Indian health dataset for hackathon demo

export function loadDemoData() {
  const today = new Date();
  const getDate = (daysBack: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysBack);
    return d.toISOString().split('T')[0];
  };

  // ── PROFILE ──────────────────────────────────────────────────────────────
  const profile = {
    name: 'Arjun',
    age: 26,
    weight: 72,
    height: 175,
    gender: 'male',
    goal: 'Gain Muscle',
    activityLevel: 'Moderately Active',
    tdee: 2650,
  };
  localStorage.setItem('ion_user_profile', JSON.stringify(profile));

  // ── FOOD SUMMARIES (7 days) ───────────────────────────────────────────────
  const foodDays = [
    { daysBack: 6, totalCalories: 2480, protein: 118, carbs: 280, fat: 72, goal: 2650 },
    { daysBack: 5, totalCalories: 2890, protein: 105, carbs: 340, fat: 98, goal: 2650 }, // slight overage
    { daysBack: 4, totalCalories: 2610, protein: 142, carbs: 265, fat: 78, goal: 2650 },
    { daysBack: 3, totalCalories: 1980, protein: 88, carbs: 215, fat: 62, goal: 2650 }, // under
    { daysBack: 2, totalCalories: 2720, protein: 151, carbs: 295, fat: 85, goal: 2650 },
    { daysBack: 1, totalCalories: 2650, protein: 138, carbs: 278, fat: 80, goal: 2650 }, // perfect
    { daysBack: 0, totalCalories: 0, protein: 0, carbs: 0, fat: 0, goal: 2650 },        // today (blank — they'll add)
  ];

  foodDays.forEach(({ daysBack, totalCalories, protein, carbs, fat, goal }) => {
    if (daysBack === 0) return; // leave today blank
    const date = getDate(daysBack);
    const summary = {
      date,
      totalCalories,
      goal,
      protein,
      carbs,
      fat,
      entries: [],
      water: { consumed: [2100, 1600, 2800, 1400, 2500, 2900][daysBack - 1] || 2000, goal: 3000, log: [] }
    };
    localStorage.setItem(`food_summary_${date}`, JSON.stringify(summary));
  });

  // ── TODAY'S FOOD LOG ───────────────────────────────────────────────────────
  const todayFoods = [
    { id: 'demo_1', name: 'Masala Oats', calories: 320, protein: 12, carbs: 52, fat: 8, emoji: '🥣', timestamp: new Date(today.setHours(8, 30)).toISOString() },
    { id: 'demo_2', name: 'Banana Smoothie', calories: 210, protein: 6, carbs: 38, fat: 4, emoji: '🍌', timestamp: new Date(today.setHours(9, 0)).toISOString() },
    { id: 'demo_3', name: 'Chicken Rice Bowl', calories: 580, protein: 45, carbs: 62, fat: 14, emoji: '🍚', timestamp: new Date(today.setHours(13, 0)).toISOString() },
  ];

  // ── FOOD MEMORY (frequent foods) ─────────────────────────────────────────
  const memory = {
    frequentFoods: [
      { name: 'Masala Oats', calories: 320, protein: 12, carbs: 52, fat: 8, emoji: '🥣', count: 6 },
      { name: 'Chicken Rice Bowl', calories: 580, protein: 45, carbs: 62, fat: 14, emoji: '🍚', count: 5 },
      { name: 'Banana Smoothie', calories: 210, protein: 6, carbs: 38, fat: 4, emoji: '🍌', count: 4 },
      { name: 'Paneer Bhurji', calories: 290, protein: 18, carbs: 10, fat: 20, emoji: '🧀', count: 3 },
      { name: 'Dal Rice', calories: 420, protein: 14, carbs: 72, fat: 8, emoji: '🫘', count: 3 },
      { name: 'Idli Sambar', calories: 240, protein: 8, carbs: 46, fat: 4, emoji: '🫓', count: 2 },
    ],
    eatingSchedule: { breakfast: '08:30', lunch: '13:00', dinner: '19:30' },
    weeklyAvgCalories: 2555,
    streaks: { proteinGoalDays: 3, calorieGoalDays: 2 },
    avgWater: 2200,
  };
  localStorage.setItem('ion_food_memory', JSON.stringify(memory));

  // Store today's food log in sessionStorage-compatible format (page reload will show logs)
  localStorage.setItem('ion_demo_today_food', JSON.stringify(todayFoods));

  // ── WORKOUT LOGS (5 days) ─────────────────────────────────────────────────
  const workoutEntries = [
    { type: 'HIIT', duration: 30, caloriesBurned: 385, intensity: 'high', note: 'Excellent intensity — hydrate well and eat within 45 minutes.', daysBack: 6 },
    { type: 'Gym', duration: 60, caloriesBurned: 420, intensity: 'moderate', note: 'Good volume session — prioritize protein synthesis with 30g protein post-workout.', daysBack: 4 },
    { type: 'Running', duration: 45, caloriesBurned: 490, intensity: 'moderate', note: 'Great cardio base — keep your weekly mileage consistent for adaptation.', daysBack: 3 },
    { type: 'Gym', duration: 75, caloriesBurned: 520, intensity: 'high', note: 'Heavy session — foam roll and get 8 hours sleep for full recovery.', daysBack: 1 },
    { type: 'Yoga', duration: 40, caloriesBurned: 140, intensity: 'low', note: 'Great for flexibility and reducing cortisol — pair with mindful breathing.', daysBack: 0 },
  ];

  const allWorkoutLogs = workoutEntries.map((w, i) => ({
    id: `demo_w_${i}`,
    date: getDate(w.daysBack),
    type: w.type,
    duration: w.duration,
    caloriesBurned: w.caloriesBurned,
    intensity: w.intensity,
    note: w.note,
    timestamp: Date.now() - w.daysBack * 86400000,
  }));
  localStorage.setItem('ion_workout_log', JSON.stringify(allWorkoutLogs));

  // Write per-day burn keys for FoodModule cross-module reads
  workoutEntries.forEach(w => {
    const date = getDate(w.daysBack);
    const existing = Number(localStorage.getItem(`ion_workout_log_${date}`) || 0);
    localStorage.setItem(`ion_workout_log_${date}`, String(existing + w.caloriesBurned));
  });

  // ── SLEEP LOGS (7 days) ───────────────────────────────────────────────────
  const sleepEntries = [
    { daysBack: 6, bedtime: '22:30', wakeTime: '06:30', hoursSlept: 8.0, quality: 'Great', score: 8.8 },
    { daysBack: 5, bedtime: '00:15', wakeTime: '06:00', hoursSlept: 5.75, quality: 'Poor', score: 4.0 }, // low sleep – calorie overage day!
    { daysBack: 4, bedtime: '23:00', wakeTime: '07:00', hoursSlept: 8.0, quality: 'Good', score: 8.0 },
    { daysBack: 3, bedtime: '23:30', wakeTime: '05:45', hoursSlept: 6.25, quality: 'Okay', score: 5.3 },
    { daysBack: 2, bedtime: '22:00', wakeTime: '06:30', hoursSlept: 8.5, quality: 'Great', score: 9.4 },
    { daysBack: 1, bedtime: '23:15', wakeTime: '07:15', hoursSlept: 8.0, quality: 'Good', score: 8.0 },
    { daysBack: 0, bedtime: '23:00', wakeTime: '07:30', hoursSlept: 8.5, quality: 'Great', score: 9.4 },
  ];

  const allSleepLogs = sleepEntries.map((s, i) => ({
    id: `demo_s_${i}`,
    date: getDate(s.daysBack),
    bedtime: s.bedtime,
    wakeTime: s.wakeTime,
    hoursSlept: s.hoursSlept,
    quality: s.quality,
    score: s.score,
    timestamp: Date.now() - s.daysBack * 86400000,
  }));
  localStorage.setItem('ion_sleep_log', JSON.stringify(allSleepLogs));

  // Write per-day sleep hour keys
  sleepEntries.forEach(s => {
    localStorage.setItem(`ion_sleep_log_${getDate(s.daysBack)}`, String(s.hoursSlept));
  });

  // ── WATER LOGS (today) ───────────────────────────────────────────────────
  // Mark as already having 1200ml today so the agent has something to reference
  localStorage.setItem('ion_demo_water_preloaded', '1200');

  // ── CLEAR OLD AGENT TRACKER so agents fire fresh ─────────────────────────
  localStorage.setItem('ion_agent_tracker', JSON.stringify({}));

  return { profile, todayFoods, memory };
}
