import { useState, useEffect } from 'react';
import { logFood, getFoodLogs } from '@/lib/api';

type FoodLog = {
  id: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  date: string;
};

export default function AddFood() {
  const [foodText, setFoodText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const loadLogs = () => {
    getFoodLogs(date).then((res) => setLogs(res.data.data)).catch(() => setLogs([]));
  };

  useEffect(() => {
    loadLogs();
  }, [date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await logFood({ food_text: foodText.trim(), date });
      setFoodText('');
      loadLogs();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Failed to add food');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-gray-100">Add Food</h1>
        <p className="text-gray-400 mt-2">
          Describe what you ate and AI will calculate the macros
        </p>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-8 max-w-2xl space-y-6">
        {error && (
          <div className="glass-card p-3 text-sm text-red-400 border-red-500/20">{error}</div>
        )}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">Food description</label>
          <input
            type="text"
            value={foodText}
            onChange={(e) => setFoodText(e.target.value)}
            required
            placeholder="e.g. 2 dosa with coconut chutney"
            className="glass-input w-full"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="glass-input w-full"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="glass-button-primary"
        >
          {loading ? 'Calculating macros...' : 'Add Food'}
        </button>
      </form>

      <div>
        <h2 className="text-xl font-semibold text-gray-100 mb-4">Food Log - {date}</h2>
        <div className="glass-card">
          {logs.length === 0 ? (
            <p className="p-8 text-gray-500 text-center">No food logged for this date.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {logs.map((log) => (
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
          )}
        </div>
      </div>
    </div>
  );
}
