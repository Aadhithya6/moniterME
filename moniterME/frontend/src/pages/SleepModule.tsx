import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type SleepQuality = 'Poor' | 'Okay' | 'Good' | 'Great';

type SleepLog = {
  id: string;
  date: string;
  bedtime: string;
  wakeTime: string;
  hoursSlept: number;
  quality: SleepQuality;
  score: number;
  timestamp: number;
};

const QUALITY_MULTIPLIER: Record<SleepQuality, number> = {
  Poor: 0.7,
  Okay: 0.85,
  Good: 1.0,
  Great: 1.1,
};

const QUALITY_COLOR: Record<SleepQuality, string> = {
  Poor: '#FF595E',
  Okay: '#F9C80E',
  Good: '#3A86FF',
  Great: '#B4F000',
};

const QUALITY_EMOJI: Record<SleepQuality, string> = {
  Poor: '😴',
  Okay: '😐',
  Good: '😌',
  Great: '⭐',
};

function calcHoursSlept(bedtime: string, wakeTime: string): number {
  if (!bedtime || !wakeTime) return 0;
  const [bh, bm] = bedtime.split(':').map(Number);
  const [wh, wm] = wakeTime.split(':').map(Number);
  let bedMins = bh * 60 + bm;
  let wakeMins = wh * 60 + wm;
  if (wakeMins <= bedMins) wakeMins += 24 * 60; // crossed midnight
  return parseFloat(((wakeMins - bedMins) / 60).toFixed(1));
}

function calcScore(hoursSlept: number, quality: SleepQuality): number {
  const rawScore = hoursSlept * QUALITY_MULTIPLIER[quality];
  return parseFloat(Math.min(rawScore, 10).toFixed(1));
}

function getAllSleepLogs(): SleepLog[] {
  try {
    return JSON.parse(localStorage.getItem('ion_sleep_log') || '[]');
  } catch { return []; }
}

function saveSleepLog(entry: SleepLog) {
  const all = getAllSleepLogs().filter(l => l.date !== entry.date); // one per day
  all.unshift(entry);
  localStorage.setItem('ion_sleep_log', JSON.stringify(all));
}

function getTodaySleepLog(): SleepLog | null {
  const today = new Date().toISOString().split('T')[0];
  return getAllSleepLogs().find(l => l.date === today) || null;
}

const ScoreArc = ({ score }: { score: number }) => {
  const pct = score / 10;
  const r = 56;
  const circ = 2 * Math.PI * r;
  const dash = circ * 0.75 * pct;
  const scoreColor = score >= 8 ? '#B4F000' : score >= 6 ? '#3A86FF' : score >= 4 ? '#F9C80E' : '#FF595E';
  return (
    <svg viewBox="0 0 140 100" className="w-full max-w-[180px] mx-auto">
      <path d="M 15 95 A 56 56 0 1 1 125 95" fill="none" stroke="#161B23" strokeWidth="12" strokeLinecap="round" />
      <path
        d="M 15 95 A 56 56 0 1 1 125 95"
        fill="none"
        stroke={scoreColor}
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        style={{ filter: `drop-shadow(0 0 6px ${scoreColor}88)`, transition: 'stroke-dasharray 1s ease' }}
      />
      <text x="70" y="68" textAnchor="middle" fill={scoreColor} fontSize="28" fontWeight="bold" fontFamily="monospace">{score}</text>
      <text x="70" y="84" textAnchor="middle" fill="#8B949E" fontSize="8" fontFamily="monospace" letterSpacing="2">/ 10</text>
    </svg>
  );
};

