import React, { useState, useRef, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { routeAgentTask } from '../lib/agentRouter';
import { loadDemoData } from '../lib/demoData';
import { readMemory } from '../lib/ionMemory';
import { syncWearableData } from '../services/wearableSyncService';
import { calculateRecoveryScore } from '../services/recoveryEngine';
import { generateProactiveInsight } from '../agents/healthInsightAgent';


type ChatMessage = {
  sender: 'user' | 'agent';
  text: string;
  isProactive?: boolean;
  cta?: {
    label: string;
    action: string;
  };
  cta2?: {
    label: string;
    action: string;
  };
  verdictCard?: {
    verdict: 'great choice' | 'okay' | 'not ideal' | 'avoid';
    reason: string;
    alternative: string | null;
    water_warning?: string | null;
    macros: { calories: number; protein: number; carbs: number; fat: number };
  };
};

type FoodEntry = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  emoji: string;
  timestamp: string;
};

type NextMealSuggestion = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  reason: string;
  emoji: string;
};

type TomorrowPlanMeal = {
  meal: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  emoji: string;
};

type WaterEntry = {
  amount: number;
  timestamp: number;
  label: string;
};

type WeeklyReportData = {
  day: string;
  kcal: number;
  goal: number;
};

type WeeklyStats = {
  total: number;
  avg: number;
  bestDay: string;
  worstDay: string;
  data: WeeklyReportData[];
};

type FrequentFood = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  emoji: string;
  count: number;
};

type FoodMemory = {
  frequentFoods: FrequentFood[];
  eatingSchedule: { breakfast: string; lunch: string; dinner: string };
  weeklyAvgCalories: number;
  streaks: { proteinGoalDays: number; calorieGoalDays: number };
  avgWater?: number;
};

type UserProfile = {
  name: string;
  age: number;
  weight: number;
  height: number;
  gender: 'male' | 'female';
  goal: 'Lose Weight' | 'Maintain' | 'Gain Muscle';
  activityLevel: 'Sedentary' | 'Lightly Active' | 'Moderately Active' | 'Very Active';
  tdee: number;
};

