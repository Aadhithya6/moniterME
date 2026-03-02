import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getWorkoutHistory, getWorkoutStats } from '@/lib/api';

type WorkoutSummary = {
    id: string;
    name: string;
    date: string;
    exercise_count: number;
    total_volume: number;
};

type WorkoutStats = {
    totalWorkouts: number;
    totalVolume: number;
    history: any[];
};

export default function WorkoutTracking() {
    const [history, setHistory] = useState<WorkoutSummary[]>([]);
    const [stats, setStats] = useState<WorkoutStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([getWorkoutHistory(10), getWorkoutStats()])
            .then(([historyRes, statsRes]) => {
                setHistory(historyRes.data.data);
                setStats(statsRes.data.data);
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <div className="flex items-center justify-center h-64 text-[#B4F000]">Loading Training Data...</div>;
    }

    return (
        <div className="space-y-10 max-w-5xl mx-auto">
            <header className="flex justify-between items-end border-b border-[#161B23] pb-6">
                <div>
                    <span className="performance-header block mb-2">Training Status: Ready</span>
                    <h1 className="text-4xl font-bold tracking-tight text-[#E6EDF3]">Workout Hub</h1>
                </div>
                <Link to="/add-workout" className="glass-button-primary">
                    Start New Workout
                </Link>
            </header>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-6">
                    <span className="performance-header">Total Sessions</span>
                    <div className="text-3xl font-bold text-[#E6EDF3] mt-2">{stats?.totalWorkouts || 0}</div>
                </div>
                <div className="glass-card p-6">
                    <span className="performance-header">Total Volume</span>
                    <div className="text-3xl font-bold text-[#3A86FF] mt-2">
                        {(stats?.totalVolume || 0).toLocaleString()} <span className="text-xs text-[#8B949E]">KG</span>
                    </div>
                </div>
                <div className="glass-card p-6">
                    <span className="performance-header">Average Intensity</span>
                    <div className="text-3xl font-bold text-[#B4F000] mt-2">
                        {stats && stats.totalWorkouts > 0
                            ? Math.round(stats.totalVolume / stats.totalWorkouts).toLocaleString()
                            : 0}
                        <span className="text-xs text-[#8B949E]"> KG/SES</span>
                    </div>
                </div>
            </div>

            {/* History List */}
            <div className="space-y-6">
                <h2 className="text-xl font-bold text-[#E6EDF3]">Recent History</h2>
                <div className="space-y-4">
                    {history.length === 0 ? (
                        <div className="glass-card p-12 text-center text-[#8B949E]">
                            No workouts recorded yet. Start training!
                        </div>
                    ) : (
                        history.map((workout) => (
                            <Link
                                key={workout.id}
                                to={`/workout/${workout.id}`}
                                className="glass-card p-6 flex justify-between items-center hover:border-[#B4F000]/50 transition-all group"
                            >
                                <div>
                                    <h3 className="text-lg font-bold text-[#E6EDF3] group-hover:text-[#B4F000] transition-colors">
                                        {workout.name}
                                    </h3>
                                    <p className="text-sm text-[#8B949E] mt-1">{new Date(workout.date).toLocaleDateString()}</p>
                                </div>
                                <div className="text-right flex gap-8">
                                    <div>
                                        <span className="text-[0.6rem] uppercase tracking-widest text-[#8B949E] block">Exercises</span>
                                        <span className="font-bold text-[#E6EDF3]">{workout.exercise_count}</span>
                                    </div>
                                    <div>
                                        <span className="text-[0.6rem] uppercase tracking-widest text-[#8B949E] block">Volume</span>
                                        <span className="font-bold text-[#3A86FF]">{parseFloat(workout.total_volume.toString()).toLocaleString()}kg</span>
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
