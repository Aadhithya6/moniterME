import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { readMemory } from '../lib/ionMemory';

type WorkoutType = 'Running' | 'Gym' | 'Yoga' | 'Cycling' | 'HIIT' | 'Walk';
type WorkoutLog = {
  id: string;
  date: string;
  type: WorkoutType;
  duration: number;
  caloriesBurned: number;
  intensity: string;
  note: string;
  timestamp: number;
};

const WORKOUT_ICONS: Record<WorkoutType, string> = {
  Running: '🏃',
  Gym: '🏋️',
  Yoga: '🧘',
  Cycling: '🚴',
  HIIT: '⚡',
  Walk: '🚶',
};

const WORKOUT_COLORS: Record<WorkoutType, string> = {
  Running: '#FF595E',
  Gym: '#B4F000',
  Yoga: '#8844FF',
  Cycling: '#3A86FF',
  HIIT: '#FF8800',
  Walk: '#00C9A7',
};

const getFriendlyError = (err: any) => {
  const msg = err?.message?.toLowerCase() || '';
  if (msg.includes('429') || msg.includes('quota')) return 'AI quota exceeded – try again later.';
  return err?.message || 'Unexpected error.';
};

function getTodayLogs(): WorkoutLog[] {
  const today = new Date().toISOString().split('T')[0];
  try {
    const raw = localStorage.getItem('ion_workout_log');
    const all: WorkoutLog[] = raw ? JSON.parse(raw) : [];
    return all.filter(w => w.date === today);
  } catch { return []; }
}

