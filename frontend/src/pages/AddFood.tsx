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
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-800">Add Food</h1>
      <p className="text-slate-600">
        Describe what you ate and AI will calculate the macros. Example: &quot;2 dosa with coconut
        chutney&quot;
      </p>

      <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Food description</label>
          <input
            type="text"
            value={foodText}
            onChange={(e) => setFoodText(e.target.value)}
            required
            placeholder="e.g. 2 dosa with coconut chutney"
            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-emerald-600 px-6 py-2.5 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? 'Calculating macros...' : 'Add Food'}
        </button>
      </form>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Food Log</h2>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {logs.length === 0 ? (
            <p className="p-6 text-slate-500">No food logged for this date.</p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {logs.map((log) => (
                <li key={log.id} className="flex justify-between p-4">
                  <div>
                    <p className="font-medium text-slate-800">{log.food_name}</p>
                    <p className="text-sm text-slate-500">
                      {log.calories} cal · P: {log.protein}g · C: {log.carbs}g · F: {log.fats}g
                    </p>
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
