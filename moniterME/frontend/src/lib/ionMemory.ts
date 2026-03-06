// ionMemory.ts — ION's persistent structured memory system
// Episodic + Semantic + Working memory layers

export interface EpisodicEvent {
  id: string;
  timestamp: number;
  date: string;
  type: 'food_log' | 'workout' | 'sleep' | 'goal_set' | 'pattern_detected' | 'milestone' | 'agent_intervention' | 'WEARABLE_HEART_RATE' | 'WEARABLE_STEPS' | 'WEARABLE_CALORIES' | 'WEARABLE_SLEEP' | 'HEALTH_STATE' | 'RECOVERY_SCORE';
  module: 'food' | 'workout' | 'sleep' | 'agent' | 'cross' | 'wearable';
  title: string;
  detail: string;
  data?: any;
}

export interface AgentGoal {
  id: string;
  title: string;
  description: string;
  metric: string;
  target: number;
  current: number;
  unit: string;
  deadline: string; // ISO date
  createdAt: string;
  status: 'active' | 'achieved' | 'missed' | 'paused';
  module: 'food' | 'workout' | 'sleep' | 'cross';
  streak: number;
  lastUpdated: string;
}

export interface DetectedPattern {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical' | 'positive';
  detectedAt: string;
  modules: string[];
  confidence: number; // 0-100
  actionable: boolean;
  dismissed: boolean;
}

export interface ConversationTurn {
  role: 'user' | 'ion';
  text: string;
  timestamp: number;
  intent?: string;
}

export interface AgentReasoningEntry {
  id: string;
  timestamp: number;
  trigger: string;
  observation: string;
  reasoning: string;
  decision: string;
  outcome?: string;
}

export interface IonMemory {
  // Episodic — what happened
  episodes: EpisodicEvent[];

  // Semantic — what ION knows about user
  userPreferences: {
    preferredFoods: string[];
    avoidedFoods: string[];
    typicalMealTimes: { breakfast?: string; lunch?: string; dinner?: string };
    strongDays: string[]; // Mon, Tue, etc.
    weakDays: string[];
    avgSleepHours: number;
    bestWorkoutTime: string;
  };

  // Goals — autonomous goal tracking
  goals: AgentGoal[];

  // Patterns — cross-module correlations
  patterns: DetectedPattern[];

  // Working memory — recent conversation
  conversationHistory: ConversationTurn[];

  // Agent reasoning log
  reasoningLog: AgentReasoningEntry[];

  // Stats cache
  statsCache: {
    weeklyCalAvg: number;
    weeklyProteinAvg: number;
    weeklyWorkoutDays: number;
    weeklyAvgSleep: number;
    currentStreak: number;
    lastUpdated: string;
  };
}

const MEMORY_KEY = 'ion_agent_memory';

// ── Read / Write ─────────────────────────────────────────────────────────────
export function readMemory(): IonMemory {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    if (raw) return JSON.parse(raw) as IonMemory;
  } catch { }
  return createEmptyMemory();
}

export function writeMemory(mem: IonMemory): void {
  try {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(mem));
  } catch { }
}

function createEmptyMemory(): IonMemory {
  return {
    episodes: [],
    userPreferences: {
      preferredFoods: [],
      avoidedFoods: [],
      typicalMealTimes: {},
      strongDays: [],
      weakDays: [],
      avgSleepHours: 7,
      bestWorkoutTime: 'evening',
    },
    goals: [],
    patterns: [],
    conversationHistory: [],
    reasoningLog: [],
    statsCache: {
      weeklyCalAvg: 0,
      weeklyProteinAvg: 0,
      weeklyWorkoutDays: 0,
      weeklyAvgSleep: 0,
      currentStreak: 0,
      lastUpdated: '',
    },
  };
}

