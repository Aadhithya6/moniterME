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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-gray-100">Fitness Goals</h1>
        <p className="text-gray-400 mt-2">
          Set your daily targets. The dashboard will show your progress.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-8 max-w-2xl space-y-6">
        {success && (
          <div className="glass-card p-3 text-sm text-emerald-400 border-emerald-500/20">
            Goals saved successfully!
          </div>
        )}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">
            Calorie Goal (kcal/day)
          </label>
          <input
            type="number"
            min={0}
            value={calorieGoal}
            onChange={(e) => setCalorieGoal(e.target.value)}
            placeholder="e.g. 2000"
            className="glass-input w-full"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">
            Protein Goal (g/day)
          </label>
          <input
            type="number"
            min={0}
            value={proteinGoal}
            onChange={(e) => setProteinGoal(e.target.value)}
            placeholder="e.g. 150"
            className="glass-input w-full"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">
            Water Goal (ml/day)
          </label>
          <input
            type="number"
            min={0}
            value={waterGoal}
            onChange={(e) => setWaterGoal(e.target.value)}
            placeholder="e.g. 2500"
            className="glass-input w-full"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">
            Target Weight (kg)
          </label>
          <input
            type="number"
            min={0}
            step={0.1}
            value={targetWeight}
            onChange={(e) => setTargetWeight(e.target.value)}
            placeholder="e.g. 70"
            className="glass-input w-full"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="glass-button-primary"
        >
          {loading ? 'Saving...' : 'Save Goals'}
        </button>
      </form>
    </div>
  );
}
