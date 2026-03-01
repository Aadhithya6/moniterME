import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getTodayDashboard, logWater } from '@/lib/api';
import ProgressBar from '@/components/ProgressBar';

type DashboardData = {
  date: string;
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    waterMl: number;
    workoutCount: number;
  };
  goals: {
    calorieGoal: number;
    proteinGoal: number;
    waterGoal: number;
    targetWeight: number | null;
  } | null;
  completion: {
    calories: number | null;
    protein: number | null;
    water: number | null;
  };
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [waterAmount, setWaterAmount] = useState('250');
  const [waterLoading, setWaterLoading] = useState(false);

  const refreshDashboard = () => {
    getTodayDashboard()
      .then((res) => setData(res.data.data))
      .catch(() => setError('Failed to load dashboard'));
  };

  useEffect(() => {
    getTodayDashboard()
      .then((res) => setData(res.data.data))
      .catch(() => setError('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  const handleAddWater = async (e: React.FormEvent) => {
    e.preventDefault();
    setWaterLoading(true);
    try {
      await logWater({ amount_ml: parseInt(waterAmount, 10) });
      refreshDashboard();
    } finally {
      setWaterLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-600">
        {error || 'No data available'}
      </div>
    );
  }

  const { totals, goals, completion } = data;
  const macroData = [
    { name: 'Calories', value: totals.calories, fill: '#10b981' },
    { name: 'Protein', value: totals.protein, fill: '#3b82f6' },
    { name: 'Carbs', value: totals.carbs, fill: '#f59e0b' },
    { name: 'Fats', value: totals.fats, fill: '#ef4444' },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-800">Today&apos;s Overview</h1>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Calories</p>
          <p className="text-2xl font-bold text-emerald-600">{totals.calories}</p>
          {goals?.calorieGoal && (
            <ProgressBar value={totals.calories} max={goals.calorieGoal} label="" color="emerald" />
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Protein (g)</p>
          <p className="text-2xl font-bold text-blue-600">{totals.protein}</p>
          {goals?.proteinGoal && (
            <ProgressBar value={totals.protein} max={goals.proteinGoal} label="" color="blue" />
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Water (ml)</p>
          <p className="text-2xl font-bold text-sky-600">{totals.waterMl}</p>
          {goals?.waterGoal && (
            <ProgressBar value={totals.waterMl} max={goals.waterGoal} label="" color="blue" />
          )}
          <form onSubmit={handleAddWater} className="mt-3 flex gap-2">
            <input
              type="number"
              min={1}
              value={waterAmount}
              onChange={(e) => setWaterAmount(e.target.value)}
              className="w-20 rounded border border-slate-300 px-2 py-1 text-sm"
            />
            <button
              type="submit"
              disabled={waterLoading}
              className="rounded bg-sky-600 px-3 py-1 text-sm text-white hover:bg-sky-700 disabled:opacity-50"
            >
              + Add
            </button>
          </form>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Workouts</p>
          <p className="text-2xl font-bold text-slate-800">{totals.workoutCount}</p>
        </div>
      </div>

      {goals && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Goal Completion</h2>
          <div className="space-y-4">
            {completion.calories != null && goals.calorieGoal && (
              <ProgressBar
                value={totals.calories}
                max={goals.calorieGoal}
                label="Calories"
                color="emerald"
              />
            )}
            {completion.protein != null && goals.proteinGoal && (
              <ProgressBar
                value={totals.protein}
                max={goals.proteinGoal}
                label="Protein"
                color="blue"
              />
            )}
            {completion.water != null && goals.waterGoal && (
              <ProgressBar
                value={totals.waterMl}
                max={goals.waterGoal}
                label="Water"
                color="blue"
              />
            )}
          </div>
          {!goals.calorieGoal && !goals.proteinGoal && !goals.waterGoal && (
            <p className="text-slate-500">Set your goals to track progress.</p>
          )}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Macros Today</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={macroData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <Link
          to="/add-food"
          className="rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-emerald-700"
        >
          Add Food
        </Link>
        <Link
          to="/add-workout"
          className="rounded-xl border-2 border-emerald-600 px-6 py-3 font-semibold text-emerald-600 transition hover:bg-emerald-50"
        >
          Add Workout
        </Link>
        <Link
          to="/goals"
          className="rounded-xl border-2 border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Set Goals
        </Link>
      </div>
    </div>
  );
}