// ── Episodic Memory ──────────────────────────────────────────────────────────
export function addEpisode(event: Omit<EpisodicEvent, 'id' | 'timestamp' | 'date'>): void {
  const mem = readMemory();
  const ep: EpisodicEvent = {
    ...event,
    id: `ep_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    date: new Date().toISOString().split('T')[0],
  };
  mem.episodes = [ep, ...mem.episodes].slice(0, 200); // keep last 200
  writeMemory(mem);
}

// ── Conversation Memory ──────────────────────────────────────────────────────
export function addConversationTurn(turn: Omit<ConversationTurn, 'timestamp'>): void {
  const mem = readMemory();
  mem.conversationHistory = [
    ...mem.conversationHistory,
    { ...turn, timestamp: Date.now() },
  ].slice(-30); // keep last 30 turns
  writeMemory(mem);
}

export function getRecentConversation(n = 6): ConversationTurn[] {
  const mem = readMemory();
  return mem.conversationHistory.slice(-n);
}

// ── Goal Management ──────────────────────────────────────────────────────────
export function addGoal(goal: Omit<AgentGoal, 'id' | 'createdAt' | 'lastUpdated' | 'streak'>): void {
  const mem = readMemory();
  const newGoal: AgentGoal = {
    ...goal,
    id: `goal_${Date.now()}`,
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    streak: 0,
  };
  mem.goals = [newGoal, ...mem.goals];
  writeMemory(mem);
}

export function updateGoalProgress(goalId: string, current: number): void {
  const mem = readMemory();
  const goal = mem.goals.find(g => g.id === goalId);
  if (goal) {
    goal.current = current;
    goal.lastUpdated = new Date().toISOString();
    if (current >= goal.target) {
      goal.status = 'achieved';
      goal.streak += 1;
    }
    writeMemory(mem);
  }
}

// ── Pattern Management ───────────────────────────────────────────────────────
export function addPattern(pattern: Omit<DetectedPattern, 'id' | 'detectedAt' | 'dismissed'>): void {
  const mem = readMemory();
  // Don't duplicate same pattern title
  if (mem.patterns.some(p => p.title === pattern.title && !p.dismissed)) return;
  const newPattern: DetectedPattern = {
    ...pattern,
    id: `pat_${Date.now()}`,
    detectedAt: new Date().toISOString(),
    dismissed: false,
  };
  mem.patterns = [newPattern, ...mem.patterns].slice(0, 20);
  writeMemory(mem);
}

export function dismissPattern(patternId: string): void {
  const mem = readMemory();
  const pat = mem.patterns.find(p => p.id === patternId);
  if (pat) { pat.dismissed = true; writeMemory(mem); }
}

// ── Reasoning Log ────────────────────────────────────────────────────────────
export function addReasoningEntry(entry: Omit<AgentReasoningEntry, 'id' | 'timestamp'>): void {
  const mem = readMemory();
  mem.reasoningLog = [{
    ...entry,
    id: `r_${Date.now()}`,
    timestamp: Date.now(),
  }, ...mem.reasoningLog].slice(0, 50);
  writeMemory(mem);
}

// ── Autonomous Pattern Detection ─────────────────────────────────────────────
export function runPatternDetection(): DetectedPattern[] {
  const newPatterns: Omit<DetectedPattern, 'id' | 'detectedAt' | 'dismissed'>[] = [];

  // Collect week of sleep data
  const sleepLogs: any[] = (() => {
    try { return JSON.parse(localStorage.getItem('ion_sleep_log') || '[]'); } catch { return []; }
  })();

  // Collect week of workout data
  const workoutLogs: any[] = (() => {
    try { return JSON.parse(localStorage.getItem('ion_workout_log') || '[]'); } catch { return []; }
  })();

  // ── Pattern 1: Low-sleep + calorie overage correlation ───────────────────
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  });

  let sleepOverageCorrelations = 0;
  for (const date of last7Days) {
    const sleep = sleepLogs.find((s: any) => s.date === date);
    if (!sleep || sleep.hoursSlept >= 6) continue;
    const foodSummary = (() => {
      try { return JSON.parse(localStorage.getItem(`food_summary_${date}`) || 'null'); } catch { return null; }
    })();
    if (foodSummary && foodSummary.totalCalories > foodSummary.goal) {
      sleepOverageCorrelations++;
    }
  }
  if (sleepOverageCorrelations >= 2) {
    newPatterns.push({
      title: 'Sleep–Appetite Link Detected',
      description: `On ${sleepOverageCorrelations} of your low-sleep nights this week, you exceeded your calorie goal. Sleep deprivation raises ghrelin by ~24%, driving overeating.`,
      severity: 'warning',
      modules: ['sleep', 'food'],
      confidence: Math.min(90, sleepOverageCorrelations * 30),
      actionable: true,
    });
  }

  // ── Pattern 2: Workout frequency declining ───────────────────────────────
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  });
  const recentWeekWorkouts = workoutLogs.filter((w: any) => last14.slice(0, 7).includes(w.date)).length;
  const prevWeekWorkouts = workoutLogs.filter((w: any) => last14.slice(7, 14).includes(w.date)).length;
  if (prevWeekWorkouts >= 3 && recentWeekWorkouts < prevWeekWorkouts - 1) {
    newPatterns.push({
      title: 'Workout Frequency Dropping',
      description: `You trained ${prevWeekWorkouts}× last week but only ${recentWeekWorkouts}× this week. Consistency beats intensity — even a 20-minute walk counts.`,
      severity: 'warning',
      modules: ['workout'],
      confidence: 75,
      actionable: true,
    });
  }

  // ── Pattern 3: Strong protein days correlation with sleep ─────────────────
  // Placeholder for positive reinforcement
  const sleepScores = sleepLogs.slice(0, 7).map((s: any) => s.score || 0);
  const avgSleep = sleepScores.length ? sleepScores.reduce((a: number, b: number) => a + b, 0) / sleepScores.length : 0;
  if (avgSleep >= 8.0) {
    newPatterns.push({
      title: 'Excellent Sleep Baseline',
      description: `Your 7-day average sleep score is ${avgSleep.toFixed(1)} — top 15% range. This directly supports muscle synthesis and cognitive performance.`,
      severity: 'positive',
      modules: ['sleep', 'food', 'workout'],
      confidence: 90,
      actionable: false,
    });
  }

  // ── Pattern 4: Post-workout nutrition gap ────────────────────────────────
  for (const workout of workoutLogs.slice(0, 7)) {
    if (workout.intensity !== 'high') continue;
    const date = workout.date;
    const foodSummary = (() => {
      try { return JSON.parse(localStorage.getItem(`food_summary_${date}`) || 'null'); } catch { return null; }
    })();
    if (foodSummary && foodSummary.protein < 30) {
      newPatterns.push({
        title: 'Post-Workout Protein Gap',
        description: `After your ${workout.type} session (${workout.caloriesBurned} kcal burned), you only logged ${foodSummary.protein}g protein. Target 40g+ within 45 min for optimal recovery.`,
        severity: 'warning',
        modules: ['workout', 'food'],
        confidence: 85,
        actionable: true,
      });
      break;
    }
  }

  // Save detected patterns
  newPatterns.forEach(p => addPattern(p as Omit<DetectedPattern, 'id' | 'detectedAt' | 'dismissed'>));

  const mem = readMemory();
  return mem.patterns.filter(p => !p.dismissed);
}

// ── Auto-initialize 7 goals from demo data ───────────────────────────────────
export function initDefaultGoals(profile: any): void {
  const mem = readMemory();
  if (mem.goals.length > 0) return; // already initialized

  const deadline = (() => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  })();

  const defaultGoals: Omit<AgentGoal, 'id' | 'createdAt' | 'lastUpdated' | 'streak'>[] = [
    {
      title: 'Hit Daily Protein Goal',
      description: `Consume ${Math.round((profile?.tdee || 2500) * 0.3 / 4)}g protein every day this week`,
      metric: 'protein_g',
      target: Math.round((profile?.tdee || 2500) * 0.3 / 4),
      current: 0,
      unit: 'g/day',
      deadline,
      status: 'active',
      module: 'food',
    },
    {
      title: 'Train 4× This Week',
      description: 'Log at least 4 workout sessions this week',
      metric: 'workout_sessions',
      target: 4,
      current: 0,
      unit: 'sessions',
      deadline,
      status: 'active',
      module: 'workout',
    },
    {
      title: 'Average 7.5h Sleep',
      description: 'Maintain at least 7.5 hours of sleep per night',
      metric: 'avg_sleep_hours',
      target: 7.5,
      current: 0,
      unit: 'hrs/night',
      deadline,
      status: 'active',
      module: 'sleep',
    },
    {
      title: 'Hit 2500ml Water Daily',
      description: 'Drink at least 2500ml of water every day this week',
      metric: 'water_ml',
      target: 2500,
      current: 0,
      unit: 'ml/day',
      deadline,
      status: 'active',
      module: 'food',
    },
    {
      title: 'Stay Under 2800 kcal',
      description: `Don't exceed ${(profile?.tdee || 2650) + 150} kcal on non-workout days`,
      metric: 'calories_under',
      target: 5,
      current: 2,
      unit: 'days/week',
      deadline,
      status: 'active',
      module: 'food',
    },
  ];

  defaultGoals.forEach(g => addGoal(g));
}