export default function SleepModule() {
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];

  const [bedtime, setBedtime] = useState('22:30');
  const [wakeTime, setWakeTime] = useState('06:30');
  const [quality, setQuality] = useState<SleepQuality>('Good');
  const [saved, setSaved] = useState<SleepLog | null>(() => getTodaySleepLog());
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const hoursSlept = calcHoursSlept(bedtime, wakeTime);
  const score = calcScore(hoursSlept, quality);

  const handleSave = () => {
    const entry: SleepLog = {
      id: Date.now().toString(),
      date: today,
      bedtime,
      wakeTime,
      hoursSlept,
      quality,
      score,
      timestamp: Date.now(),
    };
    saveSleepLog(entry);
    // Also write the simple hours key for FoodModule cross-module read
    localStorage.setItem(`ion_sleep_log_${today}`, String(hoursSlept));
    setSaved(entry);
    showToast(`Sleep logged — ${hoursSlept}h ${quality} sleep. Score: ${score}/10 🌙`);
  };

  // Last 7 days logs
  const allLogs = getAllSleepLogs();
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const log = allLogs.find(l => l.date === dateStr);
    return { dateStr, log, dayLabel: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()] };
  });

  const avgHours = (() => {
    const logs = last7.filter(d => d.log).map(d => d.log!.hoursSlept);
    return logs.length ? parseFloat((logs.reduce((s, h) => s + h, 0) / logs.length).toFixed(1)) : 0;
  })();
  const avgScore = (() => {
    const scores = last7.filter(d => d.log).map(d => d.log!.score);
    return scores.length ? parseFloat((scores.reduce((s, h) => s + h, 0) / scores.length).toFixed(1)) : 0;
  })();

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#0A0D12] border border-[#8844FF]/40 text-[#8844FF] text-xs font-bold uppercase tracking-widest px-6 py-3 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <header className="animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex justify-between items-end border-b border-[#161B23] pb-6 mt-6">
          <div>
            <span className="performance-header text-[#8844FF]">Recovery Protocol</span>
            <h1 className="text-4xl font-bold tracking-tight text-[#E6EDF3] mt-2">Sleep Module</h1>
          </div>
          <div className="text-right">
            <div className="text-[0.6rem] uppercase tracking-widest text-[#8B949E] mb-1">7-Day Avg</div>
            <div className="text-3xl font-bold font-mono-numeric" style={{ color: avgHours >= 7 ? '#B4F000' : avgHours >= 6 ? '#F9C80E' : '#FF595E' }}>
              {avgHours}h <span className="text-sm text-[#8B949E]">sleep</span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-8">
        {/* Left: Log Form */}
        <div className="col-span-12 lg:col-span-5 space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100 fill-mode-both">

          {/* Score Preview */}
          <div className="glass-card p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[#8844FF]/3 pointer-events-none" />
            <span className="performance-header text-[#8844FF] mb-4 block">Sleep Score Preview</span>
            <ScoreArc score={saved ? saved.score : score} />
            <div className="mt-2 text-[0.6rem] uppercase tracking-widest text-[#8B949E]">
              {saved ? `${saved.hoursSlept}h · ${saved.quality}` : `${hoursSlept}h · ${quality}`}
            </div>
            {hoursSlept < 6 && !saved && (
              <div className="mt-3 text-xs text-[#FF595E] font-bold animate-pulse">
                ⚠ Under recommended 7h minimum
              </div>
            )}
            {saved && saved.hoursSlept < 6 && (
              <div className="mt-3 text-xs text-[#FF595E] font-bold">
                ⚠ Low sleep — agent will flag this in Food Module
              </div>
            )}
          </div>

          {/* Log Form */}
          <div className="glass-card p-8 space-y-6">
            <span className="performance-header mb-2 block">Log Sleep</span>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[0.65rem] uppercase tracking-widest text-[#8B949E] font-bold block mb-2">🌙 Bedtime</label>
                <input
                  type="time"
                  value={bedtime}
                  onChange={e => setBedtime(e.target.value)}
                  className="w-full glass-input text-center font-mono text-lg h-12"
                />
              </div>
              <div>
                <label className="text-[0.65rem] uppercase tracking-widest text-[#8B949E] font-bold block mb-2">☀ Wake Time</label>
                <input
                  type="time"
                  value={wakeTime}
                  onChange={e => setWakeTime(e.target.value)}
                  className="w-full glass-input text-center font-mono text-lg h-12"
                />
              </div>
            </div>

            {/* Auto-calculated hours */}
            <div className="flex justify-between items-baseline p-3 bg-[#0A0D12] border border-[#161B23] rounded">
              <span className="text-[0.65rem] uppercase tracking-widest text-[#8B949E]">Hours Slept</span>
              <span className={`text-2xl font-bold font-mono-numeric ${hoursSlept >= 7 ? 'text-[#B4F000]' : hoursSlept >= 6 ? 'text-[#F9C80E]' : 'text-[#FF595E]'}`}>
                {hoursSlept}h
              </span>
            </div>

            {/* Quality Selector */}
            <div>
              <label className="text-[0.65rem] uppercase tracking-widest text-[#8B949E] font-bold block mb-3">Sleep Quality</label>
              <div className="grid grid-cols-4 gap-2">
                {(['Poor', 'Okay', 'Good', 'Great'] as SleepQuality[]).map(q => (
                  <button
                    key={q}
                    onClick={() => setQuality(q)}
                    className={`p-3 rounded text-center transition-all duration-200 border flex flex-col items-center gap-1 ${quality === q
                      ? 'shadow-[0_0_12px_rgba(136,68,255,0.3)]'
                      : 'border-[#161B23] bg-[#0A0D12]'
                      }`}
                    style={quality === q ? {
                      borderColor: QUALITY_COLOR[q] + '80',
                      backgroundColor: QUALITY_COLOR[q] + '18',
                    } : {}}
                  >
                    <span className="text-lg">{QUALITY_EMOJI[q]}</span>
                    <span
                      className="text-[0.55rem] font-bold uppercase tracking-widest"
                      style={{ color: quality === q ? QUALITY_COLOR[q] : '#8B949E' }}
                    >{q}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSave}
              className="w-full glass-button-primary py-4 uppercase tracking-widest font-bold text-sm"
              style={{ background: 'linear-gradient(135deg, #8844FF, #6622DD)' }}
            >
              {saved ? 'Update Sleep Log' : 'Log Sleep'}
            </button>

            {saved && (
              <div className="text-center">
                <button
                  onClick={() => navigate('/food')}
                  className="text-[0.6rem] uppercase tracking-widest text-[#8844FF] hover:text-[#E6EDF3] transition-colors"
                >
                  View Food Module impact →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Charts + History */}
        <div className="col-span-12 lg:col-span-7 space-y-6 animate-in fade-in slide-in-from-right-8 duration-700 delay-200 fill-mode-both">

          {/* 7-Day Sleep Bars */}
          <div className="glass-card p-8">
            <div className="flex justify-between items-start mb-6">
              <span className="performance-header">7-Day Sleep Pattern</span>
              <div className="text-right">
                <div className="text-[0.55rem] text-[#8B949E] uppercase tracking-wider">Avg Score</div>
                <div className="text-lg font-bold font-mono-numeric" style={{ color: avgScore >= 7 ? '#B4F000' : avgScore >= 5 ? '#F9C80E' : '#FF595E' }}>{avgScore}/10</div>
              </div>
            </div>

            <div className="flex items-end gap-2 h-40">
              {last7.map(({ dayLabel, log, dateStr }, i) => {
                const isToday = dateStr === today;
                const h = log?.hoursSlept || 0;
                const heightPct = Math.min((h / 10) * 100, 100);
                const barColor = h >= 7 ? '#B4F000' : h >= 6 ? '#F9C80E' : h > 0 ? '#FF595E' : '#161B23';
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    {h > 0 && (
                      <span className="text-[0.5rem] text-[#8B949E] font-mono">{h}h</span>
                    )}
                    <div className="w-full rounded-t relative flex-1 flex items-end">
                      <div
                        className="w-full rounded-sm transition-all duration-700 ease-out"
                        style={{
                          height: h > 0 ? `${heightPct}%` : '4px',
                          backgroundColor: barColor,
                          opacity: isToday ? 1 : 0.75,
                          boxShadow: isToday && h > 0 ? `0 0 10px ${barColor}60` : 'none',
                          minHeight: '4px'
                        }}
                      />
                    </div>
                    {/* Quality dot */}
                    {log && (
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: QUALITY_COLOR[log.quality] }} />
                    )}
                    <span className={`text-[0.55rem] uppercase tracking-wider font-bold ${isToday ? 'text-[#B4F000]' : 'text-[#8B949E]'}`}>
                      {dayLabel}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex gap-4 mt-4 text-[0.55rem] font-mono text-[#8B949E]">
              <span><span className="inline-block w-2 h-2 rounded-full bg-[#B4F000] mr-1" />7h+</span>
              <span><span className="inline-block w-2 h-2 rounded-full bg-[#F9C80E] mr-1" />6–7h</span>
              <span><span className="inline-block w-2 h-2 rounded-full bg-[#FF595E] mr-1" />&lt;6h</span>
            </div>
          </div>

          {/* Sleep Log History */}
          <div className="glass-card p-8">
            <span className="performance-header mb-5 block">Recent Logs</span>
            {allLogs.length === 0 ? (
              <div className="text-center py-10 text-[#8B949E] text-xs uppercase tracking-widest">
                <div className="text-3xl mb-2">🌙</div>
                No sleep logged yet
              </div>
            ) : (
              <div className="space-y-3">
                {allLogs.slice(0, 5).map(log => (
                  <div
                    key={log.id}
                    className="flex items-center gap-4 p-4 bg-[#0A0D12] border border-[#161B23] rounded-lg"
                    style={{ borderLeft: `3px solid ${QUALITY_COLOR[log.quality]}` }}
                  >
                    <span className="text-xl">{QUALITY_EMOJI[log.quality]}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#E6EDF3]">{log.hoursSlept}h slept</span>
                        <span
                          className="text-[0.5rem] font-bold uppercase px-1.5 py-0.5 rounded"
                          style={{ color: QUALITY_COLOR[log.quality], backgroundColor: QUALITY_COLOR[log.quality] + '18' }}
                        >{log.quality}</span>
                      </div>
                      <span className="text-[0.6rem] text-[#8B949E] font-mono">
                        {log.bedtime} → {log.wakeTime} · {log.date}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold font-mono-numeric" style={{ color: log.score >= 7 ? '#B4F000' : log.score >= 5 ? '#F9C80E' : '#FF595E' }}>
                        {log.score}
                      </div>
                      <div className="text-[0.55rem] text-[#8B949E] uppercase tracking-widest">score</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cross-module note */}
          {saved && saved.hoursSlept < 6 && (
            <div className="glass-card p-6 bg-[#FF595E]/5 border-[#FF595E]/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">⚠️</span>
                <div>
                  <div className="text-[0.6rem] uppercase tracking-widest text-[#FF595E] font-bold mb-1">Agent Alert — Food Module</div>
                  <p className="text-sm text-[#E6EDF3] leading-relaxed">
                    You slept <span className="text-[#FF595E] font-bold">{saved.hoursSlept}h</span> last night. Sleep deprivation increases hunger hormones by up to 24%. Ion's agent will track this in your Food Module automatically.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