function getAllLogs(): WorkoutLog[] {
  try {
    const raw = localStorage.getItem('ion_workout_log');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveLog(entry: WorkoutLog) {
  const all = getAllLogs();
  all.unshift(entry);
  localStorage.setItem('ion_workout_log', JSON.stringify(all));
}

export default function WorkoutModule() {
  const navigate = useNavigate();
  const [workoutType, setWorkoutType] = useState<WorkoutType>('Running');
  const [duration, setDuration] = useState<number>(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [todayLogs, setTodayLogs] = useState<WorkoutLog[]>(() => getTodayLogs());
  const [lastResult, setLastResult] = useState<{ calories_burned: number; intensity: string; note: string } | null>(null);
  const [goalUpdated, setGoalUpdated] = useState<{ prev: number; next: number; burned: number; type: WorkoutType } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [recovery, setRecovery] = useState<{ score: number; status: string } | null>(null);

  useEffect(() => {
    const mem = readMemory();
    const recEv = mem.episodes.find(e => e.type === 'RECOVERY_SCORE');
    if (recEv) {
      setRecovery({ score: recEv.data.recoveryScore, status: recEv.data.status });
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const totalBurnedToday = todayLogs.reduce((s, w) => s + w.caloriesBurned, 0);

  // Workout stats for last 7 days
  const weeklyWorkoutStats = (() => {
    const all = getAllLogs();
    const today = new Date();
    const days: { date: string; burned: number }[] = [];
    let activeDays = 0;
    let totalBurned = 0;
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLogs = all.filter(w => w.date === dateStr);
      const burned = dayLogs.reduce((s, w) => s + w.caloriesBurned, 0);
      if (burned > 0) activeDays++;
      totalBurned += burned;
      days.push({ date: dateStr, burned });
    }
    return {
      activeDays,
      avgBurned: activeDays > 0 ? Math.round(totalBurned / activeDays) : 0,
      days
    };
  })();

  const handleLogWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!duration || duration <= 0) { setError('Enter a valid duration.'); return; }
    setError('');
    setLoading(true);
    setLastResult(null);
    setGoalUpdated(null);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error('VITE_GEMINI_API_KEY missing');

      const BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';
      const prompt = `User did ${workoutType} for ${duration} minutes. Estimate calories burned. Return ONLY JSON (no markdown): { "calories_burned": number, "intensity": "low" | "moderate" | "high", "note": "one sentence recovery tip" }`;

      const res = await fetch(`${BASE}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Empty response from AI');

      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
      setLastResult(parsed);

      const today = new Date().toISOString().split('T')[0];
      const newEntry: WorkoutLog = {
        id: Date.now().toString(),
        date: today,
        type: workoutType,
        duration,
        caloriesBurned: parsed.calories_burned,
        intensity: parsed.intensity,
        note: parsed.note,
        timestamp: Date.now(),
      };
      saveLog(newEntry);
      setTodayLogs(getTodayLogs());

      // Auto-adjust food goal (write to localStorage so FoodModule picks it up)
      const prevBurn = Number(localStorage.getItem(`ion_workout_log_${today}`) || 0);
      const newBurn = prevBurn + parsed.calories_burned;
      localStorage.setItem(`ion_workout_log_${today}`, String(newBurn));

      // Get base TDEE from profile
      const profileRaw = localStorage.getItem('ion_user_profile');
      const profile = profileRaw ? JSON.parse(profileRaw) : null;
      const tdee = profile?.tdee || 2000;
      const prevGoal = tdee + prevBurn;
      const newGoal = tdee + newBurn;
      setGoalUpdated({ prev: prevGoal, next: newGoal, burned: parsed.calories_burned, type: workoutType });

      showToast(`${WORKOUT_ICONS[workoutType]} ${workoutType} logged — ${parsed.calories_burned} kcal burned!`);
    } catch (err: any) {
      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const intensityColor = (i: string) => i === 'high' ? '#FF595E' : i === 'moderate' ? '#F9C80E' : '#B4F000';

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
          <div className="bg-[#B4F000] text-[#0A0D12] px-6 py-3 rounded-full font-bold text-sm shadow-2xl flex items-center gap-2">
            <span>⚡</span> {toastMessage}
          </div>
        </div>
      )}

      {/* Recovery Awareness Banner */}
      {recovery && (
        <div className={`glass-card p-4 border-l-4 animate-in slide-in-from-top-2 flex items-center gap-4`}
          style={{
            borderColor: recovery.score > 70 ? '#22c55e' : recovery.score > 40 ? '#FFB347' : '#FF595E',
            background: recovery.score > 70 ? 'rgba(34, 197, 94, 0.05)' : recovery.score > 40 ? 'rgba(255, 179, 71, 0.05)' : 'rgba(255, 89, 94, 0.05)'
          }}>
          <div className="text-2xl">
            {recovery.score > 70 ? '✅' : recovery.score > 40 ? '⚡' : '⚠️'}
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold" style={{ color: recovery.score > 70 ? '#22c55e' : recovery.score > 40 ? '#FFB347' : '#FF595E' }}>
              ION Recovery Insight: {recovery.status} ({recovery.score}%)
            </div>
            <p className="text-[0.7rem] text-[#8B949E]">
              {recovery.score > 70 ? 'Your biometrics are in the optimal zone. High intensity training is recommended.' :
                recovery.score > 40 ? 'Moderate fatigue detected. Focus on form and maintain a steady pace.' :
                  'High physical stress. ION recommends shifting to active recovery (Yoga/Walk) or full rest.'}
            </p>
          </div>
          <button
            onClick={() => setRecovery(null)}
            className="text-[#8B949E] hover:text-[#E6EDF3] text-xs"
          >✕</button>
        </div>
      )}

      {/* Header */}
      <header className="animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex justify-between items-end border-b border-[#161B23] pb-6 mt-6">
          <div>
            <span className="performance-header">Training Protocol</span>
            <h1 className="text-4xl font-bold tracking-tight text-[#E6EDF3] mt-2">Workout Module</h1>
          </div>
          <div className="flex items-center gap-6">
            {recovery && (
              <div className="text-right border-r border-[#161B23] pr-6">
                <div className="text-[0.6rem] uppercase tracking-widest text-[#8B949E] mb-1">Recovery</div>
                <div className={`text-2xl font-bold font-mono-numeric`} style={{ color: recovery.score > 70 ? '#22c55e' : recovery.score > 40 ? '#FFB347' : '#FF595E' }}>
                  {recovery.score}% <span className="text-[0.6rem] uppercase tracking-[0.2em]">{recovery.status}</span>
                </div>
              </div>
            )}
            <div className="text-right">
              <div className="text-[0.6rem] uppercase tracking-widest text-[#8B949E] mb-1">Burned Today</div>
              <div className="text-3xl font-bold font-mono-numeric text-[#B4F000]">
                {totalBurnedToday} <span className="text-sm text-[#8B949E]">kcal</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Goal Updated Banner */}
      {goalUpdated && (
        <div className="glass-card bg-[#B4F000]/5 border-[#B4F000]/30 p-5 animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{WORKOUT_ICONS[goalUpdated.type]}</span>
            <div>
              <div className="text-[0.6rem] uppercase tracking-widest text-[#B4F000] font-bold mb-1">Food Goal Auto-Updated</div>
              <p className="text-sm text-[#E6EDF3]">
                Goal updated: <span className="font-bold text-[#8B949E] line-through">{goalUpdated.prev} kcal</span>
                {' '}<span className="text-[#B4F000] font-bold">→ {goalUpdated.next} kcal</span>
                <span className="text-[#8B949E] ml-2">(you burned {goalUpdated.burned} kcal in {goalUpdated.type})</span>
              </p>
            </div>
            <button
              onClick={() => navigate('/food')}
              className="ml-auto glass-button text-[0.6rem] py-1.5 px-3 uppercase tracking-widest text-[#B4F000] border-[#B4F000]/30 hover:bg-[#B4F000]/10 whitespace-nowrap"
            >
              View Food →
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-8">
        {/* Left: Log Form */}
        <div className="col-span-12 lg:col-span-5 space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100 fill-mode-both">
          <div className="glass-card p-8">
            <span className="performance-header mb-6 block text-[#B4F000]">Log Workout</span>

            {/* Workout Type Selector */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {(Object.keys(WORKOUT_ICONS) as WorkoutType[]).map(type => (
                <button
                  key={type}
                  onClick={() => setWorkoutType(type)}
                  className={`p-3 rounded text-center transition-all duration-200 border flex flex-col items-center gap-1 ${workoutType === type
                    ? 'border-[#B4F000]/60 bg-[#B4F000]/10 shadow-[0_0_12px_rgba(180,240,0,0.2)]'
                    : 'border-[#161B23] hover:border-[#161B23]/80 bg-[#0A0D12]'
                    }`}
                >
                  <span className="text-xl">{WORKOUT_ICONS[type]}</span>
                  <span className={`text-[0.55rem] font-bold uppercase tracking-widest ${workoutType === type ? 'text-[#B4F000]' : 'text-[#8B949E]'}`}>{type}</span>
                </button>
              ))}
            </div>

            <form onSubmit={handleLogWorkout} className="space-y-5">
              <div>
                <label className="text-[0.65rem] uppercase tracking-widest text-[#8B949E] font-bold block mb-2">Duration (minutes)</label>
                <input
                  type="number"
                  min={1}
                  max={300}
                  value={duration}
                  onChange={e => setDuration(Number(e.target.value))}
                  className="w-full glass-input text-center text-2xl font-bold font-mono-numeric h-16"
                />
                {/* Quick presets */}
                <div className="flex gap-2 mt-2">
                  {[15, 20, 30, 45, 60].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDuration(m)}
                      className={`flex-1 text-[0.6rem] py-1.5 rounded border transition-colors ${duration === m
                        ? 'bg-[#B4F000]/10 border-[#B4F000]/40 text-[#B4F000]'
                        : 'bg-[#0A0D12] border-[#161B23] text-[#8B949E] hover:text-[#E6EDF3]'}`}
                    >
                      {m}min
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 border border-[#FF595E]/30 text-[#FF595E] text-xs font-mono bg-[#FF595E]/5">FAULT: {error}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full glass-button-primary py-4 uppercase tracking-widest font-bold text-sm transition-all ${loading ? 'opacity-50 cursor-wait' : ''}`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0A0D12] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0A0D12] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0A0D12] animate-bounce" style={{ animationDelay: '300ms' }} />
                    Analyzing...
                  </span>
                ) : `Log ${workoutType} Session`}
              </button>
            </form>
          </div>

          {/* AI Result Card */}
          {lastResult && (
            <div className="glass-card p-8 animate-in zoom-in-95 duration-500 border-[#B4F000]/20">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-[#B4F000] animate-pulse" />
                <span className="text-[0.6rem] uppercase tracking-widest text-[#B4F000] font-bold">Gemini Analysis</span>
              </div>
              <div className="flex justify-between items-baseline mb-4">
                <span className="text-[0.65rem] uppercase tracking-widest text-[#8B949E]">Calories Burned</span>
                <span className="text-4xl font-bold text-[#B4F000] font-mono-numeric">{lastResult.calories_burned}</span>
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[0.65rem] uppercase tracking-widest text-[#8B949E]">Intensity</span>
                <span className="px-3 py-1 rounded-full text-[0.6rem] font-bold uppercase tracking-widest" style={{ color: intensityColor(lastResult.intensity), backgroundColor: intensityColor(lastResult.intensity) + '15', border: `1px solid ${intensityColor(lastResult.intensity)}40` }}>
                  {lastResult.intensity}
                </span>
              </div>
              <div className="border-t border-[#161B23] pt-4">
                <span className="text-[0.6rem] uppercase tracking-widest text-[#8B949E] block mb-1">Recovery Tip</span>
                <p className="text-sm text-[#E6EDF3] leading-relaxed italic">"{lastResult.note}"</p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Today's Logs + Week Stats */}
        <div className="col-span-12 lg:col-span-7 space-y-6 animate-in fade-in slide-in-from-right-8 duration-700 delay-200 fill-mode-both">

          {/* Weekly Activity Heatmap */}
          <div className="glass-card p-8">
            <span className="performance-header mb-6 block">7-Day Activity</span>
            <div className="grid grid-cols-7 gap-2 mb-4">
              {weeklyWorkoutStats.days.map((day, i) => {
                const label = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(day.date).getDay()];
                const isToday = day.date === new Date().toISOString().split('T')[0];
                const pct = Math.min(day.burned / 600, 1);
                return (
                  <div key={i} className="text-center">
                    <div
                      className="w-full aspect-square rounded flex items-end justify-center mb-1 relative transition-all duration-500"
                      style={{
                        background: day.burned > 0 ? `rgba(180, 240, 0, ${0.1 + pct * 0.8})` : '#0A0D12',
                        border: isToday ? '1px solid rgba(180,240,0,0.5)' : '1px solid #161B23',
                      }}
                    >
                      {day.burned > 0 && (
                        <span className="absolute bottom-1 text-[0.55rem] font-bold font-mono-numeric text-[#B4F000]">{day.burned}</span>
                      )}
                    </div>
                    <span className={`text-[0.55rem] uppercase tracking-wider ${isToday ? 'text-[#B4F000]' : 'text-[#8B949E]'}`}>{label}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 text-[0.6rem] font-mono">
              <div className="flex items-center gap-2">
                <span className="w-8 h-2 rounded-full bg-[#B4F000]/80" />
                <span className="text-[#8B949E]">Higher burn</span>
              </div>
              <div className="ml-auto text-right">
                <span className="text-[#B4F000] font-bold">{weeklyWorkoutStats.activeDays}/7</span>
                <span className="text-[#8B949E] ml-1">active</span>
                <span className="ml-3 text-[#8B949E]">avg {weeklyWorkoutStats.avgBurned} kcal/session</span>
              </div>
            </div>
          </div>

          {/* Today's Workout Log */}
          <div className="glass-card p-8">
            <div className="flex justify-between items-center mb-6">
              <span className="performance-header">Today's Sessions</span>
              <span className="text-[0.6rem] uppercase tracking-widest text-[#8B949E]">{todayLogs.length} logged</span>
            </div>
            {todayLogs.length === 0 ? (
              <div className="text-center py-12 text-[#8B949E] text-xs uppercase tracking-widest">
                <div className="text-3xl mb-3">🏁</div>
                No workouts logged today
              </div>
            ) : (
              <div className="space-y-3">
                {todayLogs.map(log => (
                  <div
                    key={log.id}
                    className="flex items-center gap-4 p-4 bg-[#0A0D12] border border-[#161B23] rounded-lg transition-all hover:border-[#161B23]/80"
                    style={{ borderLeft: `3px solid ${WORKOUT_COLORS[log.type]}` }}
                  >
                    <span className="text-2xl">{WORKOUT_ICONS[log.type]}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#E6EDF3]">{log.type}</span>
                        <span className="px-1.5 py-0.5 rounded text-[0.5rem] font-bold uppercase" style={{ color: intensityColor(log.intensity), backgroundColor: intensityColor(log.intensity) + '15' }}>
                          {log.intensity}
                        </span>
                      </div>
                      <span className="text-[0.6rem] text-[#8B949E] font-mono">{log.duration} min</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold font-mono-numeric text-[#B4F000]">{log.caloriesBurned}</div>
                      <div className="text-[0.55rem] text-[#8B949E] uppercase tracking-widest">kcal</div>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-3 border-t border-[#161B23] mt-2">
                  <span className="text-[0.65rem] uppercase tracking-widest text-[#8B949E]">Total Burned</span>
                  <span className="text-xl font-bold font-mono-numeric text-[#B4F000]">{totalBurnedToday} kcal</span>
                </div>
              </div>
            )}
          </div>

          {/* Cross-Module Nudge */}
          {totalBurnedToday > 0 && (() => {
            const profileRaw = localStorage.getItem('ion_user_profile');
            const profile = profileRaw ? JSON.parse(profileRaw) : null;
            const tdee = profile?.tdee || 2000;
            const newGoal = tdee + totalBurnedToday;
            const requiredProtein = Math.round(newGoal * 0.3 / 4);
            return (
              <div className="glass-card p-6 bg-[#8844FF]/5 border-[#8844FF]/30 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-0.5">💪</span>
                  <div>
                    <div className="text-[0.6rem] uppercase tracking-widest text-[#8844FF] font-bold mb-1">Cross-Module Agent Nudge</div>
                    <p className="text-sm text-[#E6EDF3] leading-relaxed">
                      You trained today. Your updated protein target is{' '}
                      <span className="text-[#B4F000] font-bold">{requiredProtein}g</span> for muscle recovery.
                      Log a high-protein meal in the Food Module.
                    </p>
                    <button
                      onClick={() => navigate('/food')}
                      className="mt-3 glass-button text-[0.6rem] py-1.5 px-3 uppercase tracking-widest text-[#8844FF] border-[#8844FF]/30 hover:bg-[#8844FF]/10"
                    >
                      [GET SUGGESTION] →
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
