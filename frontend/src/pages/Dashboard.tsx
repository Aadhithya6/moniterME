import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
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
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-16 h-[2px] bg-[#B4F000] animate-[pulse_1.5s_infinite]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="border border-[#FF595E]/30 p-4 font-mono-numeric text-[#FF595E]">
        ERROR: {error || 'DATA_NULL'}
      </div>
    );
  }

  const { totals, goals } = data;

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      {/* Header reveal: Stagger 1 */}
      <header className="animate-in fade-in slide-in-from-top-4 duration-700 ease-out">
        <div className="flex justify-between items-end border-b border-[#161B23] pb-6">
          <div>
            <span className="performance-header block mb-2">System Status: Active</span>
            <h1 className="text-4xl font-bold tracking-tight text-[#E6EDF3]">Performance Overview</h1>
          </div>
          <div className="text-right font-mono-numeric">
            <div className="text-[#8B949E] text-[0.7rem] uppercase tracking-widest mb-1">Telemetry Sync</div>
            <div className="text-[#E6EDF3] text-sm">{data.date}</div>
          </div>
        </div>

        <div className="flex gap-8 mt-4 text-[0.65rem] uppercase tracking-[0.2em] font-bold text-[#8B949E]">
          <div className="flex gap-2 items-center">
            <span className="w-2 h-2 bg-[#B4F000]" />
            Recovery Score: <span className="text-[#E6EDF3]">88%</span>
          </div>
          <div className="flex gap-2 items-center">
            <span className="w-2 h-2 bg-[#3A86FF]" />
            Weekly Trend: <span className="text-[#E6EDF3]">+4.2%</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-12">
        {/* Primary Metric: Stagger 2 */}
        <div className="col-span-12 lg:col-span-8 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 fill-mode-both">
          <div className="relative group">
            <div className="absolute -inset-4 bg-[#B4F000]/5 opacity-0 group-hover:opacity-100 transition-opacity blur-2xl" />
            <div className="relative">
              <span className="performance-header">Primary Burn</span>
              <div className="flex items-baseline gap-4 mt-2">
                <span className="metric-large">{totals.calories.toLocaleString()}</span>
                <span className="text-[#8B949E] text-xl font-bold italic tracking-tighter">KCAL</span>
              </div>
              {goals?.calorieGoal && (
                <div className="mt-6">
                  <ProgressBar value={totals.calories} max={goals.calorieGoal} label="Energy Expenditure" color="accent" />
                </div>
              )}
            </div>
          </div>

          {/* Macro Telemetry: Stagger 4 */}
          <div className="glass-card p-10 animate-in fade-in duration-1000 delay-500 fill-mode-both relative overflow-hidden group/macro">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#B4F000]/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover/macro:bg-[#B4F000]/10 transition-colors duration-700" />

            <div className="flex justify-between items-start mb-10 relative">
              <div>
                <span className="performance-header">Macro distribution</span>
                <h3 className="text-xl font-bold text-[#E6EDF3] mt-1">Resource Allocation</h3>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2 text-[0.6rem] font-bold uppercase tracking-widest text-[#B4F000]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B4F000] animate-pulse" />
                  Live_Data
                </div>
                <div className="text-[0.6rem] text-[#8B949E] mt-1 font-mono-numeric uppercase">Sync_Ok</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <div className="h-64 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'PROTEIN', value: totals.protein * 4, color: '#B4F000' },
                        { name: 'CARBS', value: totals.carbs * 4, color: '#3A86FF' },
                        { name: 'FATS', value: totals.fats * 9, color: '#8844FF' },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={75}
                      outerRadius={95}
                      paddingAngle={8}
                      dataKey="value"
                      stroke="none"
                      animationBegin={200}
                      animationDuration={1500}
                    >
                      {[
                        { name: 'PROTEIN', color: '#B4F000' },
                        { name: 'CARBS', color: '#3A86FF' },
                        { name: 'FATS', color: '#8844FF' },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0A0D12',
                        border: '1px solid #161B23',
                        fontSize: '10px',
                        fontFamily: 'IBM Plex Mono',
                        borderRadius: '0'
                      }}
                      itemStyle={{ color: '#E6EDF3' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[0.6rem] uppercase tracking-widest text-[#8B949E] font-bold">Total_Cals</span>
                  <span className="text-2xl font-bold text-[#E6EDF3] font-mono-numeric">
                    {(totals.protein * 4 + totals.carbs * 4 + totals.fats * 9).toFixed(0)}
                  </span>
                </div>
              </div>

              <div className="space-y-6">
                {[
                  { label: 'Protein', value: totals.protein, energy: totals.protein * 4, color: '#B4F000', unit: 'G' },
                  { label: 'Carbohydrates', value: totals.carbs, energy: totals.carbs * 4, color: '#3A86FF', unit: 'G' },
                  { label: 'Fats', value: totals.fats, energy: totals.fats * 9, color: '#8844FF', unit: 'G' },
                ].map((macro) => (
                  <div key={macro.label} className="relative group/item">
                    <div className="flex justify-between items-end mb-2">
                      <div className="flex flex-col">
                        <span className="text-[0.6rem] uppercase tracking-widest font-bold text-[#8B949E]">{macro.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-[#E6EDF3] font-mono-numeric">{macro.value}</span>
                          <span className="text-[0.6rem] text-[#8B949E] font-bold italic">{macro.unit}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[0.6rem] text-[#8B949E] font-mono-numeric uppercase">Energy_Yield</div>
                        <div className="text-xs font-bold text-[#E6EDF3] font-mono-numeric">{macro.energy} KCAL</div>
                      </div>
                    </div>
                    <div className="h-1 w-full bg-[#161B23] overflow-hidden">
                      <div
                        className="h-full transition-all duration-1000 ease-out delay-700"
                        style={{
                          width: `${(macro.energy / (totals.protein * 4 + totals.carbs * 4 + totals.fats * 9 + 0.1)) * 100}%`,
                          backgroundColor: macro.color
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Metrics: Stagger 3 */}
        <div className="col-span-12 lg:col-span-4 space-y-10 animate-in fade-in slide-in-from-right-8 duration-700 delay-300 fill-mode-both">
          <div className="space-y-8">
            <div className="group">
              <span className="performance-header">Protein Load</span>
              <div className="metric-value mt-1">{totals.protein}<span className="text-xs ml-2 text-[#8B949E]">g</span></div>
              {goals?.proteinGoal && (
                <div className="mt-3">
                  <ProgressBar value={totals.protein} max={goals.proteinGoal} label="" color="accent" />
                </div>
              )}
            </div>

            <div className="group">
              <span className="performance-header">Carb Load</span>
              <div className="metric-value mt-1 text-[#3A86FF]">{totals.carbs}<span className="text-xs ml-2 text-[#8B949E]">g</span></div>
              {/* No specific goal for carbs yet, just tracking */}
            </div>

            <div className="group">
              <span className="performance-header">Fat Load</span>
              <div className="metric-value mt-1 text-[#8844FF]">{totals.fats}<span className="text-xs ml-2 text-[#8B949E]">g</span></div>
              {/* No specific goal for fats yet, just tracking */}
            </div>

            <div className="group">
              <span className="performance-header">Hydration Level</span>
              <div className="metric-value mt-1">{totals.waterMl}<span className="text-xs ml-2 text-[#8B949E]">ml</span></div>
              {goals?.waterGoal && (
                <div className="mt-3">
                  <ProgressBar value={totals.waterMl} max={goals.waterGoal} label="" color="blue" />
                </div>
              )}
              <form onSubmit={handleAddWater} className="mt-4 flex">
                <input
                  type="number"
                  min={1}
                  value={waterAmount}
                  onChange={(e) => setWaterAmount(e.target.value)}
                  className="glass-input w-24 text-xs h-8 border-r-0"
                />
                <button
                  type="submit"
                  disabled={waterLoading}
                  className="glass-button h-8 px-4 flex items-center justify-center border-[#161B23] bg-[#161B23] text-[#E6EDF3] hover:bg-[#B4F000] hover:text-black transition-colors"
                >
                  LOG_VOL
                </button>
              </form>
            </div>

            <div className="group">
              <span className="performance-header">Workout Session</span>
              <div className="metric-value mt-1">{totals.workoutCount}</div>
            </div>
          </div>

          <div className="pt-8 border-t border-[#161B23] flex flex-col gap-3">
            <Link to="/add-food" className="glass-button-primary w-full text-center">
              Deploy Food Entry
            </Link>
            <Link to="/add-workout" className="glass-button w-full text-center">
              Log Session
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