export default function FoodModule() {
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('ion_user_profile');
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (p.tdee) return p;
      } catch (e) { }
    }
    return null;
  });

  const [setupData, setSetupData] = useState<Partial<UserProfile>>({
    name: '', age: 25, weight: 70, height: 170, gender: 'male', goal: 'Maintain', activityLevel: 'Moderately Active'
  });

  const [dailyGoal, setDailyGoal] = useState<number>(() => {
    const saved = localStorage.getItem('ion_user_profile');
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (p.tdee) return p.tdee;
      } catch (e) { }
    }
    return 2000;
  });
  const [logs, setLogs] = useState<FoodEntry[]>([]);

  // AI Form State
  const [inputMode, setInputMode] = useState<'text' | 'photo'>('text');
  const [textInput, setTextInput] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsedResult, setParsedResult] = useState<any | null>(null);

  // AI Suggestions State
  const [agentDecision, setAgentDecision] = useState<any | null>(null);
  const [loadingDecision, setLoadingDecision] = useState(false);
  const [showDecisionReasoning, setShowDecisionReasoning] = useState(false);
  const [planTomorrow, setPlanTomorrow] = useState<{ plan: TomorrowPlanMeal[], reasoning_steps: string[] } | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [showTomorrowReasoning, setShowTomorrowReasoning] = useState(false);

  // Summary State
  const [showSummary, setShowSummary] = useState(false);

  // Water State
  const [waterConsumed, setWaterConsumed] = useState<number>(0);
  const [waterGoal, setWaterGoal] = useState<number>(2500);
  const [waterLog, setWaterLog] = useState<WaterEntry[]>([]);
  const [showCustomWater, setShowCustomWater] = useState(false);
  const [customWaterAmount, setCustomWaterAmount] = useState('');

  useEffect(() => {
    if (profile) {
      const goals = { 'Sedentary': 2000, 'Lightly Active': 2500, 'Moderately Active': 3000, 'Very Active': 3500 };
      setWaterGoal(goals[profile.activityLevel] || 2500);
    }
  }, [profile]);

  const logWater = (amount: number, label: string) => {
    setWaterConsumed(prev => prev + amount);
    setWaterLog(prev => [...prev, { amount, timestamp: Date.now(), label }]);
    showToast(`Hydration logged: ${label} +${amount}ml 💧`);
    setShowCustomWater(false);
    setCustomWaterAmount('');
  };

  // Weekly Report State
  const [showWeeklyReport, setShowWeeklyReport] = useState(false);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [weeklyWin, setWeeklyWin] = useState<string | null>(null);
  const [loadingWin, setLoadingWin] = useState(false);
  const [insight, setInsight] = useState<{ motivational: string, actionable: string } | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  // Unified Agent Stats
  const [unifiedInsight, setUnifiedInsight] = useState<string | null>(null);
  const [loadingUnified, setLoadingUnified] = useState(false);
  const [showUnifiedModal, setShowUnifiedModal] = useState(false);

  // Polish state handlers
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [routingSteps, setRoutingSteps] = useState<string[]>([]);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [completedNodes, setCompletedNodes] = useState<string[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);
  const [wearableCalories, setWearableCalories] = useState(0);

  // Onboarding step
  const [onboardingStep, setOnboardingStep] = useState<1 | 2 | 3>(1);

  // Proactive State
  const [activeBanners, setActiveBanners] = useState<{ id: string; title: string; body: string; action: 'suggestion' | 'log' | 'summary' | 'log_150ml' | 'log_250ml' | 'log_500ml' }[]>([]);

  // Memory State
  const [memory, setMemory] = useState<FoodMemory>(() => {
    const saved = localStorage.getItem('ion_food_memory');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return {
      frequentFoods: [],
      eatingSchedule: { breakfast: '09:00', lunch: '13:00', dinner: '19:00' },
      weeklyAvgCalories: 2000,
      streaks: { proteinGoalDays: 0, calorieGoalDays: 0 }
    };
  });
  const [patternInsight, setPatternInsight] = useState<string | null>(null);
  const [showPatternInsight, setShowPatternInsight] = useState(true);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  // Agent intro message on first load
  useEffect(() => {
    if (!profile || chatMessages.length > 0) return;
    const alreadySent = sessionStorage.getItem('ion_intro_sent');
    if (alreadySent) return;
    sessionStorage.setItem('ion_intro_sent', '1');
    const hour = new Date().getHours();
    const tip =
      hour < 10 ? `Start your day with 500ml water before breakfast — it kickstarts your metabolism.` :
        hour < 14 ? `You're in the peak performance window. Make your next meal protein-rich.` :
          hour < 18 ? `Afternoon slump? Avoid simple carbs — choose a protein snack instead.` :
            `Evening — wrap up your nutrition goal. You need ${profile.tdee - logs.reduce((s, l) => s + l.calories, 0)} kcal more.`;
    setTimeout(() => {
      setChatMessages([{
        sender: 'agent',
        text: `Hey ${profile.name}. I'm ION — your personal health agent.\nYour goal today is ${profile.tdee} kcal. You've got ${Math.max(0, profile.tdee - logs.reduce((s, l) => s + l.calories, 0))} kcal left.\n${tip}\nWhat did you last eat?`,
        isProactive: true,
      }]);
    }, 800);
  }, [profile]);

  useEffect(() => {
    // Sync wearable calories from memory
    const mem = readMemory();
    const today = new Date().toISOString().split('T')[0];
    const wearEvs = mem.episodes.filter(e => e.date === today && e.type === 'WEARABLE_CALORIES');
    if (wearEvs.length > 0) {
      // Find latest or sum? Instructions say "Increase calorie allowance". 
      // Google Fit TDEE is usually a growing number or a prediction. 
      // Let's assume we take the latest value for today.
      const val = wearEvs[0].data?.value || 0;
      setWearableCalories(val > 2000 ? val - 2000 : 0); // Assuming > 2k is active burn above baseline
    }
  }, []);

  // Load demo today's food if demo data was set
  useEffect(() => {
    const demoFoods = localStorage.getItem('ion_demo_today_food');
    const demoWater = localStorage.getItem('ion_demo_water_preloaded');
    if (demoFoods && logs.length === 0) {
      try {
        const foods = JSON.parse(demoFoods);
        setLogs(foods);
        localStorage.removeItem('ion_demo_today_food');
      } catch { }
    }
    if (demoWater && waterConsumed === 0) {
      const ml = Number(demoWater);
      if (ml > 0) {
        setWaterConsumed(ml);
        localStorage.removeItem('ion_demo_water_preloaded');
      }
    }
  }, []);

  const stateRef = useRef({ logs, dailyGoal, profile, memory, waterConsumed, waterGoal });
  useEffect(() => {
    stateRef.current = { logs, dailyGoal, profile, memory, waterConsumed, waterGoal };
  }, [logs, dailyGoal, profile, memory, waterConsumed, waterGoal]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const checkTriggers = () => {
      const { logs, dailyGoal, profile, memory } = stateRef.current;
      if (!profile) return;

      const totalCalories = logs.reduce((sum, log) => sum + log.calories, 0);
      const now = new Date();
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();
      const todayDate = now.toISOString().split('T')[0];
      const trackerKey = `ion_notif_tracker_${todayDate}`;

      let tracker = {
        meal_breakfast: false, meal_lunch: false, meal_dinner: false,
        underEating: false, goalReached: false, eod: false
      };

      try {
        const saved = localStorage.getItem(trackerKey);
        if (saved) tracker = { ...tracker, ...JSON.parse(saved) };
      } catch (e) { }

      const triggerNotif = (id: keyof typeof tracker, title: string, body: string, action: 'suggestion' | 'log' | 'summary' | 'log_150ml' | 'log_250ml' | 'log_500ml') => {
        tracker[id] = true;
        localStorage.setItem(trackerKey, JSON.stringify(tracker));

        if ('Notification' in window && Notification.permission === 'granted') {
          const notif = new Notification(title, { body, icon: '/favicon.ico' });
          notif.onclick = () => {
            window.focus();
            handleBannerAction(id, action);
          };
        } else {
          setActiveBanners(prev => {
            if (prev.find(b => b.id === id)) return prev;
            return [...prev, { id, title, body, action }];
          });
        }
      };

      // 1. Meal reminder
      const schedule = memory.eatingSchedule || { breakfast: '08:00', lunch: '13:00', dinner: '19:00' };
      const meals = [
        { id: 'meal_breakfast' as const, time: schedule.breakfast || '08:00', name: 'Breakfast' },
        { id: 'meal_lunch' as const, time: schedule.lunch || '13:00', name: 'Lunch' },
        { id: 'meal_dinner' as const, time: schedule.dinner || '19:00', name: 'Dinner' }
      ];

      meals.forEach(m => {
        if (tracker[m.id]) return;
        const [mH, mM] = m.time.split(':').map(Number);
        const mealTimeMins = mH * 60 + mM;
        const nowMins = currentHour * 60 + currentMin;

        if (Math.abs(nowMins - mealTimeMins) <= 30) {
          const lastLog = logs.length > 0 ? new Date(logs[0].timestamp).getTime() : 0;
          const hoursSinceLastLog = (now.getTime() - lastLog) / (1000 * 60 * 60);
          if (hoursSinceLastLog >= 3 || logs.length === 0) {
            triggerNotif(m.id, `Time for ${m.name}! 🍽️`, `Hey ${profile.name}, want a quick suggestion?`, 'suggestion');
          }
        }
      });

      // 2. Under-eating alert
      if (currentHour >= 18 && !tracker.underEating) {
        if (totalCalories < dailyGoal * 0.5) {
          triggerNotif('underEating', `Don't skip meals 💪`, `You've only had ${totalCalories} kcal today. Your body needs fuel!`, 'log');
        }
      }

      // 3. Goal reached
      if (totalCalories >= dailyGoal * 0.95 && !tracker.goalReached) {
        triggerNotif('goalReached', `Goal Met ✅`, `Nice work ${profile.name}! You're close to your ${dailyGoal} kcal goal.`, 'summary');
      }

      // 4. End of day prompt
      if (currentHour >= 21 && !tracker.eod) {
        const isSummarySaved = !!localStorage.getItem(`food_summary_${todayDate}`);
        if (!isSummarySaved) {
          triggerNotif('eod', `Daily Wrap up 📊`, `Ready to wrap up today? Tap to see your daily summary.`, 'summary');
        }
      }
    };

    const intervalId = setInterval(checkTriggers, 60000);
    setTimeout(checkTriggers, 2000);
    return () => clearInterval(intervalId);
  }, []);

  // --- Proactive Agent Loop ---
  useEffect(() => {
    if (!profile) return;

    const runAgentLoop = () => {
      const { logs, dailyGoal } = stateRef.current;
      const consumed = logs.reduce((sum, log) => sum + log.calories, 0);
      const goal = dailyGoal;

      const lastLogged = logs.length > 0 ? new Date(logs[0].timestamp).getTime() : 0;
      const hoursSinceLastLog = lastLogged ? (Date.now() - lastLogged) / 3600000 : Infinity;
      const hour = new Date().getHours();

      const todayDate = new Date().toISOString().split('T')[0];
      const trackerKey = `ion_proactive_agent_${todayDate}`;

      const waterPct = waterConsumed / waterGoal;

      let tracker: Record<string, boolean> = {};
      try {
        const saved = localStorage.getItem(trackerKey);
        if (saved) tracker = JSON.parse(saved);
      } catch (e) { }

      const triggerMessage = (id: string, text: string, ctaLabel: string, action: string, cta2Label?: string, action2?: string) => {
        if (tracker[id]) return; // Already triggered today

        tracker[id] = true;
        localStorage.setItem(trackerKey, JSON.stringify(tracker));

        setChatMessages(prev => {
          if (prev.some(m => m.text === text)) return prev;
          const msgObj: ChatMessage = { sender: 'agent', text, isProactive: true, cta: { label: ctaLabel, action } };
          if (cta2Label && action2) msgObj.cta2 = { label: cta2Label, action: action2 };
          return [...prev, msgObj];
        });
      };

      const workoutLogRaw = localStorage.getItem('ion_workout_log');
      let waterBeforeWorkout = 0;
      let workedOutToday = false;
      if (workoutLogRaw) {
        try {
          const wLogs = JSON.parse(workoutLogRaw);
          const todayWorkout = wLogs.find((w: any) => new Date(w.timestamp).toISOString().split('T')[0] === todayDate);
          if (todayWorkout) {
            workedOutToday = true;
            const wTime = new Date(todayWorkout.timestamp).getTime();
            waterBeforeWorkout = waterLog.filter(w => w.timestamp <= wTime && w.timestamp >= wTime - 2 * 3600000).reduce((sum, w) => sum + w.amount, 0);
          }
        } catch (e) { }
      }

      // Check Thirst vs Hunger manually if a recent log exists
      if (logs.length >= 2 && waterPct < 0.4) {
        const lastLogObj = logs[0];
        const lastLogTime = new Date(lastLogObj.timestamp).getTime();
        const prevLogTime = new Date(logs[1].timestamp).getTime();
        const minsDiff = (lastLogTime - prevLogTime) / 60000;
        const minsSinceAdded = (Date.now() - lastLogTime) / 60000;

        if (minsDiff > 0 && minsDiff <= 120 && minsSinceAdded < 2 && !tracker[`THIRST_HUNGER_${lastLogObj.id}`]) {
          triggerMessage(
            `THIRST_HUNGER_${lastLogObj.id}`,
            `You just logged a snack ${Math.round(minsDiff)} mins after your last meal. At only ${waterConsumed}ml of water today, this might be thirst, not hunger. Try 300ml of water and wait 10 minutes. Still hungry? Log it then.`,
            "LOG 300ml WATER",
            `replace_snack_with_water_${lastLogObj.id}`,
            "KEEP FOOD LOG",
            "dismiss"
          );
        }
      }

      // Agent Decision Tree
      // Cross-module: Workout + low protein nudge
      const todayWorkoutLogs = (() => {
        try {
          const raw = localStorage.getItem('ion_workout_log');
          const all = raw ? JSON.parse(raw) : [];
          return all.filter((w: any) => w.date === todayDate);
        } catch { return []; }
      })();
      const todayTotalBurn = todayWorkoutLogs.reduce((s: number, w: any) => s + (w.caloriesBurned || 0), 0);
      const newGoalWithBurn = (profile?.tdee || goal) + todayTotalBurn;
      const requiredProtein = Math.round(newGoalWithBurn * 0.3 / 4);
      const totalProteinNow = stateRef.current.logs.reduce((s, l) => s + l.protein, 0);
      if (todayTotalBurn > 0 && totalProteinNow < requiredProtein && !tracker["WORKOUT_PROTEIN_LOW"]) {
        triggerMessage(
          "WORKOUT_PROTEIN_LOW",
          `You trained today. Protein intake is low for recovery — your muscles need ${requiredProtein}g. You've had ${Math.round(totalProteinNow)}g. Log a high-protein meal now.`,
          "GET SUGGESTION",
          "suggestion"
        );
      } else if (sleepHours > 0 && sleepHours < 6 && !tracker["SLEEP_HUNGER_WARNING"]) {
        triggerMessage(
          "SLEEP_HUNGER_WARNING",
          `You slept ${sleepHours}h last night. Sleep deprivation increases hunger hormones by up to 24%. Be extra mindful of snacking today. Stick to your ${goal} kcal goal.`,
          "Understood",
          "dismiss"
        );
      } else if (workedOutToday && waterBeforeWorkout < 400 && !tracker["WORKOUT_WATER_RECOVERY"]) {
        triggerMessage(
          "WORKOUT_WATER_RECOVERY",
          `You worked out today but only had ${waterBeforeWorkout}ml before. Pre-workout hydration affects performance and recovery. Prioritize 500ml first thing tomorrow.`,
          "Understood",
          "dismiss"
        );
      } else if (hour >= 8 && hour <= 10 && waterConsumed === 0) {
        triggerMessage(
          "WATER_MORNING_START",
          "Morning. You haven't hydrated yet. Drink 500ml before your first meal — it kickstarts metabolism.",
          "LOG 500ml",
          "log_500ml"
        );
      } else if (consumed === 0 && hour >= 9) {
        triggerMessage(
          "BREAKFAST_SKIP_ALERT",
          "I noticed you haven't logged any food yet today. Did you skip breakfast, or just forget to log?",
          "Log Now",
          "log"
        );
      } else if (hour >= 14 && waterPct < 0.4 && !tracker["WATER_AFTERNOON_LOW"]) {
        triggerMessage(
          "WATER_AFTERNOON_LOW",
          `It's ${hour}:00 and you're only at ${waterConsumed}ml. You should be at ${Math.round(waterGoal * 0.5)}ml by now. Drink a bottle before your next meal.`,
          "LOG 500ml",
          "log_500ml"
        );
      } else if (hoursSinceLastLog > 4 && hour < 21 && logs.length > 0) {
        triggerMessage(
          "MEAL_GAP_ALERT",
          "It's been over 4 hours since you last ate. Keeping steady energy is important. Need a suggestion?",
          "Get Suggestion",
          "suggestion"
        );
      } else if ((hoursSinceLastLog * 60) < 2 && waterPct < 0.3 && !tracker["WATER_PRE_MEAL"]) {
        triggerMessage(
          "WATER_PRE_MEAL",
          "Just logged a meal. Drink 200–250ml of water before eating — helps digestion and portion control.",
          "LOG 250ml",
          "log_250ml"
        );
      } else if (consumed < goal * 0.4 && hour >= 15) {
        triggerMessage(
          "UNDEREATING_ALERT",
          "You're tracking quite low on calories for this time of day. Let's get some fuel in you!",
          "Log Now",
          "log"
        );
      } else if (hour >= 19 && waterPct < 0.6 && !tracker["WATER_EVENING_DEFICIT"]) {
        triggerMessage(
          "WATER_EVENING_DEFICIT",
          `You're at ${waterConsumed}ml with ${waterGoal - waterConsumed}ml left. Spread it across the next 2 hours — don't chug it all at once.`,
          "LOG 250ml",
          "log_250ml"
        );
      } else if (waterPct >= 1 && !tracker["WATER_GOAL_REACHED_TODAY"]) {
        triggerMessage(
          "WATER_GOAL_REACHED_TODAY",
          `Hydration goal hit ✓ ${waterConsumed}ml logged today. This directly supports your ${profile.goal} progress.`,
          "View Summary",
          "summary"
        );
      } else if (consumed > goal * 0.9 && !tracker["GOAL_REACHED"]) {
        triggerMessage(
          "GOAL_REACHED",
          "Awesome work! You've almost hit your daily macro goals. Ready to wrap up?",
          "View Summary",
          "summary"
        );
      } else if (hour >= 20 && !localStorage.getItem(`food_summary_${todayDate}`)) {
        triggerMessage(
          "EOD_WRAP",
          "Evening! Want to lock in your daily telemetry and see how you did today?",
          "View Summary",
          "summary"
        );
      }
    };

    // Run initially and then every 30 minutes
    runAgentLoop();
    const interval = setInterval(runAgentLoop, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [profile]);

  // --- Autonomous Decision Card Loop ---
  useEffect(() => {
    if (!profile) return;

    const fetchDecision = async () => {
      setLoadingDecision(true);
      try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) return;

        const { logs, dailyGoal, memory, profile: p } = stateRef.current;
        if (!p) return;
        const totalCalories = logs.reduce((sum, log) => sum + log.calories, 0);
        const lastLogged = logs.length > 0 ? new Date(logs[0].timestamp).getTime() : 0;
        const hoursSinceLastLog = lastLogged ? (Date.now() - lastLogged) / 3600000 : Infinity;
        const hour = new Date().getHours();

        const systemContext = `You are ION, a sharp, direct personal health agent. Not a chatbot.
User: ${p.name || 'User'}, ${p.age || '?'}yo, goal: ${p.goal || '?'}
Today so far: ${logs.map(e => e.name).join(", ") || "nothing logged"}
Consumed: ${totalCalories} / ${dailyGoal} kcal
Hours since last meal: ${hoursSinceLastLog === Infinity ? 'N/A' : hoursSinceLastLog.toFixed(1)}
Current Hour: ${hour}
Water today: ${waterConsumed}ml of ${waterGoal}ml goal (${Math.round((waterConsumed / waterGoal) * 100) || 0}%)
Water pattern: ${memory.avgWater || 'no data'}ml average daily
Frequent: ${(memory.frequentFoods || []).slice(0, 3).map(f => f.name).join(", ")}`;

        const prompt = `${systemContext}\n\nAssess the user's current state and generate an autonomous decision card.
Also consider hydration: user has drunk ${waterConsumed}ml of ${waterGoal}ml today. If hydration is low and relevant to the recommendation, mention it.
Return ONLY JSON (no markdown):\n{ "situation": "one sentence summary of user's current state", "recommendation": "specific meal or action", "reason": "one sentence why, data-backed", "hydration_note": "string | null", "reasoning_steps": ["> CHECKING hydration status...  ✓ 800ml / 2500ml — LOW", "step 2 checking...", "step 3 evaluating...", "step 4 computing..."], "urgency": "now" | "within 1hr" | "tonight", "action": "Log this meal" | "View options" | "Adjust goal", "meal": { "name": string, "calories": number, "protein": number, "carbs": number, "fat": number, "emoji": string } | null }`;

        const BASE = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";
        const res = await fetch(`${BASE}?key=${apiKey}`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
          setAgentDecision(parsed);
        }
      } catch (e) {
      } finally {
        setLoadingDecision(false);
      }
    };

    fetchDecision();
    const interval = setInterval(fetchDecision, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [profile, logs.length]);

  useEffect(() => {
    if (!profile) return;
    const today = new Date().toISOString().split('T')[0];
    const lastInsightDate = localStorage.getItem('ion_last_pattern_date');
    if (lastInsightDate !== today && memory.frequentFoods.length > 0) {
      const fetchInsight = async () => {
        try {
          const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
          if (!apiKey) return;
          const topFoods = memory.frequentFoods.slice(0, 5).map(f => f.name).join(', ');
          const prompt = `User's frequent foods: ${topFoods}. Avg daily intake: ${memory.weeklyAvgCalories} kcal. Their goal is ${profile.tdee} kcal. Eating schedule: ${JSON.stringify(memory.eatingSchedule)}. Give ONE short pattern observation in a friendly tone. Max 2 sentences. Return ONLY a plain text string (no markdown).`;

          const BASE = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";
          const res = await fetch(`${BASE}?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
          });
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            setPatternInsight(text.trim());
          }
        } catch (e) { }
      };
      localStorage.setItem('ion_last_pattern_date', today);
      fetchInsight();
    }
  }, [profile, memory]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const getFriendlyError = (err: any) => {
    const msg = err.message?.toLowerCase() || '';
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('failed to fetch')) return "Connection lost. Please check your network.";
    if (msg.includes('429') || msg.includes('quota')) return "AI Quota exceeded. Please try again later.";
    if (msg.includes('parse') || msg.includes('json') || msg.includes('syntax')) return "The AI returned an invalid format. Please re-scan.";
    if (msg.includes('api key')) return "System is missing the AI Key configuration.";
    return err.message || "An unexpected error occurred. Please try again.";
  };

  const handleBannerAction = (id: string, action: string) => {
    setActiveBanners(prev => prev.filter(b => b.id !== id));
    if (action === 'suggestion') {
      suggestionRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (action === 'log') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (action === 'summary') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      saveEndOfDaySummary();
    } else if (action === 'log_150ml') {
      logWater(150, 'Shot');
    } else if (action === 'log_250ml') {
      logWater(250, 'Glass');
    } else if (action === 'log_500ml') {
      logWater(500, 'Bottle');
    } else if (action.startsWith('replace_snack_with_water_')) {
      const logId = action.replace('replace_snack_with_water_', '');
      setLogs(prev => prev.filter(l => l.id !== logId));
      logWater(300, 'Agent Adjustment');
    } else if (action === 'dismiss') {
      // just clear banner/chat if needed, but here we just do nothing
    }
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handlePhotoUpload(file);
  };

  const calculateTDEE = (data: Partial<UserProfile>) => {
    let bmr = 0;
    if (data.gender === 'male') {
      bmr = 10 * data.weight! + 6.25 * data.height! - 5 * data.age! + 5;
    } else {
      bmr = 10 * data.weight! + 6.25 * data.height! - 5 * data.age! - 161;
    }

    let multiplier = 1.2;
    if (data.activityLevel === 'Lightly Active') multiplier = 1.375;
    else if (data.activityLevel === 'Moderately Active') multiplier = 1.55;
    else if (data.activityLevel === 'Very Active') multiplier = 1.725;

    let tdee = Math.round(bmr * multiplier);

    if (data.goal === 'Lose Weight') tdee -= 300;
    else if (data.goal === 'Gain Muscle') tdee += 300;

    return tdee;
  };

  const handleSaveProfile = () => {
    const tdee = calculateTDEE(setupData);
    const newProfile = { ...setupData, tdee } as UserProfile;
    setProfile(newProfile);
    setDailyGoal(tdee);
    localStorage.setItem('ion_user_profile', JSON.stringify(newProfile));
  };

  const handlePhotoUpload = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handlePhotoUpload(file);
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMode === 'text' && !textInput) return;
    if (inputMode === 'photo' && !photoPreview) return;

    setLoading(true);
    setError('');
    setParsedResult(null);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("VITE_GEMINI_API_KEY missing in .env");
      }

      const BASE = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

      let response;
      if (inputMode === 'text') {
        response = await fetch(`${BASE}?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Analyze this food: "${textInput}". Return ONLY JSON (no markdown):\n{ "name": string, "calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number, "serving": string }`
              }]
            }]
          })
        });
      } else {
        const mimeType = photoPreview!.split(';')[0].split(':')[1];
        const base64Data = photoPreview!.split(',')[1];
        response = await fetch(`${BASE}?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inline_data: { mime_type: mimeType, data: base64Data } },
                { text: `Analyze this food image. Return ONLY JSON (no markdown):\n{ "name": string, "calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number, "serving": string }` }
              ]
            }]
          })
        });
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || 'API Error');
      }

      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResponse) throw new Error("Could not parse AI response");

      const parsed = JSON.parse(textResponse.replace(/```json|```/g, "").trim());
      setParsedResult(parsed);
    } catch (err: any) {
      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const addLogWithMemory = (newEntry: FoodEntry) => {
    setLogs(prev => [newEntry, ...prev]);

    setMemory(prevMemory => {
      const updatedMemory = { ...prevMemory };
      const existingFreqIndex = updatedMemory.frequentFoods.findIndex(f => f.name.toLowerCase() === newEntry.name.toLowerCase());

      if (existingFreqIndex >= 0) {
        updatedMemory.frequentFoods[existingFreqIndex].count += 1;
      } else {
        updatedMemory.frequentFoods.push({
          name: newEntry.name,
          calories: newEntry.calories,
          protein: newEntry.protein,
          carbs: newEntry.carbs,
          fat: newEntry.fat,
          emoji: newEntry.emoji,
          count: 1
        });
      }
      updatedMemory.frequentFoods.sort((a, b) => b.count - a.count);
      localStorage.setItem('ion_food_memory', JSON.stringify(updatedMemory));
      return updatedMemory;
    });
  };

  const handleQuickLog = (food: FrequentFood) => {
    const newEntry: FoodEntry = {
      id: Date.now().toString(),
      name: food.name,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      emoji: food.emoji,
      timestamp: new Date().toISOString(),
    };
    addLogWithMemory(newEntry);
    showToast(`Quick Logged: ${food.name} 🚀`);
  };

  const handleConfirmAdd = () => {
    if (!parsedResult) return;
    const newEntry: FoodEntry = {
      id: Date.now().toString(),
      name: parsedResult.name || 'Unknown Food',
      calories: Number(parsedResult.calories) || 0,
      protein: Number(parsedResult.protein) || 0,
      carbs: Number(parsedResult.carbs) || 0,
      fat: Number(parsedResult.fat) || 0,
      emoji: '🍽️',
      timestamp: new Date().toISOString(),
    };
    addLogWithMemory(newEntry);
    showToast('Meal securely logged! 🚀');

    // Reset
    setTextInput('');
    setPhotoPreview(null);
    setParsedResult(null);
    setError('');
  };

  const deleteLog = (id: string) => {
    setLogs(logs.filter((log) => log.id !== id));
  };

  const totalCalories = logs.reduce((sum, log) => sum + log.calories, 0);
  const totalProtein = logs.reduce((sum, log) => sum + log.protein, 0);
  const totalCarbs = logs.reduce((sum, log) => sum + log.carbs, 0);
  const totalFat = logs.reduce((sum, log) => sum + log.fat, 0);

  const isSurplus = totalCalories > dailyGoal;
  const difference = Math.abs(dailyGoal - totalCalories);

  // Cross-Module State Reading
  const todayStr = new Date().toISOString().split('T')[0];
  const workoutBurn = Number(localStorage.getItem(`ion_workout_log_${todayStr}`) || 0);
  const sleepHours = Number(localStorage.getItem(`ion_sleep_log_${todayStr}`) || 0);
  const waterIntake = Number(localStorage.getItem(`ion_water_log_${todayStr}`) || 0);

  const activeDailyGoal = dailyGoal + workoutBurn + wearableCalories;
  const activeDifference = Math.abs(activeDailyGoal - totalCalories);
  const activeIsSurplus = totalCalories > activeDailyGoal;

  const ringData = [
    { name: 'Consumed', value: totalCalories, color: activeIsSurplus ? '#FF595E' : '#B4F000' },
    { name: 'Remaining', value: activeIsSurplus ? 0 : activeDifference, color: '#161B23' },
  ];

  const fetchUnifiedInsight = async () => {
    setLoadingUnified(true);
    setShowUnifiedModal(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("VITE_GEMINI_API_KEY missing");
      const BASE = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

      const prompt = `User summary:\nFood: ${totalCalories}kcal consumed vs ${activeDailyGoal}kcal goal.\nWorkout: ${workoutBurn > 0 ? workoutBurn + ' kcal burned' : 'No workout data today'}.\nSleep: ${sleepHours > 0 ? sleepHours + ' hours' : 'No sleep data'}.\nWater: ${waterIntake > 0 ? waterIntake + ' ml' : 'No water data'}.\n\nGive a 3-sentence overall health agent insight covering patterns across all areas. Be personal, specific, and actionable. Return a raw string.`;

      const res = await fetch(`${BASE}?key=${apiKey}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) setUnifiedInsight(text.trim());
    } catch (e: any) {
      setUnifiedInsight("Could not summon unified agent intelligence at this time.");
    } finally {
      setLoadingUnified(false);
    }
  };

  const saveEndOfDaySummary = () => {
    setShowSummary(true);
    const today = new Date().toISOString().split('T')[0];
    const isAlreadySaved = !!localStorage.getItem(`food_summary_${today}`);

    localStorage.setItem(`food_summary_${today}`, JSON.stringify({
      date: today,
      totalCalories,
      goal: dailyGoal,
      protein: totalProtein,
      carbs: totalCarbs,
      fat: totalFat,
      entries: logs,
      water: { consumed: waterConsumed, goal: waterGoal, log: waterLog }
    }));

    // Low sleep + calorie overrun pattern detection
    if (sleepHours > 0 && sleepHours < 6 && totalCalories > dailyGoal) {
      setChatMessages(prev => [...prev, {
        sender: 'agent' as const,
        text: `⚠ Pattern detected: Low sleep nights correlate with your calorie overages. Prioritize 7+ hrs tonight.`
      }]);
    }

    if (!isAlreadySaved) {
      setMemory(prev => {
        const updated = { ...prev, streaks: { ...prev.streaks } };
        const proteinGoal = (dailyGoal * 0.3) / 4;

        if (totalProtein >= proteinGoal) {
          updated.streaks.proteinGoalDays += 1;
        } else {
          updated.streaks.proteinGoalDays = 0;
        }

        if (Math.abs(dailyGoal - totalCalories) <= 150) {
          updated.streaks.calorieGoalDays += 1;
        } else {
          updated.streaks.calorieGoalDays = 0;
        }

        localStorage.setItem('ion_food_memory', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');
    setChatLoading(true);
    setRoutingSteps([]);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("VITE_GEMINI_API_KEY missing");

      let lastVerdictCard: any = null;

      const response = await routeAgentTask({
        apiKey,
        context: {
          userMsg,
          totalCalories,
          dailyGoal,
          waterConsumed,
          waterGoal,
          profile
        },
        onStep: (stepStr: string) => {
          setRoutingSteps(prev => [...prev, stepStr]);
        },
        onActiveNode: (node: string) => {
          setActiveNode(prev => {
            if (prev && prev !== node) {
              setCompletedNodes(c => c.includes(prev) ? c : [...c, prev]);
            }
            return node;
          });
        },
        toolsConfig: {
          analyzeAndLogFood: (input: any) => {
            const newEntry: FoodEntry = {
              id: Date.now().toString(),
              timestamp: new Date().toISOString(),
              name: input.name || 'Unknown Food',
              calories: Number(input.calories) || 0,
              protein: Number(input.protein) || 0,
              carbs: Number(input.carbs) || 0,
              fat: Number(input.fat) || 0,
              emoji: input.emoji || '🍽️'
            };
            addLogWithMemory(newEntry);
            showToast('Meal securely logged via chat! 🚀');
            return `Successfully logged ${newEntry.name}.`;
          },
          syncWearableData: async () => {
            const res = await syncWearableData();
            return `Synced ${res.count} wearable signals from Google Fit.`;
          },
          getRecoveryStatus: async () => {
            const res = await calculateRecoveryScore();
            return `Recovery Score: ${res.recoveryScore} (${res.status})`;
          },
          getHealthInsight: async () => {
            return await generateProactiveInsight();
          },
          addWaterEntry: (amount: number) => {
            logWater(amount, 'Chat Assistant entry');
            return `Successfully logged ${amount}ml of water.`;
          },
          getNextMealSuggestion: () => {
            const pRemaining = Math.max(0, (dailyGoal * 0.3 / 4) - totalProtein);
            const cRemaining = Math.max(0, (dailyGoal * 0.4 / 4) - totalCarbs);
            const fRemaining = Math.max(0, (dailyGoal * 0.3 / 9) - totalFat);
            return `Suggest a meal that fits remaining macros: Protein ${pRemaining.toFixed(0)}g, Carbs ${cRemaining.toFixed(0)}g, Fat ${fRemaining.toFixed(0)}g.`;
          },
          beforeYouEatCheck: async (foodName: string) => {
            try {
              const BASE = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";
              const pRemaining = Math.max(0, (dailyGoal * 0.3 / 4) - totalProtein);
              const cRemaining = Math.max(0, (dailyGoal * 0.4 / 4) - totalCarbs);
              const fRemaining = Math.max(0, (dailyGoal * 0.3 / 9) - totalFat);

              const prompt = `User is CONSIDERING eating: '${foodName}'.
Today so far: ${totalCalories} kcal of ${dailyGoal} kcal goal.
Remaining macros: Protein ${pRemaining.toFixed(0)}g, Carbs ${cRemaining.toFixed(0)}g, Fat ${fRemaining.toFixed(0)}g.
User goal: ${profile?.goal || 'Maintain'}.
User's current hydration: ${waterConsumed}ml of ${waterGoal}ml.

Analyze if this food is a good choice RIGHT NOW out of their remaining calories and macros.
If this food is high in sodium or protein, flag if water intake is too low.
Return ONLY JSON (no markdown):
{
  "verdict": "great choice" | "okay" | "not ideal" | "avoid",
  "reason": "one sentence, data-specific reason",
  "alternative": "string | null",
  "water_warning": "string | null",
  "macros": { "calories": number, "protein": number, "carbs": number, "fat": number }
}`;

              const res = await fetch(`${BASE}?key=${apiKey}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
              });
              const data = await res.json();
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
                lastVerdictCard = parsed;
                return `Analysis complete. Format your output telling the user if this is a good choice. Json details: ${JSON.stringify(parsed)}`;
              }
              return "Analysis failed.";
            } catch (e) {
              return "Analysis failed.";
            }
          },
          getTodaySummary: () => {
            return `Daily Goal: ${dailyGoal} kcal. Consumed: ${totalCalories} kcal. Protein: ${totalProtein}g. Carbs: ${totalCarbs}g. Fat: ${totalFat}g. Water: ${waterConsumed}ml/${waterGoal}ml.`;
          },
          getLastVerdictCard: () => lastVerdictCard
        }
      });

      setChatMessages(prev => [...prev, {
        sender: 'agent' as const,
        text: String(response.text || ''),
        verdictCard: response.verdictCard as any
      }]);
    } catch (err: any) {
      setChatMessages(prev => [...prev, { sender: 'agent', text: 'Communication error: ' + getFriendlyError(err) }]);
    } finally {
      setChatLoading(false);
      setRoutingSteps([]);
      setActiveNode(null);
      setCompletedNodes([]);
    }
  };

  // Replaced fetchNextMeal with the autonomous useEffect

  const fetchTomorrowPlan = async () => {
    setLoadingPlan(true);
    setPlanTomorrow(null);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("VITE_GEMINI_API_KEY missing");

      const deficitOrSurplus = isSurplus ? 'surplus' : 'deficit';
      const profilePrefix = profile ? `User profile: ${profile.age}yo, ${profile.weight}kg, goal: ${profile.goal}, activity: ${profile.activityLevel}, daily target: ${profile.tdee} kcal. ` : '';
      const prompt = `${profilePrefix}User consumed ${totalCalories} kcal today vs ${dailyGoal} kcal goal (${deficitOrSurplus} by ${difference} kcal). Suggest a balanced 4-meal plan for tomorrow. Return ONLY a JSON object (no markdown):\n{ "plan": [{ "meal": string, "name": string, "calories": number, "protein": number, "carbs": number, "fat": number, "emoji": string }], "reasoning_steps": ["step 1 analyzing...", "step 2 checking...", "step 3 evaluating...", "step 4 computing..."] } Meals: Breakfast, Lunch, Snack, Dinner`;

      const BASE = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";
      const res = await fetch(`${BASE}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Failed to parse AI response.");

      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setPlanTomorrow(parsed);
    } catch (err: any) {
      showToast('Forecast Generation Failed: ' + getFriendlyError(err));
    } finally {
      setLoadingPlan(false);
    }
  };

  const addPlanMealToLog = (meal: TomorrowPlanMeal | NextMealSuggestion) => {
    const newEntry: FoodEntry = {
      id: Date.now().toString() + Math.random(),
      name: meal.name,
      calories: Number(meal.calories) || 0,
      protein: Number(meal.protein) || 0,
      carbs: Number(meal.carbs) || 0,
      fat: Number(meal.fat) || 0,
      emoji: meal.emoji || '🍽️',
      timestamp: new Date().toISOString(),
    };
    setLogs((prev: FoodEntry[]) => [newEntry, ...prev]);
    showToast('Scheduled meal tracked! 🚀');
  };

  const generateWeeklyReport = () => {
    const data: WeeklyReportData[] = [];
    const today = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    let total = 0;
    let daysWithData = 0;
    let maxDiffOver = -Infinity;
    let minDiffAbs = Infinity;
    let bestDay = 'N/A';
    let worstDay = 'N/A';

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = days[d.getDay()];

      const saved = localStorage.getItem(`food_summary_${dateStr}`);
      let kcal = 0;
      let goal = dailyGoal;

      if (i === 0) {
        kcal = totalCalories;
      } else if (saved) {
        const parsed = JSON.parse(saved);
        kcal = parsed.totalCalories || 0;
        goal = parsed.goal || dailyGoal;
      }

      if (kcal > 0) {
        total += kcal;
        daysWithData++;

        const absDiff = Math.abs(goal - kcal);
        if (absDiff < minDiffAbs) {
          minDiffAbs = absDiff;
          bestDay = dayName;
        }

        const overLimit = kcal - goal;
        if (overLimit > maxDiffOver) {
          maxDiffOver = overLimit;
          worstDay = dayName;
        }
      }

      data.push({ day: dayName, kcal, goal });
    }

    if (worstDay === 'N/A' && bestDay !== 'N/A') worstDay = bestDay;

    setWeeklyStats({
      total,
      avg: daysWithData > 0 ? Math.round(total / daysWithData) : 0,
      bestDay,
      worstDay,
      data
    });
    setInsight(null);
    setShowWeeklyReport(true);
  };

  const fetchWeeklyInsight = async () => {
    if (!weeklyStats) return;
    setLoadingInsight(true);
    setLoadingWin(true);
    setInsight(null);
    setWeeklyWin(null);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("VITE_GEMINI_API_KEY missing");

      const BASE = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";
      const profilePrefix = profile ? `User profile: ${profile.age}yo, ${profile.weight}kg, goal: ${profile.goal}, activity: ${profile.activityLevel}, daily target: ${profile.tdee} kcal. ` : '';

      const last7Days = [];
      const todayDate = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(todayDate); d.setDate(d.getDate() - i);
        last7Days.push(d.toISOString().split('T')[0]);
      }
      const waterByDay = last7Days.map(str => {
        try { const w = JSON.parse(localStorage.getItem(`food_summary_${str}`) || '{}'); return w.water?.consumed || 0; }
        catch { return 0; }
      });
      const lowWaterDays = waterByDay.filter(w => w < (waterGoal * 0.5)).length;

      // Sleep data for cross-module insight
      const sleepByDay = last7Days.map(str => {
        const h = Number(localStorage.getItem(`ion_sleep_log_${str}`) || 0);
        return h;
      });
      const lowSleepDays = sleepByDay.filter(h => h > 0 && h < 6).length;

      const insightPrompt = `${profilePrefix}User's 7-day calorie log: ${JSON.stringify(weeklyStats.data)}. 
Daily water intake this week: ${waterByDay.join(", ")} ml. Days where water < 50% of goal: ${lowWaterDays}.
Sleep this week (hours per day): ${sleepByDay.map((h) => h > 0 ? h + 'h' : 'no data').join(", ")}. Low sleep days (<6h): ${lowSleepDays}.
Cross-check: were calorie overages higher on low-water days? Did low sleep days match high calorie days? Include one sleep-food pattern insight and one water-specific insight in your weekly summary.
Write 2-3 sentences: one motivational insight and one actionable tip for next week. Return ONLY JSON (no markdown): { "motivational": string, "actionable": string }. Be concise and friendly.`;

      const winPrompt = `User's week: ${JSON.stringify(weeklyStats.data)}. Their goal: ${profile?.tdee} kcal/day. Write ONE personalized achievement sentence they can feel proud of. Be specific, warm, and encouraging. Max 20 words. Return ONLY a plain string (no markdown).`;

      const [resInsight, resWin] = await Promise.all([
        fetch(`${BASE}?key=${apiKey}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: insightPrompt }] }] }) }),
        fetch(`${BASE}?key=${apiKey}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: winPrompt }] }] }) })
      ]);

      const [dataInsight, dataWin] = await Promise.all([resInsight.json(), resWin.json()]);

      const textInsight = dataInsight.candidates?.[0]?.content?.parts?.[0]?.text;
      const textWin = dataWin.candidates?.[0]?.content?.parts?.[0]?.text;

      if (textInsight) {
        setInsight(JSON.parse(textInsight.replace(/```json|```/g, "").trim()));
      }
      if (textWin) {
        setWeeklyWin(textWin.trim());
      }
    } catch (err: any) {
      console.error(err);
      setInsight({ motivational: 'Could not load insight.', actionable: 'Please try again later. Check API keys.' });
      setWeeklyWin('Could not load weekly win.');
    } finally {
      setLoadingInsight(false);
      setLoadingWin(false);
    }
  };

  if (!profile) {
    const tdeePreview = onboardingStep === 3 ? (() => {
      let bmr = setupData.gender === 'male'
        ? 10 * (setupData.weight || 70) + 6.25 * (setupData.height || 170) - 5 * (setupData.age || 25) + 5
        : 10 * (setupData.weight || 70) + 6.25 * (setupData.height || 170) - 5 * (setupData.age || 25) - 161;
      let m = { Sedentary: 1.2, 'Lightly Active': 1.375, 'Moderately Active': 1.55, 'Very Active': 1.725 }[setupData.activityLevel || 'Moderately Active'] || 1.55;
      let tdee = Math.round(bmr * m);
      if (setupData.goal === 'Lose Weight') tdee -= 300;
      else if (setupData.goal === 'Gain Muscle') tdee += 300;
      return tdee;
    })() : null;

    return (
      <div className="max-w-lg mx-auto space-y-8 pb-20 pt-16">
        {/* Step dots */}
        <div className="flex items-center justify-center gap-3 mb-2">
          {[1, 2, 3].map(s => (
            <div key={s} className={`transition-all duration-500 ${s < onboardingStep ? 'w-6 h-2 rounded-full bg-[#B4F000]' :
              s === onboardingStep ? 'w-8 h-2 rounded-full bg-[#B4F000]' :
                'w-2 h-2 rounded-full bg-[#161B23]'
              }`} />
          ))}
        </div>

        <header className="animate-in fade-in slide-in-from-top-4 duration-700 text-center">
          {onboardingStep === 1 && (
            <>
              <div className="text-5xl mb-4">👋</div>
              <h1 className="text-4xl font-bold tracking-tight text-[#E6EDF3] mb-3">Welcome to ION</h1>
              <p className="text-[#8B949E] text-sm leading-relaxed">Your personal AI health agent. First — what should I call you?</p>
            </>
          )}
          {onboardingStep === 2 && (
            <>
              <div className="text-5xl mb-4">📊</div>
              <h1 className="text-4xl font-bold tracking-tight text-[#E6EDF3] mb-3">Tell ION About You</h1>
              <p className="text-[#8B949E] text-sm leading-relaxed">ION will calculate your exact energy baseline for personalized AI telemetry.</p>
            </>
          )}
          {onboardingStep === 3 && (
            <>
              <div className="text-5xl mb-4">⚡</div>
              <h1 className="text-4xl font-bold tracking-tight text-[#B4F000] mb-3">ION Is Ready</h1>
              <p className="text-[#8B949E] text-sm leading-relaxed">Your personalized health agent is calibrated and ready to track.</p>
            </>
          )}
        </header>

        <div className="glass-card p-8 space-y-6 animate-in zoom-in-95 duration-500 border-[#3A86FF]/20">
          {/* Step 1 */}
          {onboardingStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-[#8B949E] font-bold mb-2">Your Name</label>
                <input
                  type="text"
                  autoFocus
                  className="w-full glass-input text-xl py-4 text-center font-bold"
                  value={setupData.name}
                  onChange={e => setSetupData({ ...setupData, name: e.target.value })}
                  placeholder="e.g. Arjun"
                  onKeyDown={e => { if (e.key === 'Enter' && setupData.name) setOnboardingStep(2); }}
                />
              </div>
              <button
                onClick={() => setOnboardingStep(2)}
                disabled={!setupData.name}
                className="w-full glass-button-primary py-4 uppercase tracking-widest font-bold disabled:opacity-40"
              >
                Next: About You →
              </button>
            </div>
          )}

          {/* Step 2 */}
          {onboardingStep === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#8B949E] font-bold mb-2">Age</label>
                  <input type="number" className="w-full glass-input" value={setupData.age} onChange={e => setSetupData({ ...setupData, age: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#8B949E] font-bold mb-2">Weight kg</label>
                  <input type="number" className="w-full glass-input" value={setupData.weight} onChange={e => setSetupData({ ...setupData, weight: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#8B949E] font-bold mb-2">Height cm</label>
                  <input type="number" className="w-full glass-input" value={setupData.height} onChange={e => setSetupData({ ...setupData, height: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#8B949E] font-bold mb-2">Gender</label>
                  <select className="w-full glass-input text-sm" value={setupData.gender} onChange={e => setSetupData({ ...setupData, gender: e.target.value as any })}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#8B949E] font-bold mb-2">Goal</label>
                  <select className="w-full glass-input text-sm" value={setupData.goal} onChange={e => setSetupData({ ...setupData, goal: e.target.value as any })}>
                    <option value="Lose Weight">Lose Weight</option>
                    <option value="Maintain">Maintain</option>
                    <option value="Gain Muscle">Gain Muscle</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-[#8B949E] font-bold mb-2">Activity Level</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active'] as const).map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setSetupData({ ...setupData, activityLevel: level })}
                      className={`p-2.5 text-[0.6rem] font-bold uppercase tracking-widest border rounded transition-all ${setupData.activityLevel === level ? 'bg-[#B4F000]/10 border-[#B4F000]/50 text-[#B4F000]' : 'border-[#161B23] text-[#8B949E] hover:text-[#E6EDF3]'}`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setOnboardingStep(1)} className="glass-button flex-none px-4 py-3 text-[0.65rem] uppercase tracking-widest">← Back</button>
                <button
                  onClick={() => setOnboardingStep(3)}
                  disabled={!(setupData.weight && setupData.height && setupData.age)}
                  className="w-full glass-button-primary py-3 uppercase tracking-widest font-bold disabled:opacity-40"
                >
                  Calculate My TDEE →
                </button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {onboardingStep === 3 && tdeePreview && (
            <div className="space-y-6">
              <div className="text-center p-6 bg-[#0A0D12] border border-[#B4F000]/30 rounded-lg">
                <div className="text-[0.65rem] uppercase tracking-widest text-[#8B949E] mb-2">Your Daily Energy Target</div>
                <div className="text-6xl font-bold text-[#B4F000] font-mono-numeric mb-1">{tdeePreview}</div>
                <div className="text-[#8B949E] text-sm">kcal / day</div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <div className="p-2 bg-[#161B23] rounded">
                    <div className="text-[0.55rem] text-[#8B949E] uppercase tracking-wider">Protein</div>
                    <div className="text-sm font-bold text-[#B4F000]">{Math.round(tdeePreview * 0.3 / 4)}g</div>
                  </div>
                  <div className="p-2 bg-[#161B23] rounded">
                    <div className="text-[0.55rem] text-[#8B949E] uppercase tracking-wider">Carbs</div>
                    <div className="text-sm font-bold text-[#3A86FF]">{Math.round(tdeePreview * 0.4 / 4)}g</div>
                  </div>
                  <div className="p-2 bg-[#161B23] rounded">
                    <div className="text-[0.55rem] text-[#8B949E] uppercase tracking-wider">Fat</div>
                    <div className="text-sm font-bold text-[#8844FF]">{Math.round(tdeePreview * 0.3 / 9)}g</div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-[#8B949E] text-center leading-relaxed">
                ION will dynamically adjust your goal based on workouts, sleep quality, and your daily patterns.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setOnboardingStep(2)} className="glass-button flex-none px-4 py-3 text-[0.65rem] uppercase tracking-widest">← Back</button>
                <button
                  onClick={handleSaveProfile}
                  className="w-full glass-button-primary py-4 uppercase tracking-widest font-bold text-sm"
                >
                  🚀 Launch ION
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      {patternInsight && showPatternInsight && (
        <div className="glass-card bg-[#8844FF]/10 border-[#8844FF]/30 p-6 flex justify-between items-start animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex gap-4 items-start">
            <span className="text-2xl mt-1">🧠</span>
            <div>
              <div className="text-[0.65rem] text-[#8844FF] font-bold uppercase tracking-widest mb-1">Pattern Insight</div>
              <p className="text-sm text-[#E6EDF3] leading-relaxed">{patternInsight}</p>
            </div>
          </div>
          <button onClick={() => setShowPatternInsight(false)} className="text-[#8B949E] hover:text-[#E6EDF3] transition-colors p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Fallback Notification Banners */}
      {activeBanners.length > 0 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
          {activeBanners.map(banner => (
            <div key={banner.id} onClick={() => handleBannerAction(banner.id, banner.action)} className="glass-card bg-[#3A86FF]/10 border-[#3A86FF]/30 p-4 flex justify-between items-center cursor-pointer hover:bg-[#3A86FF]/20 transition-colors">
              <div className="flex gap-4 items-center">
                <span className="text-2xl">🔔</span>
                <div>
                  <div className="text-sm font-bold text-[#3A86FF] mb-0.5">{banner.title}</div>
                  <p className="text-xs text-[#E6EDF3] leading-relaxed">{banner.body}</p>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setActiveBanners(prev => prev.filter(b => b.id !== banner.id)); }}
                className="text-[#8B949E] hover:text-[#FF595E] transition-colors p-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <header className="animate-in fade-in slide-in-from-top-4 duration-700 ease-out">
        <div className="flex justify-between items-end border-b border-[#161B23] pb-6 mt-6">
          <div className="w-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full mb-2 gap-4 sm:gap-0">
              <span className="performance-header">Nutrition Tracking</span>
              <div className="flex gap-2">
                <div className={`text-[0.6rem] uppercase tracking-widest font-bold px-3 py-1 border rounded-sm ${memory.streaks.calorieGoalDays > 0 ? 'bg-[#FF595E]/10 text-[#FF595E] border-[#FF595E]/30' : 'bg-[#161B23] text-[#8B949E] border-[#161B23] opacity-50'}`}>
                  🔥 {memory.streaks.calorieGoalDays} Day Calorie Streak
                </div>
                <div className={`text-[0.6rem] uppercase tracking-widest font-bold px-3 py-1 border rounded-sm ${memory.streaks.proteinGoalDays > 0 ? 'bg-[#3A86FF]/10 text-[#3A86FF] border-[#3A86FF]/30' : 'bg-[#161B23] text-[#8B949E] border-[#161B23] opacity-50'}`}>
                  💪 {memory.streaks.proteinGoalDays} Day Protein Streak
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-4 w-full justify-between">
              <h1 className="text-4xl font-bold tracking-tight text-[#E6EDF3]">Food Module</h1>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => { generateWeeklyReport(); fetchWeeklyInsight(); }}
                  className="glass-button text-[0.65rem] py-1.5 px-4 h-auto uppercase tracking-widest group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-[#8844FF]/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  <span className="relative z-10 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8844FF] animate-pulse" />
                    Weekly Report
                  </span>
                </button>
                <button
                  onClick={fetchUnifiedInsight}
                  className="glass-button text-[0.65rem] py-1.5 px-4 h-auto uppercase tracking-widest group relative overflow-hidden hidden sm:flex"
                >
                  <div className="absolute inset-0 bg-[#E6EDF3]/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  <span className="relative z-10 flex items-center gap-2 text-[#E6EDF3]">
                    🌐 Unified System Check
                  </span>
                </button>
                <button
                  onClick={saveEndOfDaySummary}
                  className="glass-button text-[0.65rem] py-1.5 px-4 h-auto uppercase tracking-widest group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-[#3A86FF]/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  <span className="relative z-10 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3A86FF] animate-pulse" />
                    View Summary
                  </span>
                </button>
              </div>
            </div>
          </div>
          <div className="text-right">
            <label className="text-[0.65rem] uppercase tracking-widest text-[#8B949E] block mb-1">
              Active Goal (Kcal)
            </label>
            <div className="flex flex-col items-end">
              <input
                type="number"
                value={activeDailyGoal}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDailyGoal(Number(e.target.value) - workoutBurn)}
                className="glass-input w-24 h-8 text-right px-2"
              />
              {workoutBurn > 0 && <span className="text-[0.55rem] text-[#8844FF] mt-1 pr-1 font-bold">+ {workoutBurn} kcal burned</span>}
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-8">
        {/* Left Column: Summary */}
        <div className="col-span-12 lg:col-span-5 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 fill-mode-both">

          {/* Calorie Ring */}
          <div className="glass-card p-10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#B4F000]/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-[#B4F000]/10 transition-colors duration-700" />
            <div className="text-center mb-6">
              <span className="performance-header">Energy Balance</span>
              <h2 className="text-2xl font-bold mt-1 text-[#E6EDF3]">
                {totalCalories} <span className="text-[#8B949E] text-sm">/ {dailyGoal} kcal</span>
              </h2>
              <div className={`text-xs mt-2 font-bold uppercase tracking-wider ${isSurplus ? 'text-[#FF595E]' : 'text-[#B4F000]'}`}>
                {isSurplus ? `${difference} kcal Surplus` : `${difference} kcal Deficit`}
              </div>
            </div>

            <div className="h-64 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ringData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={100}
                    paddingAngle={0}
                    dataKey="value"
                    stroke="none"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {ringData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-4xl font-bold font-mono-numeric" style={{ color: isSurplus ? '#FF595E' : '#B4F000' }}>
                  {Math.round((totalCalories / dailyGoal) * 100)}%
                </span>
                <span className="text-[0.65rem] uppercase tracking-widest text-[#8B949E] mt-1">Consumed</span>
              </div>
            </div>
          </div>

          {/* Macros Summary */}
          <div className="glass-card p-8">
            <span className="performance-header mb-6 block">Macro Totals</span>
            <div className="space-y-6">
              {[
                { label: 'Protein', value: totalProtein, color: '#B4F000', max: 200 },
                { label: 'Carbs', value: totalCarbs, color: '#3A86FF', max: 300 },
                { label: 'Fat', value: totalFat, color: '#8844FF', max: 100 },
              ].map((macro) => (
                <div key={macro.label} className="relative">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-xs uppercase tracking-widest font-bold text-[#8B949E]">{macro.label}</span>
                    <span className="text-sm font-bold text-[#E6EDF3] font-mono-numeric">{macro.value}g</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#161B23] overflow-hidden">
                    <div
                      className="h-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${Math.min((macro.value / macro.max) * 100, 100)}%`,
                        backgroundColor: macro.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hydration Protocol */}
          <div className="glass-card p-8">
            <span className="performance-header mb-6 block text-[#3A86FF]">Hydration Protocol</span>
            <div className="space-y-6">
              <div className="relative">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs uppercase tracking-widest font-bold text-[#8B949E]">Water</span>
                  <span className="text-sm font-bold text-[#E6EDF3] font-mono-numeric">{waterConsumed} <span className="text-xs text-[#8B949E]">/ {waterGoal}ml</span></span>
                </div>
                <div className="h-2.5 w-full bg-[#161B23] overflow-hidden rounded-full relative">
                  <div
                    className="h-full transition-all duration-1000 ease-out rounded-full shadow-[0_0_10px_rgba(58,134,255,0.5)]"
                    style={{
                      width: `${Math.min((waterConsumed / waterGoal) * 100, 100)}%`,
                      backgroundColor: waterConsumed >= waterGoal ? '#B4F000' : (waterConsumed / waterGoal) > 0.7 ? '#B4F000' : (waterConsumed / waterGoal) >= 0.4 ? '#F9C80E' : '#FF595E',
                    }}
                  />
                </div>
                {waterConsumed >= waterGoal && <div className="absolute top-0 right-0 -mt-6 text-[0.6rem] font-bold text-[#B4F000] uppercase tracking-widest animate-pulse">Optimal</div>}
              </div>

              <div className="flex flex-wrap gap-2">
                <button onClick={() => logWater(150, 'Shot')} className="glass-button text-[0.65rem] py-1.5 px-3 uppercase tracking-widest flex-1 hover:bg-[#3A86FF]/10 hover:border-[#3A86FF]/50 hover:text-[#3A86FF] transition-all">[+150ml]</button>
                <button onClick={() => logWater(250, 'Glass')} className="glass-button text-[0.65rem] py-1.5 px-3 uppercase tracking-widest flex-1 hover:bg-[#3A86FF]/10 hover:border-[#3A86FF]/50 hover:text-[#3A86FF] transition-all">[+250ml]</button>
                <button onClick={() => logWater(500, 'Bottle')} className="glass-button text-[0.65rem] py-1.5 px-3 uppercase tracking-widest flex-1 hover:bg-[#3A86FF]/10 hover:border-[#3A86FF]/50 hover:text-[#3A86FF] transition-all">[+500ml]</button>

                {showCustomWater ? (
                  <form onSubmit={(e) => { e.preventDefault(); if (Number(customWaterAmount) > 0) logWater(Number(customWaterAmount), 'Custom'); }} className="flex gap-1 flex-1">
                    <input type="number" value={customWaterAmount} onChange={e => setCustomWaterAmount(e.target.value)} placeholder="ml" className="glass-input w-16 text-xs text-center px-1 py-1 h-auto" autoFocus />
                    <button type="submit" className="glass-button text-[0.6rem] px-2 text-[#B4F000] hover:text-[#B4F000] hover:bg-[#B4F000]/10">OK</button>
                    <button type="button" onClick={() => setShowCustomWater(false)} className="glass-button text-[0.6rem] px-2 text-[#FF595E]">X</button>
                  </form>
                ) : (
                  <button onClick={() => setShowCustomWater(true)} className="glass-button text-[0.65rem] py-1.5 px-3 uppercase tracking-widest flex-1 hover:text-[#E6EDF3] transition-colors">[Custom]</button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Add Food and Log */}
        <div className="col-span-12 lg:col-span-7 space-y-8 animate-in fade-in slide-in-from-right-8 duration-700 delay-300 fill-mode-both">

          {/* Add Food AI Form */}
          <div className="glass-card p-8 space-y-6">
            <div className="flex justify-between items-center mb-4 border-b border-[#161B23] pb-4">
              <div className="flex gap-6">
                <button
                  onClick={() => { setInputMode('text'); setParsedResult(null); setError(''); }}
                  className={`text-[0.65rem] uppercase tracking-widest font-bold pb-2 transition-colors relative ${inputMode === 'text' ? 'text-[#B4F000]' : 'text-[#8B949E] hover:text-[#E6EDF3]'}`}
                >
                  Quick Scan (Text)
                  {inputMode === 'text' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#B4F000]" />}
                </button>
                <button
                  onClick={() => { setInputMode('photo'); setParsedResult(null); setError(''); }}
                  className={`text-[0.65rem] uppercase tracking-widest font-bold pb-2 transition-colors relative ${inputMode === 'photo' ? 'text-[#B4F000]' : 'text-[#8B949E] hover:text-[#E6EDF3]'}`}
                >
                  Photo Scan (AI)
                  {inputMode === 'photo' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#B4F000]" />}
                </button>
              </div>
              <span className="text-[0.6rem] uppercase tracking-widest font-bold text-[#3A86FF]">Gemini_Engine</span>
            </div>

            {error && (
              <div className="p-3 border border-[#FF595E]/30 text-[#FF595E] text-xs font-mono bg-[#FF595E]/5">
                FAULT: {error}
              </div>
            )}

            {!parsedResult ? (
              <form onSubmit={handleAnalyze} className="space-y-4">
                {inputMode === 'text' ? (
                  <div>
                    <label className="text-xs text-[#8B949E] uppercase tracking-wider mb-2 block">Food Description</label>
                    <input
                      type="text"
                      value={textInput}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTextInput(e.target.value)}
                      placeholder="e.g. 2 idlis with sambar"
                      className="glass-input w-full"
                    />
                  </div>
                ) : (
                  <div
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    className={`relative border-2 border-dashed p-6 text-center transition-colors ${isDragging ? 'border-[#3A86FF] bg-[#3A86FF]/5' : 'border-[#161B23] bg-[#0A0D12]'
                      }`}
                  >
                    <label className="text-xs text-[#8B949E] uppercase tracking-wider mb-2 block cursor-pointer">
                      Drag & Drop or <span className="text-[#3A86FF]">Click to Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUploadChange}
                        className="hidden"
                      />
                    </label>
                    {photoPreview && (
                      <div className="mt-4 border border-[#161B23] p-1 bg-[#11151C]">
                        <img src={photoPreview} alt="Preview" className="w-full h-auto max-h-48 object-cover" />
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || (inputMode === 'text' ? !textInput : !photoPreview)}
                  className="glass-button w-full mt-4 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-3 h-3 border-2 border-t-[#B4F000] border-r-[#B4F000] border-b-transparent border-l-transparent rounded-full animate-spin" />
                      ANALYZING...
                    </>
                  ) : 'ANALYZE WITH AI'}
                </button>
              </form>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div>
                  <span className="text-[0.65rem] uppercase tracking-widest text-[#B4F000] block mb-1">Analysis Complete</span>
                  <h3 className="text-xl font-bold text-[#E6EDF3]">{parsedResult.name}</h3>
                  {parsedResult.serving && <div className="text-sm text-[#8B949E]">{parsedResult.serving}</div>}
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="p-3 border border-[#161B23] bg-[#0A0D12] text-center">
                    <div className="text-[0.6rem] uppercase text-[#8B949E] mb-1">CALS</div>
                    <div className="font-bold text-[#E6EDF3] font-mono-numeric">{parsedResult.calories}</div>
                  </div>
                  <div className="p-3 border border-[#161B23] bg-[#0A0D12] text-center">
                    <div className="text-[0.6rem] uppercase text-[#B4F000] mb-1">PRO</div>
                    <div className="font-bold text-[#E6EDF3] font-mono-numeric">{parsedResult.protein}g</div>
                  </div>
                  <div className="p-3 border border-[#161B23] bg-[#0A0D12] text-center">
                    <div className="text-[0.6rem] uppercase text-[#3A86FF] mb-1">CARBS</div>
                    <div className="font-bold text-[#E6EDF3] font-mono-numeric">{parsedResult.carbs}g</div>
                  </div>
                  <div className="p-3 border border-[#161B23] bg-[#0A0D12] text-center">
                    <div className="text-[0.6rem] uppercase text-[#8844FF] mb-1">FAT</div>
                    <div className="font-bold text-[#E6EDF3] font-mono-numeric">{parsedResult.fat}g</div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={() => setParsedResult(null)} className="glass-button w-1/3">CANCEL</button>
                  <button onClick={handleConfirmAdd} className="glass-button-primary w-2/3">CONFIRM & LOG</button>
                </div>
              </div>
            )}
          </div>

          {/* Food Log List */}
          <div className="glass-card p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
              <span className="performance-header">Telemetry Log</span>
              <span className="text-[0.65rem] text-[#8B949E] font-mono-numeric">{logs.length} ENTRIES</span>
            </div>

            {logs.length > 0 && (
              <div className="mb-6 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8B949E]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <input
                  type="text"
                  placeholder="SEARCH ENTRIES..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="w-full glass-input pl-10 h-10 text-xs"
                />
              </div>
            )}

            {logs.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-[#161B23] bg-[#0A0D12] rounded-lg">
                <div className="text-4xl mb-4">🍽️</div>
                <h3 className="text-[#E6EDF3] font-bold text-sm uppercase tracking-widest mb-1">Awaiting Data</h3>
                <p className="text-[#8B949E] text-xs leading-relaxed max-w-xs mx-auto">Upload a photo or log your food manually to initiate tracking metrics.</p>
              </div>
            ) : logs.filter((log: FoodEntry) => log.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
              <div className="py-8 text-center text-[#8B949E] text-xs">No matching entries found.</div>
            ) : (
              <div className="space-y-3">
                {logs
                  .filter((log: FoodEntry) => log.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((log: FoodEntry) => (
                    <div key={log.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-[#161B23] bg-[#0A0D12] group hover:border-[#3A86FF] transition-colors gap-4 sm:gap-0">
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{log.emoji}</span>
                        <div>
                          <div className="font-bold text-[#E6EDF3]">{log.name}</div>
                          <div className="flex gap-3 text-[0.6rem] font-mono-numeric text-[#8B949E] mt-1">
                            <span className="text-[#B4F000]">P:{log.protein}</span>
                            <span className="text-[#3A86FF]">C:{log.carbs}</span>
                            <span className="text-[#8844FF]">F:{log.fat}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="text-right">
                          <div className="font-bold text-xl text-[#E6EDF3] font-mono-numeric tracking-tight">{log.calories}</div>
                          <div className="text-[0.6rem] uppercase tracking-widest text-[#8B949E]">Kcal</div>
                        </div>
                        <button
                          onClick={() => deleteLog(log.id)}
                          className="text-[#FF595E]/50 hover:text-[#FF595E] transition-colors p-2 lg:opacity-0 lg:group-hover:opacity-100"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Conversational Chat Input */}
      <div className="glass-card flex flex-col h-[450px] animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500 fill-mode-both">
        <div className="p-4 border-b border-[#161B23] flex items-center justify-between">
          <span className="performance-header text-[#3A86FF]">ion.ai Assistant</span>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {chatMessages.length === 0 && (
            <div className="text-center text-[#8B949E] text-xs mt-10">
              <div className="text-3xl mb-3">👋</div>
              How can I help you track your nutrition today?
            </div>
          )}
          {chatMessages.map((msg, i) => (
            <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} ${msg.isProactive ? 'animate-in fade-in slide-in-from-bottom-2 duration-700' : ''}`}>
              <div className={`max-w-[80%] rounded-2xl p-4 text-sm ${msg.sender === 'user' ? 'bg-[#3A86FF]/10 border border-[#3A86FF]/30 text-[#E6EDF3] rounded-br-sm' : 'bg-[#161B23]/50 border border-[#161B23] text-[#8B949E] rounded-bl-sm'} ${msg.isProactive ? 'shadow-[0_0_15px_rgba(58,134,255,0.1)] border-[#3A86FF]/30' : ''}`}>
                {msg.sender === 'agent' && <span className="text-[#3A86FF] font-bold text-[0.65rem] uppercase tracking-widest block mb-2">{msg.isProactive ? '✨ ion.ai (Proactive)' : 'ion.ai'}</span>}
                {msg.text}
                {msg.cta && (
                  <div className="mt-4 flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleBannerAction('chat_cta', msg.cta!.action)}
                      className="glass-button text-[0.65rem] py-1.5 px-3 uppercase tracking-widest font-bold text-[#3A86FF] hover:text-[#E6EDF3] border-[#3A86FF]/20 hover:border-[#3A86FF]/50 bg-[#3A86FF]/5"
                    >
                      {msg.cta.label}
                    </button>
                    {msg.cta2 && (
                      <button
                        onClick={() => handleBannerAction('chat_cta2', msg.cta2!.action)}
                        className="glass-button text-[0.65rem] py-1.5 px-3 uppercase tracking-widest font-bold text-[#8B949E] hover:text-[#E6EDF3] border-[#161B23]/50 hover:border-[#161B23] bg-transparent"
                      >
                        {msg.cta2.label}
                      </button>
                    )}
                  </div>
                )}
                {msg.verdictCard && (
                  <div className="mt-4 p-4 border border-[#161B23] bg-[#0A0D12]/80 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-[0.65rem]">
                      {msg.verdictCard.verdict === 'great choice' && <span className="text-[#B4F000]">✅ Great Choice</span>}
                      {msg.verdictCard.verdict === 'okay' && <span className="text-[#3A86FF]">⚠️ Okay</span>}
                      {(msg.verdictCard.verdict === 'not ideal' || msg.verdictCard.verdict === 'avoid') && <span className="text-[#FF595E]">❌ Not Ideal</span>}
                    </div>
                    <div className="text-xs text-[#E6EDF3] italic border-l-2 border-[#161B23] pl-3 py-1">"{msg.verdictCard.reason}"</div>
                    {msg.verdictCard.water_warning && (
                      <div className="text-xs text-[#3A86FF] flex gap-2 items-start bg-[#3A86FF]/10 p-2 border border-[#3A86FF]/30">
                        <span>💧</span>
                        <div>
                          <span className="font-bold opacity-80 uppercase tracking-widest text-[0.55rem] block mb-1">Heads Up:</span>
                          {msg.verdictCard.water_warning}
                        </div>
                      </div>
                    )}
                    {msg.verdictCard.alternative && (
                      <div className="text-xs text-[#3A86FF]">
                        <span className="font-bold opacity-80 uppercase tracking-widest text-[0.55rem] block mb-1">Alternative:</span>
                        {msg.verdictCard.alternative}
                      </div>
                    )}
                    <div className="pt-2 border-t border-[#161B23] flex gap-3 text-[0.6rem] font-mono text-[#8B949E] mt-2">
                      <span>{msg.verdictCard.macros.calories}kcal</span>
                      <span>P:{msg.verdictCard.macros.protein}g</span>
                      <span>C:{msg.verdictCard.macros.carbs}g</span>
                      <span>F:{msg.verdictCard.macros.fat}g</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex justify-start w-full">
              <div className="bg-[#0A0D12] border border-[#161B23] text-[#8B949E] rounded-2xl rounded-bl-sm w-full max-w-[96%] overflow-hidden shadow-[0_0_30px_rgba(180,240,0,0.04)]">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#161B23]">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B4F000] animate-pulse" />
                    <span className="text-[#B4F000] font-bold text-[0.6rem] uppercase tracking-[0.2em] font-sans">ION THINKING</span>
                    <span className="text-[#B4F000] font-mono text-[0.7rem] animate-pulse">▋</span>
                  </div>
                  <span className="text-[0.5rem] text-[#8B949E] uppercase tracking-widest font-mono">LangGraph v0.2</span>
                </div>
                {/* Graph nodes */}
                <div className="px-4 py-4">
                  <div className="flex items-center gap-1 mb-4">
                    {(['classify', 'execute', 'generate', 'reflect'] as const).map((node, i) => {
                      const isDone = completedNodes.includes(node);
                      const isActive = activeNode === node;
                      return (
                        <React.Fragment key={node}>
                          <div className={`relative flex-1 flex flex-col items-center justify-center py-2.5 px-1 rounded-lg border transition-all duration-300 ${isActive ? 'border-[#B4F000] bg-[#B4F000]/10 shadow-[0_0_16px_rgba(180,240,0,0.35)] scale-105'
                            : isDone ? 'border-[#22c55e]/50 bg-[#22c55e]/5'
                              : 'border-[#161B23] bg-[#0A0D12] opacity-40'
                            }`}>
                            <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center">
                              {isActive && <><span className="w-3 h-3 rounded-full bg-[#B4F000] animate-ping absolute" /><span className="w-2 h-2 rounded-full bg-[#B4F000] relative z-10" /></>}
                              {isDone && <span className="w-3 h-3 rounded-full bg-[#22c55e] flex items-center justify-center text-black text-[0.5rem] font-black">✓</span>}
                            </div>
                            <span className={`text-[0.55rem] font-bold tracking-[0.12em] uppercase ${isActive ? 'text-[#B4F000]' : isDone ? 'text-[#22c55e]' : 'text-[#8B949E]'
                              }`}>{node}</span>
                          </div>
                          {i < 3 && (
                            <div className="flex-none w-5 flex items-center justify-center">
                              <svg width="18" height="8" viewBox="0 0 18 8" fill="none">
                                <path d="M0 4 L14 4" stroke={isDone ? '#22c55e' : isActive ? '#B4F000' : '#1e2530'} strokeWidth="1.5" strokeDasharray="4 2" />
                                <path d="M11 1.5 L14.5 4 L11 6.5" stroke={isDone ? '#22c55e' : '#1e2530'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                  <div className="space-y-1 font-mono text-[0.65rem]">
                    {routingSteps.map((step, idx) => (
                      <div key={idx} className="flex gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                        <span className="text-[#3A86FF] flex-none">›</span>
                        <span className="text-[#E6EDF3]">{step}</span>
                      </div>
                    ))}
                    {!routingSteps.length && (
                      <div className="flex gap-1.5 items-center py-1">
                        <div className="w-1 h-1 rounded-full bg-[#B4F000]/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1 h-1 rounded-full bg-[#B4F000]/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1 h-1 rounded-full bg-[#B4F000]/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                        <span className="text-[#8B949E] text-[0.6rem] ml-1">Initializing LangGraph...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
        <form onSubmit={handleChatSubmit} className="p-4 border-t border-[#161B23] flex gap-2 relative bg-[#0A0D12]/50 rounded-b-lg">
          <input
            type="text"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            placeholder="Type 'I had a bowl of oatmeal'..."
            className="w-full glass-input text-sm pr-12 h-12 rounded-xl"
            disabled={chatLoading}
          />
          <button
            type="submit"
            disabled={!chatInput.trim() || chatLoading}
            className="absolute right-6 top-1/2 -translate-y-1/2 text-[#3A86FF] hover:text-[#E6EDF3] transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>

        {/* Quick Log Chips */}
        {memory.frequentFoods.filter(f => f.count >= 2).length > 0 && (
          <div className="p-4 border-t border-[#161B23] bg-[#0A0D12]/80 rounded-b-lg">
            <div className="text-[0.65rem] uppercase tracking-widest text-[#8B949E] mb-3 font-bold">Your Usuals</div>
            <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
              {memory.frequentFoods.filter(f => f.count >= 2).slice(0, 4).map((food, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleQuickLog(food)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#161B23] hover:bg-[#3A86FF]/20 hover:border-[#3A86FF]/50 border border-[#161B23] rounded-full text-xs text-[#E6EDF3] whitespace-nowrap transition-colors flex-shrink-0"
                >
                  <span className="text-sm">{food.emoji}</span>
                  <span className="font-medium">{food.name}</span>
                  <span className="text-[0.6rem] text-[#8B949E] font-mono-numeric">{food.calories} kcal</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AI Suggestions Section */}
      <div ref={suggestionRef} className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500 fill-mode-both">

        {/* Feature 1: Autonomous Agent Decision Card */}
        <div className="glass-card p-0 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF595E]/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-[#FF595E]/10 transition-colors duration-700 pointer-events-none" />

          <div className="p-6 border-b border-[#161B23] flex justify-between items-center bg-[#0A0D12]">
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF595E] animate-pulse"></span>
              <span className="text-[0.65rem] font-bold tracking-widest uppercase text-[#FF595E]">Agent Assessment [LIVE]</span>
            </div>
            <span className="text-[0.55rem] uppercase tracking-widest text-[#8B949E] font-mono">Auto-Refresh: ON</span>
          </div>

          {!agentDecision && !loadingDecision ? (
            <div className="p-8 text-center text-[#8B949E] text-xs">Awaiting telemetry...</div>
          ) : loadingDecision && !agentDecision ? (
            <div className="p-8 space-y-4 animate-pulse">
              <div className="w-1/3 h-4 bg-[#161B23] rounded"></div>
              <div className="w-3/4 h-8 bg-[#161B23] rounded"></div>
            </div>
          ) : agentDecision ? (
            <div className="p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-1">
                <div className="text-[0.6rem] uppercase tracking-widest text-[#8B949E]">Situation</div>
                <div className="text-sm text-[#E6EDF3] leading-relaxed">{agentDecision.situation}</div>
              </div>

              <div className="bg-[#161B23]/30 border-l-2 border-[#B4F000] p-4 text-[#B4F000] space-y-2">
                <div className="flex items-start gap-3">
                  <div className="text-xl">→</div>
                  <div>
                    <div className="font-bold text-sm text-[#E6EDF3]">{agentDecision.recommendation}</div>
                    {agentDecision.meal && (
                      <div className="text-[0.7rem] font-mono tracking-wide text-[#B4F000] mt-1 opacity-80">
                        {agentDecision.meal.name} (~{agentDecision.meal.calories} kcal, {agentDecision.meal.protein}g protein)
                      </div>
                    )}
                    {agentDecision.hydration_note && (
                      <div className="text-[0.65rem] text-[#3A86FF] mt-2 flex gap-1 items-start font-bold uppercase tracking-widest">
                        <span>💧</span> {agentDecision.hydration_note}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-[0.6rem] uppercase tracking-widest text-[#8B949E]">Reason</div>
                <div className="text-xs text-[#8B949E] italic">"{agentDecision.reason}"</div>
              </div>

              <div className="pt-4 mt-4 border-t border-[#161B23]">
                <button
                  onClick={() => setShowDecisionReasoning(!showDecisionReasoning)}
                  className="flex items-center gap-2 text-[0.65rem] uppercase tracking-widest text-[#8B949E] hover:text-[#E6EDF3] transition-colors font-bold mb-4"
                >
                  <svg className={`w-3 h-3 transition-transform ${showDecisionReasoning ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Why did ION decide this?
                </button>

                {showDecisionReasoning && agentDecision.reasoning_steps && (
                  <div className="bg-[#0A0D12] border border-[#161B23] p-4 mb-4 font-mono text-[0.65rem] text-[#8B949E] space-y-2 relative overflow-hidden group/terminal">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#3A86FF]/30"></div>
                    {agentDecision.reasoning_steps.map((step: string, idx: number) => (
                      <div key={idx} className="flex gap-2">
                        <span className="text-[#3A86FF] font-bold opacity-80">{'>'}</span>
                        <span className="text-[#E6EDF3] leading-relaxed">{step}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <div className="flex gap-2 items-center">
                    <span className="text-lg">⚡</span>
                    <span className="text-[0.65rem] font-bold tracking-widest uppercase text-[#FF595E]">{agentDecision.urgency}</span>
                  </div>

                  <div className="flex gap-3">
                    {agentDecision.action === "Log this meal" && agentDecision.meal ? (
                      <button onClick={() => addPlanMealToLog(agentDecision.meal)} className="glass-button-primary text-[0.6rem] px-4 py-2 uppercase">
                        [LOG THIS]
                      </button>
                    ) : (
                      <button className="glass-button text-[0.6rem] px-4 py-2 uppercase">
                        [{agentDecision.action}]
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Feature 2: Next Day Meal Plan */}
        <div className="glass-card p-8">
          <div className="flex justify-between items-center mb-6">
            <span className="performance-header text-[#3A86FF]">Gemini_Intel</span>
            <span className="text-[0.65rem] uppercase tracking-widest text-[#E6EDF3] font-bold">Tomorrow Framework</span>
          </div>

          {!planTomorrow && !loadingPlan ? (
            <div className="text-center py-8">
              <button
                onClick={fetchTomorrowPlan}
                className="glass-button min-w-[200px]"
              >
                FORECAST TOMORROW
              </button>
            </div>
          ) : loadingPlan ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex justify-between items-center p-3 border border-[#161B23] bg-[#0A0D12]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#161B23] rounded-full"></div>
                    <div className="space-y-2">
                      <div className="w-16 h-3 bg-[#161B23] rounded"></div>
                      <div className="w-24 h-4 bg-[#161B23] rounded"></div>
                    </div>
                  </div>
                  <div className="w-12 h-8 bg-[#161B23] rounded"></div>
                </div>
              ))}
            </div>
          ) : planTomorrow ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="pt-2 mb-2 border-b border-[#161B23] pb-4">
                <button
                  onClick={() => setShowTomorrowReasoning(!showTomorrowReasoning)}
                  className="flex items-center gap-2 text-[0.65rem] uppercase tracking-widest text-[#8B949E] hover:text-[#E6EDF3] transition-colors font-bold"
                >
                  <svg className={`w-3 h-3 transition-transform ${showTomorrowReasoning ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Why did ION decide this?
                </button>

                {showTomorrowReasoning && planTomorrow.reasoning_steps && (
                  <div className="bg-[#0A0D12] border border-[#161B23] p-4 mt-3 font-mono text-[0.65rem] text-[#8B949E] space-y-2 relative overflow-hidden group/terminal">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#3A86FF]/30"></div>
                    {planTomorrow.reasoning_steps.map((step: string, idx: number) => (
                      <div key={idx} className="flex gap-2">
                        <span className="text-[#3A86FF] font-bold opacity-80">{'>'}</span>
                        <span className="text-[#E6EDF3] leading-relaxed">{step}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {planTomorrow.plan.map((meal: TomorrowPlanMeal, i: number) => (
                <div key={i} className="flex justify-between items-center p-3 border border-[#161B23] bg-[#0A0D12] group hover:border-[#3A86FF]/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{meal.emoji}</span>
                    <div>
                      <div className="text-[0.6rem] uppercase tracking-widest text-[#8B949E]">{meal.meal}</div>
                      <div className="font-bold text-[#E6EDF3] text-sm">{meal.name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-bold text-[#E6EDF3] font-mono-numeric">{meal.calories}</div>
                      <div className="text-[0.55rem] uppercase text-[#8B949E]">Kcal</div>
                    </div>
                    <button
                      onClick={() => addPlanMealToLog(meal)}
                      className="glass-button px-2 py-1 text-[0.6rem] hidden group-hover:block shrink-0"
                    >
                      ADD
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex justify-end pt-2">
                <button onClick={fetchTomorrowPlan} disabled={loadingPlan} className="text-[#8B949E] hover:text-[#E6EDF3] text-[0.65rem] transition-colors uppercase tracking-widest font-bold">
                  Generate Alternative Plan
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* End of Day Summary Modal */}
      {showSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050608]/90 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 animate-in zoom-in-95 duration-500 delay-100 fill-mode-both border-[#3A86FF]/30">
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-[#161B23]">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#B4F000] animate-pulse" />
                <span className="text-sm font-bold tracking-widest uppercase text-[#E6EDF3]">Session Summary</span>
              </div>
              <button onClick={() => setShowSummary(false)} className="text-[#8B949E] hover:text-[#FF595E] transition-colors text-xs tracking-widest uppercase font-bold px-3 py-1 border border-[#161B23] rounded-sm hover:border-[#FF595E]/50">
                CLOSE X
              </button>
            </div>

            <div className="space-y-10">
              {/* Total Kcal & Badge */}
              <div className="flex justify-between items-end bg-[#0A0D12] p-6 border border-[#161B23]">
                <div>
                  <div className="text-[0.65rem] uppercase tracking-widest text-[#8B949E] mb-2">Total Energy Yield</div>
                  <div className="text-5xl font-bold text-[#E6EDF3] font-mono-numeric tracking-tight">{totalCalories} <span className="text-xl text-[#8B949E]">/ {activeDailyGoal} kcal</span></div>
                  {wearableCalories > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 transition-all animate-in fade-in slide-in-from-left-2">
                      <span className="text-[0.55rem] font-black uppercase tracking-[0.2em] bg-[#3A86FF]/10 text-[#3A86FF] px-2 py-0.5 rounded border border-[#3A86FF]/20">Wearable Activity Bonus</span>
                      <span className="text-xs font-bold text-[#3A86FF]">+{wearableCalories} kcal</span>
                    </div>
                  )}
                </div>
                <div className={`px-5 py-2.5 text-xs uppercase tracking-widest font-bold border ${difference === 0 ? 'bg-[#3A86FF]/10 text-[#3A86FF] border-[#3A86FF]/30' : isSurplus ? 'bg-[#FF595E]/10 text-[#FF595E] border-[#FF595E]/30' : 'bg-[#B4F000]/10 text-[#B4F000] border-[#B4F000]/30'}`}>
                  {difference === 0 ? 'On Track' : isSurplus ? `${difference} kcal Over` : `${difference} kcal Under`}
                </div>
              </div>

              {/* Protein Absorption Risk Cross Check */}
              {totalProtein >= ((dailyGoal * 0.3) / 4) && waterConsumed < (waterGoal * 0.5) && (
                <div className="bg-[#FF595E]/5 border-l-4 border-[#FF595E] p-4 flex gap-4 items-start">
                  <span className="text-xl">⚠</span>
                  <div>
                    <div className="font-bold text-[#FF595E] text-[0.65rem] uppercase tracking-widest mb-1">Absorption Risk Detected</div>
                    <div className="text-xs text-[#E6EDF3] leading-relaxed">
                      You hit your protein target ({totalProtein}g) but only drank {waterConsumed}ml today. Low hydration reduces protein synthesis and renal clearance. Drink {waterGoal - waterConsumed}ml before sleep to properly process this macro.
                    </div>
                  </div>
                </div>
              )}

              {/* Macro Progress Bars */}
              <div className="space-y-6">
                <span className="text-[0.65rem] uppercase tracking-widest text-[#8B949E] block mb-4 border-b border-[#161B23] pb-2">Macro Distribution</span>
                {[
                  { label: 'Protein', value: totalProtein, color: '#B4F000', max: 200 },
                  { label: 'Carbs', value: totalCarbs, color: '#3A86FF', max: 300 },
                  { label: 'Fat', value: totalFat, color: '#8844FF', max: 100 },
                ].map((macro) => (
                  <div key={macro.label} className="relative">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-xs uppercase tracking-widest font-bold text-[#8B949E]">{macro.label}</span>
                      <span className="text-sm font-bold text-[#E6EDF3] font-mono-numeric">{macro.value}g</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#161B23] overflow-hidden">
                      <div
                        className="h-full transition-all duration-1000 ease-out"
                        style={{
                          width: `${Math.min((macro.value / macro.max) * 100, 100)}%`,
                          backgroundColor: macro.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Full Food Log */}
              <div>
                <span className="text-[0.65rem] uppercase tracking-widest text-[#8B949E] mb-4 border-b border-[#161B23] pb-2 block">Today's Input Log</span>
                <div className="space-y-2">
                  {logs.length === 0 ? (
                    <div className="text-center text-[#8B949E] text-xs py-4 italic">No telemetry recorded for this cycle.</div>
                  ) : (
                    logs.map((log: FoodEntry) => (
                      <div key={log.id} className="flex justify-between items-center p-3 bg-[#0A0D12] border border-[#161B23] group">
                        <div className="flex items-center gap-4">
                          <span className="text-xl">{log.emoji}</span>
                          <span className="text-sm font-bold text-[#E6EDF3]">{log.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex gap-3 text-[0.6rem] font-mono-numeric text-[#8B949E] hidden sm:flex">
                            <span className="text-[#B4F000]">P:{log.protein}</span>
                            <span className="text-[#3A86FF]">C:{log.carbs}</span>
                            <span className="text-[#8844FF]">F:{log.fat}</span>
                          </div>
                          <div className="text-sm font-bold font-mono-numeric text-[#E6EDF3] w-16 text-right">{log.calories} <span className="text-[0.55rem] text-[#8B949E] uppercase">kcal</span></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="text-center pt-8 border-t border-[#161B23]">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#B4F000]/10 border border-[#B4F000]/20 text-[#B4F000] text-[0.6rem] font-mono uppercase tracking-widest rounded-sm">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Summary synchronized to local buffer structure.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* End of Week Report Modal */}
      {showWeeklyReport && weeklyStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050608]/90 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="glass-card w-full max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-8 animate-in zoom-in-95 duration-500 delay-100 fill-mode-both border-[#8844FF]/30">
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-[#161B23]">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#8844FF] animate-pulse" />
                <span className="text-sm font-bold tracking-widest uppercase text-[#E6EDF3]">7-Day Systems Report</span>
              </div>
              <button onClick={() => setShowWeeklyReport(false)} className="text-[#8B949E] hover:text-[#FF595E] transition-colors text-xs tracking-widest uppercase font-bold px-3 py-1 border border-[#161B23] rounded-sm hover:border-[#FF595E]/50">
                CLOSE X
              </button>
            </div>

            <div className="space-y-8">
              {/* Workout Stats Row */}
              {(() => {
                const all = (() => { try { return JSON.parse(localStorage.getItem('ion_workout_log') || '[]'); } catch { return []; } })();
                const today = new Date();
                let activeDays = 0;
                let totalBurned = 0;
                for (let i = 6; i >= 0; i--) {
                  const d = new Date(today);
                  d.setDate(d.getDate() - i);
                  const dateStr = d.toISOString().split('T')[0];
                  const dayLogs = all.filter((w: any) => w.date === dateStr);
                  const burned = dayLogs.reduce((s: number, w: any) => s + (w.caloriesBurned || 0), 0);
                  if (burned > 0) activeDays++;
                  totalBurned += burned;
                }
                const avgBurned = activeDays > 0 ? Math.round(totalBurned / activeDays) : 0;
                return (
                  <div className="p-4 bg-[#0A0D12] border border-[#161B23] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">⚡</span>
                      <div>
                        <div className="text-[0.6rem] uppercase tracking-widest text-[#8B949E] mb-0.5">Workout Activity</div>
                        <div className="text-sm font-bold text-[#E6EDF3]">
                          Active days: <span className="text-[#B4F000]">{activeDays}/7</span>
                          <span className="text-[#8B949E] mx-2">·</span>
                          Avg burned: <span className="text-[#FF595E]">{avgBurned} kcal</span>
                        </div>
                      </div>
                    </div>
                    {activeDays === 0 && (
                      <span className="text-[0.55rem] text-[#8B949E] uppercase tracking-widest">No sessions</span>
                    )}
                  </div>
                );
              })()}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-[#0A0D12] border border-[#161B23] text-center">
                  <div className="text-[0.6rem] uppercase tracking-widest text-[#8B949E] mb-1">Weekly total</div>
                  <div className="text-xl font-bold text-[#E6EDF3] font-mono-numeric">{weeklyStats.total} <span className="text-xs text-[#8B949E]">kcal</span></div>
                </div>
                <div className="p-4 bg-[#0A0D12] border border-[#161B23] text-center">
                  <div className="text-[0.6rem] uppercase tracking-widest text-[#8B949E] mb-1">Daily Avg</div>
                  <div className="text-xl font-bold text-[#E6EDF3] font-mono-numeric">{weeklyStats.avg} <span className="text-xs text-[#8B949E]">kcal</span></div>
                </div>
                <div className="p-4 bg-[#0A0D12] border border-[#161B23] text-center">
                  <div className="text-[0.6rem] uppercase tracking-widest text-[#B4F000] mb-1">Best Day</div>
                  <div className="text-xl font-bold text-[#E6EDF3]">{weeklyStats.bestDay}</div>
                </div>
                <div className="p-4 bg-[#0A0D12] border border-[#161B23] text-center">
                  <div className="text-[0.6rem] uppercase tracking-widest text-[#FF595E] mb-1">Worst Day</div>
                  <div className="text-xl font-bold text-[#E6EDF3]">{weeklyStats.worstDay}</div>
                </div>
              </div>

              {/* Weekly Win Card */}
              <div className="border border-[#B4F000]/30 bg-[#B4F000]/5 p-6 rounded-lg relative overflow-hidden group shadow-[0_0_30px_rgba(180,240,0,0.05)]">
                <div className="flex justify-between items-start mb-2 relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🌟</span>
                    <span className="text-[0.65rem] uppercase tracking-widest text-[#B4F000] font-bold">Weekly Win</span>
                  </div>
                  {loadingWin && <span className="text-[0.6rem] uppercase tracking-widest text-[#8B949E] animate-pulse">Synthesizing...</span>}
                </div>
                {weeklyWin ? (
                  <p className="text-sm sm:text-lg text-[#E6EDF3] leading-relaxed relative z-10 font-medium">{weeklyWin}</p>
                ) : !loadingWin && (
                  <button onClick={fetchWeeklyInsight} className="glass-button text-[0.6rem] py-1 px-3 z-10 relative">Analyze Win</button>
                )}
              </div>

              {/* Chart */}
              <div className="h-64 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyStats.data} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#8B949E', fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8B949E', fontSize: 10 }} />
                    <Tooltip cursor={{ fill: '#161B23', opacity: 0.4 }} contentStyle={{ backgroundColor: '#0A0D12', borderColor: '#161B23', fontSize: '12px', color: '#E6EDF3' }} />
                    <ReferenceLine y={dailyGoal} stroke="#8B949E" strokeDasharray="3 3" />
                    <Bar dataKey="kcal" radius={[2, 2, 0, 0]} minPointSize={3}>
                      {weeklyStats.data.map((entry: WeeklyReportData, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.kcal === 0 ? '#161B23' : (entry.kcal > entry.goal ? '#FF595E' : '#B4F000')} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Body Goal Progress */}
              {profile && profile.goal !== 'Maintain' && (() => {
                const totalGoal = weeklyStats.data.reduce((sum, d) => sum + d.goal, 0);
                const actual = weeklyStats.total;
                const diff = profile.goal === 'Lose Weight' ? totalGoal - actual : actual - totalGoal;
                const grams = Math.round((diff / 7700) * 1000);
                return (
                  <div className="p-5 bg-[#0A0D12] border border-[#161B23] rounded-lg">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">⚖️</span>
                        <span className="text-[0.65rem] uppercase tracking-widest text-[#8B949E] font-bold">Net Body Impact</span>
                      </div>
                      <span className="text-xs text-[#E6EDF3] font-mono-numeric">~{Math.max(0, grams)}g of progress toward your goal</span>
                    </div>
                    <div className="h-2 w-full bg-[#161B23] overflow-hidden rounded-full">
                      <div className="h-full bg-[#B4F000] transition-all duration-1000 ease-out rounded-full" style={{ width: `${Math.min(100, Math.max(0, (grams / 500) * 100))}%` }} />
                    </div>
                  </div>
                );
              })()}

              {/* AI Insight */}
              <div className="border border-[#8844FF]/30 bg-[#8844FF]/5 p-6 relative overflow-hidden group">
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="text-[#8844FF]">✧</span>
                    <span className="text-[0.65rem] uppercase tracking-widest text-[#8844FF] font-bold">Gemini Intel Synthesis</span>
                  </div>
                  {!insight && !loadingInsight && (
                    <button onClick={fetchWeeklyInsight} className="glass-button text-[0.6rem] py-1 px-3">
                      Generate Insight
                    </button>
                  )}
                  {loadingInsight && (
                    <span className="text-[0.6rem] uppercase tracking-widest text-[#8B949E] animate-pulse">Analyzing Pattern Data...</span>
                  )}
                </div>

                {insight && (
                  <div className="relative z-10 space-y-4">
                    <p className="text-sm text-[#E6EDF3] leading-relaxed"><span className="text-[#8B949E] font-bold mr-2">MOTIVATION:</span> {insight.motivational}</p>
                    <p className="text-sm text-[#E6EDF3] leading-relaxed"><span className="text-[#8B949E] font-bold mr-2">ACTION:</span> {insight.actionable}</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Unified Agent Modal */}
      {showUnifiedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050608]/90 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="glass-card w-full max-w-lg p-8 animate-in zoom-in-95 duration-500 delay-100 fill-mode-both border-[#E6EDF3]/30">
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-[#161B23]">
              <div className="flex items-center gap-3">
                <span className="text-xl">🌐</span>
                <span className="text-sm font-bold tracking-widest uppercase text-[#E6EDF3]">Unified Telemetry Intel</span>
              </div>
              <button onClick={() => setShowUnifiedModal(false)} className="text-[#8B949E] hover:text-[#FF595E] transition-colors text-xs tracking-widest uppercase font-bold px-3 py-1 border border-[#161B23] rounded-sm hover:border-[#FF595E]/50">
                CLOSE X
              </button>
            </div>
            {loadingUnified ? (
              <div className="space-y-4 animate-pulse pt-4">
                <div className="w-full h-4 bg-[#161B23] rounded"></div>
                <div className="w-5/6 h-4 bg-[#161B23] rounded"></div>
                <div className="w-4/6 h-4 bg-[#161B23] rounded"></div>
              </div>
            ) : (
              <div className="relative pt-4">
                <div className="absolute -left-4 top-4 w-1 h-full bg-gradient-to-b from-[#3A86FF] via-[#8844FF] to-[#B4F000]" />
                <p className="text-[#E6EDF3] leading-relaxed text-sm md:text-base font-medium">{unifiedInsight}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-[#B4F000]/10 border border-[#B4F000]/30 text-[#B4F000] px-4 py-3 rounded-md shadow-lg flex items-center gap-3 backdrop-blur-md">
            <span className="text-xl">🚀</span>
            <span className="text-[0.7rem] uppercase tracking-widest font-bold">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* DEMO DATA BUTTON — bottom corner, subtle */}
      <button
        onClick={() => { loadDemoData(); window.location.reload(); }}
        className="fixed bottom-6 right-6 z-50 text-[0.55rem] uppercase tracking-[0.15em] font-bold text-[#8B949E]/40 hover:text-[#B4F000] border border-transparent hover:border-[#161B23] px-3 py-2 rounded transition-all duration-300"
        title="Load hackathon demo data"
      >
        ⚡ LOAD DEMO
      </button>

    </div>
  );
}
