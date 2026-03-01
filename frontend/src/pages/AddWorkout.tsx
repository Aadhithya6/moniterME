import { useState } from 'react';
import { createWorkoutSession, addExercise } from '@/lib/api';

type Exercise = {
  id?: string;
  exerciseName: string;
  sets: number;
  reps: number;
  weight: number | null;
};

export default function AddWorkout() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exerciseName, setExerciseName] = useState('');
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const startSession = async () => {
    setError('');
    setLoading(true);
    try {
      const { data } = await createWorkoutSession();
      setSessionId(data.data.id);
      setExercises([]);
    } catch {
      setError('Failed to start workout');
    } finally {
      setLoading(false);
    }
  };

  const addExerciseToSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId) return;
    setError('');
    setLoading(true);
    try {
      const { data } = await addExercise({
        session_id: sessionId,
        exercise_name: exerciseName,
        sets,
        reps,
        weight: weight ? parseFloat(weight) : undefined,
      });
      setExercises((prev) => [
        ...prev,
        {
          id: data.data.id,
          exerciseName: data.data.exerciseName,
          sets: data.data.sets,
          reps: data.data.reps,
          weight: data.data.weight,
        },
      ]);
      setExerciseName('');
      setSets(3);
      setReps(10);
      setWeight('');
    } catch {
      setError('Failed to add exercise');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-800">Add Workout</h1>

      {!sessionId ? (
        <div>
          <p className="mb-4 text-slate-600">
            Start a new workout session to log your exercises.
          </p>
          <button
            onClick={startSession}
            disabled={loading}
            className="rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? 'Starting...' : 'Start Workout'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          <form
            onSubmit={addExerciseToSession}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="mb-4 text-lg font-semibold text-slate-800">Add Exercise</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Exercise</label>
                <input
                  type="text"
                  value={exerciseName}
                  onChange={(e) => setExerciseName(e.target.value)}
                  required
                  placeholder="e.g. Bench Press"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Sets</label>
                <input
                  type="number"
                  min={1}
                  value={sets}
                  onChange={(e) => setSets(parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Reps</label>
                <input
                  type="number"
                  min={1}
                  value={reps}
                  onChange={(e) => setReps(parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-emerald-600 py-2 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>
          </form>

          <div>
            <h2 className="mb-4 text-lg font-semibold text-slate-800">This Session</h2>
            {exercises.length === 0 ? (
              <p className="text-slate-500">No exercises added yet.</p>
            ) : (
              <ul className="space-y-2">
                {exercises.map((ex, i) => (
                  <li
                    key={ex.id || i}
                    className="flex justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
                  >
                    <span className="font-medium">{ex.exerciseName}</span>
                    <span className="text-slate-600">
                      {ex.sets}×{ex.reps}
                      {ex.weight != null && ` @ ${ex.weight}kg`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            onClick={() => {
              setSessionId(null);
              setExercises([]);
            }}
            className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-100"
          >
            Finish Workout
          </button>
        </div>
      )}
    </div>
  );
}
