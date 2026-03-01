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
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-800">History</h1>

      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('workouts')}
          className={`rounded-lg px-4 py-2 font-medium ${
            activeTab === 'workouts'
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50'
          }`}
        >
          Workouts
        </button>
        <button
          onClick={() => setActiveTab('food')}
          className={`rounded-lg px-4 py-2 font-medium ${
            activeTab === 'food'
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50'
          }`}
        >
          Food
        </button>
      </div>

      {activeTab === 'food' && (
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Date</label>
          <input
            type="date"
            value={historyDate}
            onChange={(e) => setHistoryDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      )}

      {activeTab === 'workouts' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Workout History</h2>
          {workouts.length === 0 ? (
            <p className="text-slate-500">No workouts recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {workouts.map((session) => (
                <div
                  key={session.id}
                  className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <p className="mb-4 font-semibold text-slate-800">{session.date}</p>
                  <ul className="space-y-2">
                    {session.exercises.map((ex, i) => (
                      <li key={i} className="flex justify-between text-slate-600">
                        <span>{ex.exerciseName}</span>
                        <span>
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
          <h2 className="text-lg font-semibold text-slate-800">Food Log - {historyDate}</h2>
          {foodLogs.length === 0 ? (
            <p className="text-slate-500">No food logged for this date.</p>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <ul className="divide-y divide-slate-200">
                {foodLogs.map((log) => (
                  <li key={log.id} className="flex justify-between p-4">
                    <p className="font-medium text-slate-800">{log.food_name}</p>
                    <p className="text-sm text-slate-500">
                      {log.calories} cal · P:{log.protein} C:{log.carbs} F:{log.fats}
                    </p>
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
