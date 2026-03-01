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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-gray-100">Add Workout</h1>
        <p className="text-gray-400 mt-2">Log your training session</p>
      </div>

      {!sessionId ? (
        <div className="glass-card p-8 max-w-2xl">
          <p className="mb-6 text-gray-300">
            Start a new workout session to log your exercises.
          </p>
          <button
            onClick={startSession}
            disabled={loading}
            className="glass-button-primary"
          >
            {loading ? 'Starting...' : 'Start Workout'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {error && (
            <div className="glass-card p-3 text-sm text-red-400 border-red-500/20">{error}</div>
          )}

          <form
            onSubmit={addExerciseToSession}
            className="glass-card p-8"
          >
            <h2 className="text-xl font-semibold text-gray-100 mb-6">Add Exercise</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">Exercise</label>
                <input
                  type="text"
                  value={exerciseName}
                  onChange={(e) => setExerciseName(e.target.value)}
                  required
                  placeholder="e.g. Bench Press"
                  className="glass-input w-full"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">Sets</label>
                <input
                  type="number"
                  min={1}
                  value={sets}
                  onChange={(e) => setSets(parseInt(e.target.value, 10) || 0)}
                  className="glass-input w-full"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">Reps</label>
                <input
                  type="number"
                  min={1}
                  value={reps}
                  onChange={(e) => setReps(parseInt(e.target.value, 10) || 0)}
                  className="glass-input w-full"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="Optional"
                  className="glass-input w-full"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="glass-button w-full"
                >
                  {loading ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>
          </form>

          <div>
            <h2 className="text-xl font-semibold text-gray-100 mb-4">This Session</h2>
            {exercises.length === 0 ? (
              <div className="glass-card p-8 text-center text-gray-500">No exercises added yet.</div>
            ) : (
              <ul className="space-y-3">
                {exercises.map((ex, i) => (
                  <li
                    key={ex.id || i}
                    className="glass-card p-4 flex justify-between items-center hover:bg-white/10 transition-colors"
                  >
                    <span className="font-medium text-gray-200">{ex.exerciseName}</span>
                    <span className="text-gray-400">
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
            className="glass-button"
          >
            Finish Workout
          </button>
        </div>
      )}
    </div>
  );
}
