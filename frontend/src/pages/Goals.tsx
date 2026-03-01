import { useEffect, useState } from 'react';
import { getGoals, upsertGoals } from '@/lib/api';

export default function Goals() {
  const [calorieGoal, setCalorieGoal] = useState('');
  const [proteinGoal, setProteinGoal] = useState('');
  const [waterGoal, setWaterGoal] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getGoals()
      .then((res) => {
        const g = res.data.data;
        if (g) {
          setCalorieGoal(g.calorieGoal?.toString() || '');
          setProteinGoal(g.proteinGoal?.toString() || '');
          setWaterGoal(g.waterGoal?.toString() || '');
          setTargetWeight(g.targetWeight?.toString() || '');
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    try {
      await upsertGoals({
        calorie_goal: calorieGoal ? parseInt(calorieGoal, 10) : undefined,
        protein_goal: proteinGoal ? parseInt(proteinGoal, 10) : undefined,
        water_goal: waterGoal ? parseInt(waterGoal, 10) : undefined,
        target_weight: targetWeight ? parseFloat(targetWeight) : undefined,
      });
      setSuccess(true);
    } catch {
      // Error handled by API
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-800">Fitness Goals</h1>
      <p className="text-slate-600">
        Set your daily targets. The dashboard will show your progress.
      </p>

      <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
        {success && (
          <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
            Goals saved successfully!
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Calorie Goal (kcal/day)
          </label>
          <input
            type="number"
            min={0}
            value={calorieGoal}
            onChange={(e) => setCalorieGoal(e.target.value)}
            placeholder="e.g. 2000"
            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Protein Goal (g/day)
          </label>
          <input
            type="number"
            min={0}
            value={proteinGoal}
            onChange={(e) => setProteinGoal(e.target.value)}
            placeholder="e.g. 150"
            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Water Goal (ml/day)
          </label>
          <input
            type="number"
            min={0}
            value={waterGoal}
            onChange={(e) => setWaterGoal(e.target.value)}
            placeholder="e.g. 2500"
            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Target Weight (kg)
          </label>
          <input
            type="number"
            min={0}
            step={0.1}
            value={targetWeight}
            onChange={(e) => setTargetWeight(e.target.value)}
            placeholder="e.g. 70"
            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-emerald-600 px-6 py-2.5 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Goals'}
        </button>
      </form>
    </div>
  );
}