// ── Sync latest stats into goals ─────────────────────────────────────────────
export function syncGoalProgress(): void {
  const mem = readMemory();
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  });

  const workoutLogs: any[] = (() => {
    try { return JSON.parse(localStorage.getItem('ion_workout_log') || '[]'); } catch { return []; }
  })();
  const sleepLogs: any[] = (() => {
    try { return JSON.parse(localStorage.getItem('ion_sleep_log') || '[]'); } catch { return []; }
  })();

  const weekWorkouts = workoutLogs.filter((w: any) => last7.includes(w.date)).length;
  const thisWeekSleep = sleepLogs.filter((s: any) => last7.includes(s.date));
  const avgSleep = thisWeekSleep.length
    ? thisWeekSleep.reduce((a: number, s: any) => a + s.hoursSlept, 0) / thisWeekSleep.length
    : 0;

  mem.goals.forEach(goal => {
    if (goal.status !== 'active') return;
    if (goal.metric === 'workout_sessions') {
      goal.current = weekWorkouts;
      if (weekWorkouts >= goal.target) goal.status = 'achieved';
    }
    if (goal.metric === 'avg_sleep_hours') {
      goal.current = Math.round(avgSleep * 10) / 10;
      if (avgSleep >= goal.target) goal.status = 'achieved';
    }
    goal.lastUpdated = new Date().toISOString();
  });

  writeMemory(mem);
}
