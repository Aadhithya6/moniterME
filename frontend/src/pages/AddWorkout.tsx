import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createWorkout, searchExercises, addExerciseToWorkout } from '@/lib/api';

type Set = {
  set_number: number;
  weight: number;
  reps: number;
  rest_seconds: number;
};

type WorkoutExercise = {
  exercise_id: string;
  name: string;
  sets: Set[];
  notes: string;
};

export default function AddWorkout() {
  const navigate = useNavigate();
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [workoutName, setWorkoutName] = useState('Morning Workout');
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    bodyPart: '',
    equipment: '',
    level: ''
  });
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchingResults, setIsSearchingResults] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const hasActiveFilters = searchQuery.length > 2 || Object.values(filters).some(v => v !== '');

    if (hasActiveFilters) {
      setIsSearchingResults(true);
      const delay = setTimeout(() => {
        searchExercises({
          q: searchQuery.length > 2 ? searchQuery : undefined,
          ...filters
        }).then(res => {
          setSearchResults(res.data.exercises);
          setTotalCount(res.data.pagination.total);
        }).finally(() => {
          setIsSearchingResults(false);
        });
      }, 300);
      return () => clearTimeout(delay);
    } else {
      setSearchResults([]);
      setTotalCount(0);
    }
  }, [searchQuery, filters]);

  const startWorkout = async () => {
    setLoading(true);
    try {
      const { data } = await createWorkout({ name: workoutName });
      setWorkoutId(data.data.id);
    } catch {
      setError('Failed to start workout');
    } finally {
      setLoading(false);
    }
  };

  const addExercise = (exercise: any) => {
    const newEx: WorkoutExercise = {
      exercise_id: exercise.id,
      name: exercise.name,
      sets: [{ set_number: 1, weight: 0, reps: 0, rest_seconds: 60 }],
      notes: ''
    };
    setWorkoutExercises([...workoutExercises, newEx]);
    clearFilters();
    setIsSearching(false);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilters({ type: '', bodyPart: '', equipment: '', level: '' });
  };

  const updateSet = (exerciseIndex: number, setIndex: number, field: keyof Set, value: number) => {
    const updated = [...workoutExercises];
    updated[exerciseIndex].sets[setIndex][field] = value;
    setWorkoutExercises(updated);
  };

  const addSet = (exerciseIndex: number) => {
    const updated = [...workoutExercises];
    const lastSet = updated[exerciseIndex].sets[updated[exerciseIndex].sets.length - 1];
    updated[exerciseIndex].sets.push({
      set_number: updated[exerciseIndex].sets.length + 1,
      weight: lastSet.weight,
      reps: lastSet.reps,
      rest_seconds: lastSet.rest_seconds
    });
    setWorkoutExercises(updated);
  };

  const saveWorkout = async () => {
    if (!workoutId) return;
    setLoading(true);
    try {
      // Add each exercise with its sets
      for (let i = 0; i < workoutExercises.length; i++) {
        const ex = workoutExercises[i];
        await addExerciseToWorkout({
          workout_id: workoutId,
          exercise_id: ex.exercise_id,
          order_index: i,
          notes: ex.notes,
          sets: ex.sets
        });
      }
      navigate('/workout-hub');
    } catch {
      setError('Failed to save workout data');
    } finally {
      setLoading(false);
    }
  };

  if (!workoutId) {
    return (
      <div className="max-w-xl mx-auto space-y-8 py-10">
        <h1 className="text-3xl font-bold text-[#E6EDF3]">New Training Session</h1>
        <div className="glass-card p-8">
          <label className="performance-header mb-2 block">Workout Name</label>
          <input
            type="text"
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            className="glass-input w-full mb-6"
          />
          <button
            onClick={startWorkout}
            disabled={loading}
            className="glass-button-primary w-full"
          >
            {loading ? 'Initializing...' : 'Ready to Start'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
      <header className="flex justify-between items-end border-b border-[#161B23] pb-6">
        <div>
          <span className="performance-header block mb-2">In Progress: {workoutName}</span>
          <h1 className="text-4xl font-bold tracking-tight text-[#E6EDF3]">Record Sets</h1>
        </div>
        <button onClick={saveWorkout} disabled={loading} className="glass-button-primary">
          {loading ? 'Saving...' : 'Finish Workout'}
        </button>
      </header>

      {error && <div className="text-red-400 font-mono text-sm">{error}</div>}

      <div className="space-y-12">
        {workoutExercises.map((ex, exIndex) => (
          <div key={exIndex} className="glass-card p-8 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#B4F000]/30 group-hover:bg-[#B4F000] transition-colors" />
            <h2 className="text-xl font-bold text-[#E6EDF3] mb-6 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-[#161B23] flex items-center justify-center text-sm border border-[#B4F000]/20 text-[#B4F000]">
                {exIndex + 1}
              </span>
              {ex.name}
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-4 px-2 text-[0.6rem] uppercase tracking-widest font-bold text-[#8B949E]">
                <div className="col-span-1">Set</div>
                <div className="col-span-3 text-center">Weight (kg)</div>
                <div className="col-span-3 text-center">Reps</div>
                <div className="col-span-3 text-center">Rest (s)</div>
                <div className="col-span-2"></div>
              </div>

              {ex.sets.map((set, setIndex) => (
                <div key={setIndex} className="grid grid-cols-12 gap-4 items-center animate-in fade-in slide-in-from-left-4 duration-300">
                  <div className="col-span-1 text-[#8B949E] font-bold text-sm">#{set.set_number}</div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      value={set.weight}
                      onChange={(e) => updateSet(exIndex, setIndex, 'weight', parseFloat(e.target.value) || 0)}
                      className="glass-input w-full text-center"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      value={set.reps}
                      onChange={(e) => updateSet(exIndex, setIndex, 'reps', parseInt(e.target.value) || 0)}
                      className="glass-input w-full text-center"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      value={set.rest_seconds}
                      onChange={(e) => updateSet(exIndex, setIndex, 'rest_seconds', parseInt(e.target.value) || 0)}
                      className="glass-input w-full text-center"
                    />
                  </div>
                  <div className="col-span-2 flex justify-end">
                    {setIndex === ex.sets.length - 1 && (
                      <button onClick={() => addSet(exIndex)} className="text-[#B4F000] hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Add Exercise Trigger */}
        <div className="relative">
          {isSearching ? (
            <div className="glass-card p-6 border-[#3A86FF]/50 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-4">
                <span className="performance-header text-[#3A86FF]">Exercise Library</span>
                {isSearchingResults && <div className="animate-spin h-4 w-4 border-2 border-[#3A86FF]/20 border-t-[#3A86FF] rounded-full" />}
              </div>

              <input
                autoFocus
                type="text"
                placeholder="Search exercise (e.g. Bench Press)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="glass-input w-full mb-4"
              />

              {/* Filters Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className="glass-input text-xs py-2 h-auto"
                >
                  <option value="">All Types</option>
                  <option value="Strength">Strength</option>
                  <option value="Cardio">Cardio</option>
                  <option value="Flexibility">Flexibility</option>
                  <option value="Power">Power</option>
                </select>
                <select
                  value={filters.bodyPart}
                  onChange={(e) => setFilters({ ...filters, bodyPart: e.target.value })}
                  className="glass-input text-xs py-2 h-auto"
                >
                  <option value="">All Body Parts</option>
                  <option value="Chest">Chest</option>
                  <option value="Back">Back</option>
                  <option value="Legs">Legs</option>
                  <option value="Shoulders">Shoulders</option>
                  <option value="Arms">Arms</option>
                  <option value="Core">Core</option>
                </select>
                <select
                  value={filters.equipment}
                  onChange={(e) => setFilters({ ...filters, equipment: e.target.value })}
                  className="glass-input text-xs py-2 h-auto"
                >
                  <option value="">All Equipment</option>
                  <option value="Barbell">Barbell</option>
                  <option value="Dumbbell">Dumbbell</option>
                  <option value="Machine">Machine</option>
                  <option value="Bodyweight">Bodyweight</option>
                </select>
                <select
                  value={filters.level}
                  onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                  className="glass-input text-xs py-2 h-auto"
                >
                  <option value="">All Levels</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              {/* Active Filter Chips */}
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(filters).map(([key, value]) => value && (
                  <span key={key} className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#3A86FF]/10 border border-[#3A86FF]/30 text-[0.6rem] text-[#3A86FF] uppercase font-bold">
                    {value}
                    <button onClick={() => setFilters({ ...filters, [key]: '' })} className="hover:text-white">&times;</button>
                  </span>
                ))}
                {(searchQuery.length > 2 || Object.values(filters).some(v => v !== '')) && (
                  <button onClick={clearFilters} className="text-[0.6rem] text-[#8B949E] hover:text-[#B4F000] uppercase font-bold transition-colors">Clear All</button>
                )}
              </div>

              <div className="flex justify-between items-center mb-2 px-1">
                <span className="text-[0.6rem] text-[#8B949E] uppercase tracking-widest">{totalCount} Exercises Found</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                {searchResults.map((res) => (
                  <button
                    key={res.id}
                    onClick={() => addExercise(res)}
                    className="p-3 bg-[#161B23] border border-[#161B23] hover:border-[#B4F000]/30 hover:bg-[#1C2128] text-sm text-left transition-all relative group/item"
                  >
                    <div className="font-bold text-[#E6EDF3]">{res.name}</div>
                    <div className="flex gap-2 mt-1">
                      <div className="text-[0.6rem] text-[#8B949E] uppercase tracking-widest">{res.body_part}</div>
                      <div className="text-[0.6rem] text-[#3A86FF] uppercase tracking-widest">{res.exercise_type}</div>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => setIsSearching(false)} className="mt-4 text-xs text-[#8B949E] hover:text-white uppercase tracking-widest">Cancel</button>
            </div>
          ) : (
            <button
              onClick={() => setIsSearching(true)}
              className="w-full glass-card p-8 border-dashed border-[#161B23] hover:border-[#3A86FF] hover:bg-[#3A86FF]/5 text-[#8B949E] hover:text-[#3A86FF] transition-all flex flex-col items-center gap-3"
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-bold uppercase tracking-[0.2em] text-xs">Add Exercise</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
