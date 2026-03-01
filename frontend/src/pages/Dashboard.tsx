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
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass-card p-4 text-red-400">
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-gray-100">Today's Overview</h1>
        <p className="text-gray-500 mt-1">{data.date}</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-card p-6 hover:scale-[1.02] transition-transform duration-200">
          <p className="text-sm font-medium text-gray-400">Calories</p>
          <p className="text-3xl font-bold text-emerald-400 mt-2">{totals.calories}</p>
          {goals?.calorieGoal && (
            <div className="mt-4">
              <ProgressBar value={totals.calories} max={goals.calorieGoal} label="" color="emerald" />
            </div>
          )}
        </div>
        
        <div className="glass-card p-6 hover:scale-[1.02] transition-transform duration-200">
          <p className="text-sm font-medium text-gray-400">Protein (g)</p>
          <p className="text-3xl font-bold text-blue-400 mt-2">{totals.protein}</p>
          {goals?.proteinGoal && (
            <div className="mt-4">
              <ProgressBar value={totals.protein} max={goals.proteinGoal} label="" color="blue" />
            </div>
          )}
        </div>
        
        <div className="glass-card p-6 hover:scale-[1.02] transition-transform duration-200">
          <p className="text-sm font-medium text-gray-400">Water (ml)</p>
          <p className="text-3xl font-bold text-cyan-400 mt-2">{totals.waterMl}</p>
          {goals?.waterGoal && (
            <div className="mt-4">
              <ProgressBar value={totals.waterMl} max={goals.waterGoal} label="" color="blue" />
            </div>
          )}
          <form onSubmit={handleAddWater} className="mt-4 flex gap-2">
            <input
              type="number"
              min={1}
              value={waterAmount}
              onChange={(e) => setWaterAmount(e.target.value)}
              className="glass-input w-20 text-sm"
            />
            <button
              type="submit"
              disabled={waterLoading}
              className="glass-button text-sm px-3"
            >
              + Add
            </button>
          </form>
        </div>
        
        <div className="glass-card p-6 hover:scale-[1.02] transition-transform duration-200">
          <p className="text-sm font-medium text-gray-400">Workouts</p>
          <p className="text-3xl font-bold text-gray-200 mt-2">{totals.workoutCount}</p>
        </div>
      </div>

      {goals && (
        <div className="glass-card p-8">
          <h2 className="text-xl font-semibold text-gray-100 mb-6">Goal Completion</h2>
          <div className="space-y-6">
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
            <p className="text-gray-500">Set your goals to track progress.</p>
          )}
        </div>
      )}

      <div className="glass-card p-8">
        <h2 className="text-xl font-semibold text-gray-100 mb-6">Macros Today</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={macroData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#111217', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: '#E5E7EB'
                }} 
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <Link
          to="/add-food"
          className="glass-button-primary"
        >
          Add Food
        </Link>
        <Link
          to="/add-workout"
          className="glass-button"
        >
          Add Workout
        </Link>
        <Link
          to="/goals"
          className="glass-button"
        >
          Set Goals
        </Link>
      </div>
    </div>
  );
}
