import { useEffect, useState } from 'react';
import { getWorkoutHistory, getFoodLogs } from '@/lib/api';

type WorkoutSession = {
  id: string;
  date: string;
  exercises: { exerciseName: string; sets: number; reps: number; weight: number | null }[];
};

type FoodLog = {
  id: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  date: string;
};

export default function History() {
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'workouts' | 'food'>('workouts');
  const [historyDate, setHistoryDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    setLoading(true);
    Promise.all([getWorkoutHistory(30), getFoodLogs(historyDate)])
      .then(([workoutRes, foodRes]) => {
        setWorkouts(workoutRes.data.data);
        setFoodLogs(foodRes.data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [historyDate]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-gray-100">History</h1>
        <p className="text-gray-400 mt-2">View your past workouts and meals</p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setActiveTab('workouts')}
          className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 ${
            activeTab === 'workouts'
              ? 'bg-emerald-500 text-white'
              : 'glass-card text-gray-400 hover:text-gray-200'
          }`}
        >
          Workouts
        </button>
        <button
          onClick={() => setActiveTab('food')}
          className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 ${
            activeTab === 'food'
              ? 'bg-emerald-500 text-white'
              : 'glass-card text-gray-400 hover:text-gray-200'
          }`}
        >
          Food
        </button>
      </div>

      {activeTab === 'food' && (
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">Date</label>
          <input
            type="date"
            value={historyDate}
            onChange={(e) => setHistoryDate(e.target.value)}
            className="glass-input"
          />
        </div>
      )}

      {activeTab === 'workouts' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-100">Workout History (Last 30 days)</h2>
          {workouts.length === 0 ? (
            <div className="glass-card p-8 text-center text-gray-500">No workouts recorded yet.</div>
          ) : (
            <div className="space-y-4">
              {workouts.map((session) => (
                <div
                  key={session.id}
                  className="glass-card p-6 hover:bg-white/10 transition-colors"
                >
                  <p className="mb-4 font-semibold text-emerald-400">{session.date}</p>
                  <ul className="space-y-3">
                    {session.exercises.map((ex, i) => (
                      <li key={i} className="flex justify-between text-gray-300">
                        <span>{ex.exerciseName}</span>
                        <span className="text-gray-500">
                          {ex.sets}×{ex.reps}
                          {ex.weight != null && ` @ ${ex.weight}kg`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'food' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-100">Food Log - {historyDate}</h2>
          {foodLogs.length === 0 ? (
            <div className="glass-card p-8 text-center text-gray-500">No food logged for this date.</div>
          ) : (
            <div className="glass-card">
              <ul className="divide-y divide-white/5">
                {foodLogs.map((log) => (
                  <li key={log.id} className="p-6 hover:bg-white/5 transition-colors">
                    <p className="font-medium text-gray-200 mb-2">{log.food_name}</p>
                    <div className="flex gap-4 text-sm text-gray-400">
                      <span>{log.calories} cal</span>
                      <span>P: {log.protein}g</span>
                      <span>C: {log.carbs}g</span>
                      <span>F: {log.fats}g</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
