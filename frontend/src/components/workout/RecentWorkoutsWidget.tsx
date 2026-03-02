import { useEffect, useState } from 'react';
import { getWorkoutHistory } from '@/lib/api';
import { Link } from 'react-router-dom';

export default function RecentWorkoutsWidget() {
    const [recent, setRecent] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getWorkoutHistory(3)
            .then(res => setRecent(res.data.data))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="h-32 flex items-center justify-center text-xs text-[#8B949E]">Loading_Activity...</div>;

    return (
        <div className="glass-card p-6 h-full relative group/widget">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <span className="performance-header">Activity Feed</span>
                    <h3 className="text-lg font-bold text-[#E6EDF3] mt-1">Recent Sessions</h3>
                </div>
                <Link to="/workout-hub" className="text-[0.6rem] font-bold text-[#B4F000] uppercase tracking-widest hover:underline">
                    View_All
                </Link>
            </div>

            <div className="space-y-4">
                {recent.length === 0 ? (
                    <div className="text-xs text-[#8B949E] italic py-4">No recent training data available.</div>
                ) : (
                    recent.map((w) => (
                        <div key={w.id} className="flex justify-between items-center border-b border-[#161B23] pb-3 last:border-0 last:pb-0">
                            <div>
                                <div className="text-sm font-bold text-[#E6EDF3]">{w.name}</div>
                                <div className="text-[0.6rem] text-[#8B949E] uppercase">{new Date(w.date).toLocaleDateString()}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs font-bold text-[#3A86FF]">{parseFloat(w.total_volume).toLocaleString()}kg</div>
                                <div className="text-[0.6rem] text-[#8B949E] uppercase tracking-widest">{w.exercise_count} Exercises</div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
