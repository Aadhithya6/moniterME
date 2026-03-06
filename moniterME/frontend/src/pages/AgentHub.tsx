import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  readMemory, writeMemory,
  addGoal, addEpisode,
  runPatternDetection, syncGoalProgress, initDefaultGoals,
  addReasoningEntry,
  type AgentGoal, type DetectedPattern, type AgentReasoningEntry,
} from '../lib/ionMemory';
import { routeAgentTask } from '../lib/agentRouter';
import { syncWearableData } from '../services/wearableSyncService';
import { calculateRecoveryScore } from '../services/recoveryEngine';
import { generateProactiveInsight } from '../agents/healthInsightAgent';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

declare global {
  interface Window {
    google: any;
  }
}

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// ─── Severity config ────────────────────────────────────────────────────────
const SEV = {
  critical: { border: '#FF595E', bg: 'rgba(255,89,94,0.08)', text: '#FF595E', icon: '⚠' },
  warning: { border: '#FFB347', bg: 'rgba(255,179,71,0.08)', text: '#FFB347', icon: '◆' },
  info: { border: '#3A86FF', bg: 'rgba(58,134,255,0.08)', text: '#3A86FF', icon: '●' },
  positive: { border: '#22c55e', bg: 'rgba(34,197,94,0.08)', text: '#22c55e', icon: '✦' },
};

// ─── Module badge ────────────────────────────────────────────────────────────
const MOD_COLOR: Record<string, string> = {
  food: '#B4F000', workout: '#3A86FF', sleep: '#8844FF', agent: '#FFB347', cross: '#22c55e',
};

export default function AgentHub() {
  const navigate = useNavigate();
  const profile = (() => { try { return JSON.parse(localStorage.getItem('ion_user_profile') || 'null'); } catch { return null; } })();

  const [memory, setMemory] = useState(readMemory());
  const [patterns, setPatterns] = useState<DetectedPattern[]>([]);
  const [activeTab, setActiveTab] = useState<'goals' | 'patterns' | 'reasoning' | 'wearable'>('goals');
  const [ionStatus, setIonStatus] = useState<'idle' | 'thinking' | 'acting'>('idle');
  const [thinkingText, setThinkingText] = useState('');
  const [newGoalOpen, setNewGoalOpen] = useState(false);
  const [ionChatInput, setIonChatInput] = useState('');
  const [ionChatMessages, setIonChatMessages] = useState<{ role: 'user' | 'ion'; text: string; verdictCard?: any; routingSteps?: string[]; activeNode?: string | null; completedNodes?: string[] }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Wearable Specific State
  const [wearableSyncing, setWearableSyncing] = useState(false);
  const [recoveryData, setRecoveryData] = useState<{ score: number; status: string } | null>(null);
  const [wearableSummary, setWearableSummary] = useState<{ steps: number; hr: number; calories: number; sleep: number }>({ steps: 0, hr: 0, calories: 0, sleep: 0 });
  const [briefing, setBriefing] = useState<string | null>(null);
  const [loadingBriefing, setLoadingBriefing] = useState(false);

  const [newGoalForm, setNewGoalForm] = useState({
    title: '',
    description: '',
    target: 0,
    unit: '',
    deadline: '',
    module: 'food' as AgentGoal['module'],
  });

  // ── Boot sequence ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile) return;
    initDefaultGoals(profile);
    syncGoalProgress();
    const detected = runPatternDetection();
    setPatterns(detected);
    setMemory(readMemory());

    // Add reasoning entry for initialization
    addReasoningEntry({
      trigger: 'Agent Hub opened',
      observation: `Profile loaded: ${profile.name}, ${profile.goal}. Checking ${detected.length} patterns.`,
      reasoning: 'Running full cross-module analysis on session start.',
      decision: 'Surfacing patterns and syncing goal progress.',
    });
    setMemory(readMemory());
    fetchWearableData();
  }, []);

  const fetchWearableData = () => {
    const mem = readMemory();
    const today = new Date().toISOString().split('T')[0];
    const events = mem.episodes.filter(e => e.date === today && e.module === 'wearable');

    const steps = events.find(e => e.type === 'WEARABLE_STEPS')?.data?.value || 0;
    const hr = events.find(e => e.type === 'WEARABLE_HEART_RATE')?.data?.value || 0;
    const calories = events.find(e => e.type === 'WEARABLE_CALORIES')?.data?.value || 0;
    const sleep = events.find(e => e.type === 'WEARABLE_SLEEP')?.data?.value || 0;

    setWearableSummary({ steps, hr, calories, sleep });

    const recEv = mem.episodes.find(e => e.type === 'RECOVERY_SCORE');
    if (recEv) {
      setRecoveryData({ score: recEv.data.recoveryScore, status: recEv.data.status });
    }
  };

  const handleSyncWearable = async () => {
    setWearableSyncing(true);
    try {
      await syncWearableData();
      fetchWearableData();
    } catch (error: any) {
      console.error("Wearable Sync Error:", error);
      if (error.message?.includes('Session Expired')) {
        alert("Google Fit session expired. Please reconnect.");
      }
    } finally {
      setWearableSyncing(false);
    }
  };

  const generateBriefing = async () => {
    setLoadingBriefing(true);
    const insight = await generateProactiveInsight();
    setBriefing(insight);
    setLoadingBriefing(false);
  };

  useEffect(() => {
    // Automatic sync on mount if connected
    if (localStorage.getItem('google_fit_token')) {
      handleSyncWearable();
    }
  }, []);

  const handleConnectGoogleFit = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || clientId.includes('your-google-client-id')) {
      alert("Missing Real Google Client ID. \n\nPlease go to Google Cloud Console, create an OAuth 2.0 Client ID for 'Web Application', and paste it in your .env file as VITE_GOOGLE_CLIENT_ID.");
      return;
    }

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.body.read https://www.googleapis.com/auth/fitness.sleep.read',
        callback: (response: any) => {
          if (response.access_token) {
            localStorage.setItem('google_fit_token', response.access_token);
            localStorage.setItem('google_fit_connected', 'true');
            handleSyncWearable();
          }
        },
      });
      client.requestAccessToken();
    } catch (e) {
      console.error("GIS Error:", e);
      alert("Google Identity Services failed to load. Check your internet or ad-blocker.");
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ionChatMessages]);

  // ── Autonomous think loop ────────────────────────────────────────────────
  const runAutonomousThink = async () => {
    if (!profile || ionStatus !== 'idle') return;
    setIonStatus('thinking');

    const thinkSteps = [
      'Scanning Food Module data...',
      'Cross-referencing Workout logs...',
      'Analyzing Sleep patterns...',
      'Running correlation engine...',
      'Synthesizing recommendations...',
    ];

    for (const step of thinkSteps) {
      setThinkingText(step);
      await new Promise(r => setTimeout(r, 500));
    }

    try {
      const llm = new ChatGoogleGenerativeAI({ model: "gemini-2.5-flash-lite", apiKey: API_KEY, maxRetries: 0 });
      const mem = readMemory();
      const recentEpisodes = mem.episodes.slice(0, 10).map(e => `${e.date}: [${e.module}] ${e.title}`).join('\n') || 'No recent episodes';
      const currentGoals = mem.goals.filter(g => g.status === 'active').map(g => `${g.title}: ${g.current}/${g.target} ${g.unit}`).join('\n') || 'No active goals';

      const prompt = `You are ION, an autonomous personal health agent. 
User: ${profile.name}, Goal: ${profile.goal}, TDEE: ${profile.tdee} kcal
Active Goals:\n${currentGoals}
Recent Activity:\n${recentEpisodes}

Generate a BRIEF autonomous analysis (2-3 sentences). Identify one actionable insight from the cross-module data. Be direct and specific with numbers. Return raw text only.`;

      const res = await llm.invoke(prompt);
      const insight = res.content.toString();

      addReasoningEntry({
        trigger: 'Autonomous think cycle',
        observation: `${mem.goals.filter(g => g.status === 'active').length} active goals, ${mem.patterns.filter(p => !p.dismissed).length} patterns detected`,
        reasoning: 'Cross-module analysis across food, workout, and sleep data',
        decision: insight,
        outcome: 'Insight surfaced to user',
      });

      addEpisode({
        type: 'agent_intervention',
        module: 'agent',
        title: 'Autonomous Analysis',
        detail: insight,
      });

      setMemory(readMemory());
      setIonStatus('idle');
      setThinkingText('');
    } catch {
      setIonStatus('idle');
      setThinkingText('');
    }
  };

  const handleIonChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ionChatInput.trim() || chatLoading) return;
    const userMsg = ionChatInput.trim();
    setIonChatInput('');
    const userMessageEntry = { role: 'user' as const, text: userMsg };
    setIonChatMessages(prev => [...prev, userMessageEntry]);
    setChatLoading(true);

    let currentRoutingSteps: string[] = [];
    let currentActiveNode: string | null = null;
    let currentCompletedNodes: string[] = [];

    // Add a temporary message for ION's thinking process, which will be updated
    const thinkingMessageIndex = ionChatMessages.length + 1; // Index for the new thinking message

    setIonChatMessages(prev => [...prev, {
      role: 'ion',
      text: 'ION is processing...',
      routingSteps: currentRoutingSteps,
      activeNode: currentActiveNode,
      completedNodes: currentCompletedNodes,
    }]);

    try {
      const resp = await routeAgentTask({
        apiKey: API_KEY,
        context: { userMsg, profile },
        onStep: (s) => {
          currentRoutingSteps = [...currentRoutingSteps, s];
          setIonChatMessages(prev => prev.map((msg, idx) => idx === thinkingMessageIndex ? { ...msg, routingSteps: currentRoutingSteps } : msg));
        },
        onActiveNode: (n: string) => {
          currentActiveNode = n;
          setIonChatMessages(prev => prev.map((msg, idx) => idx === thinkingMessageIndex ? { ...msg, activeNode: currentActiveNode } : msg));
        },
        onCompleteNode: (n: string) => {
          currentCompletedNodes = [...currentCompletedNodes, n];
          setIonChatMessages(prev => prev.map((msg, idx) => idx === thinkingMessageIndex ? { ...msg, completedNodes: currentCompletedNodes } : msg));
        },
        toolsConfig: {
          syncWearableData: handleSyncWearable,
          getRecoveryStatus: async () => {
            const res = await calculateRecoveryScore();
            fetchWearableData();
            return `Recovery: ${res.recoveryScore}% (${res.status})`;
          },
          getHealthInsight: async () => await generateProactiveInsight(),
        }
      });

      setIonChatMessages(prev => prev.map((msg, idx) =>
        idx === thinkingMessageIndex
          ? { ...msg, text: resp.text, verdictCard: resp.verdictCard, routingSteps: currentRoutingSteps, activeNode: null, completedNodes: currentCompletedNodes }
          : msg
      ));
      setMemory(readMemory());
    } catch {
      setIonChatMessages(prev => prev.map((msg, idx) =>
        idx === thinkingMessageIndex
          ? { ...msg, text: 'Agent currently unavailable.', routingSteps: currentRoutingSteps, activeNode: null, completedNodes: currentCompletedNodes }
          : msg
      ));
    } finally {
      setChatLoading(false);
    }
  };

  // ── Add manual goal ──────────────────────────────────────────────────────
  const handleAddGoal = () => {
    if (!newGoalForm.title || !newGoalForm.target || !newGoalForm.deadline) return;
    const mem = readMemory();
    addGoal({
      title: newGoalForm.title,
      description: newGoalForm.description,
      metric: newGoalForm.title.toLowerCase().replace(/\s+/g, '_'),
      target: newGoalForm.target,
      current: 0,
      unit: newGoalForm.unit,
      deadline: newGoalForm.deadline,
      status: 'active',
      module: newGoalForm.module,
    });
    addEpisode({
      type: 'goal_set',
      module: newGoalForm.module,
      title: `New goal: ${newGoalForm.title}`,
      detail: `Target: ${newGoalForm.target} ${newGoalForm.unit} by ${newGoalForm.deadline}`,
    });
    writeMemory(mem);
    setMemory(mem);
    setNewGoalOpen(false);
    setNewGoalForm({ title: '', description: '', target: 0, unit: '', deadline: '', module: 'food' });
  };

  const mem = memory;
  const activeGoals = mem.goals.filter(g => g.status === 'active');
  const achievedGoals = mem.goals.filter(g => g.status === 'achieved');
  const activePatterns = patterns.filter(p => !p.dismissed);
  const recentReasoning = mem.reasoningLog.slice(0, 8);

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="text-6xl">🧠</div>
        <h2 className="text-2xl font-bold text-[#E6EDF3]">ION Agent Hub</h2>
        <p className="text-[#8B949E] text-center max-w-md">Complete your profile in the Food Module to activate ION's autonomous agent capabilities.</p>
        <button onClick={() => navigate('/food')} className="glass-button-primary px-8 py-3 uppercase tracking-widest text-sm font-bold">Set Up Profile →</button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-20 space-y-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-2 h-2 rounded-full ${ionStatus === 'idle' ? 'bg-[#22c55e]' : 'bg-[#B4F000] animate-pulse'}`} />
            <span className="text-[0.6rem] uppercase tracking-[0.25em] text-[#8B949E] font-bold">
              ION AGENT · {ionStatus.toUpperCase()}
            </span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-[#E6EDF3]">
            Agent <span className="text-[#B4F000]">Command</span>
          </h1>
          <p className="text-[#8B949E] text-sm mt-1">
            {activeGoals.length} active goals · {activePatterns.length} patterns detected · {mem.episodes.length} memory events
          </p>
        </div>
        <button
          onClick={runAutonomousThink}
          disabled={ionStatus !== 'idle'}
          className="glass-button-primary px-6 py-3 flex items-center gap-2 disabled:opacity-50 text-sm font-bold tracking-widest uppercase"
        >
          {ionStatus === 'thinking' ? (
            <><span className="w-2 h-2 rounded-full bg-[#B4F000] animate-ping" />{thinkingText || 'Thinking...'}</>
          ) : (
            <><span>⚡</span>Run Analysis</>
          )}
        </button>
      </div>

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Active Goals', value: activeGoals.length, sub: `${achievedGoals.length} achieved`, color: '#B4F000' },
          { label: 'Patterns Found', value: activePatterns.length, sub: `${activePatterns.filter(p => p.severity === 'warning').length} warnings`, color: '#FFB347' },
          { label: 'Memory Events', value: mem.episodes.length, sub: 'cross-module', color: '#3A86FF' },
          { label: 'Agent Cycles', value: mem.reasoningLog.length, sub: 'reasoning logs', color: '#8844FF' },
        ].map(stat => (
          <div key={stat.label} className="glass-card p-5">
            <div className="text-[0.55rem] uppercase tracking-[0.2em] text-[#8B949E] font-bold mb-2">{stat.label}</div>
            <div className="text-4xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-[0.65rem] text-[#8B949E] mt-1">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-3 gap-6">

        {/* ── Left: Chat with ION ── */}
        <div className="col-span-1 glass-card flex flex-col overflow-hidden" style={{ height: '600px' }}>
          <div className="px-5 py-4 border-b border-[#161B23] flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
            <span className="text-[0.6rem] uppercase tracking-[0.2em] text-[#B4F000] font-bold">ION Direct</span>
            <span className="ml-auto text-[0.5rem] text-[#8B949E] font-mono uppercase">With Memory</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {ionChatMessages.length === 0 && (
              <div className="text-center py-8 space-y-3">
                <div className="text-4xl">🧠</div>
                <p className="text-[#8B949E] text-xs leading-relaxed">Ask ION anything. It has full context of your goals, patterns, and history.</p>
                <div className="space-y-2">
                  {[
                    'Analyze my week',
                    'What should I focus on?',
                    'Set me a new protein goal',
                  ].map(q => (
                    <button key={q} onClick={() => setIonChatInput(q)} className="block w-full text-left px-3 py-2 text-[0.65rem] border border-[#161B23] rounded text-[#8B949E] hover:border-[#B4F000]/30 hover:text-[#E6EDF3] transition-all">
                      "{q}"
                    </button>
                  ))}
                </div>
              </div>
            )}
            {ionChatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2.5 text-xs leading-relaxed ${msg.role === 'user'
                  ? 'bg-[#B4F000] text-[#0A0D12] font-medium rounded-br-none'
                  : 'bg-[#161B23] text-[#E6EDF3] rounded-bl-none border border-[#1e2530]'
                  }`}>
                  {msg.role === 'ion' && <span className="text-[#B4F000] font-bold text-[0.55rem] uppercase tracking-widest block mb-1">ION</span>}
                  {msg.text}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-[#161B23] border border-[#1e2530] rounded-xl rounded-bl-none px-3 py-2.5">
                  <div className="flex gap-1 items-center">
                    <div className="w-1 h-1 rounded-full bg-[#B4F000] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1 h-1 rounded-full bg-[#B4F000] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1 h-1 rounded-full bg-[#B4F000] animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="text-[0.55rem] text-[#8B949E] ml-1">ION thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleIonChat} className="p-3 border-t border-[#161B23] flex gap-2">
            <input
              value={ionChatInput}
              onChange={e => setIonChatInput(e.target.value)}
              placeholder="Ask ION anything..."
              className="flex-1 glass-input text-xs py-2.5 rounded-lg"
              disabled={chatLoading}
            />
            <button type="submit" disabled={!ionChatInput.trim() || chatLoading} className="glass-button-primary px-3 py-2 text-xs font-bold disabled:opacity-40">→</button>
          </form>
        </div>

        {/* ── Right: Tab Panel ── */}
        <div className="col-span-2 flex flex-col gap-4">
          {/* Tab bar */}
          <div className="flex gap-1 p-1 bg-[#0A0D12] rounded-lg border border-[#161B23]">
            {(['goals', 'patterns', 'reasoning', 'wearable'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-[0.6rem] uppercase tracking-[0.18em] font-bold rounded transition-all ${activeTab === tab ? 'bg-[#B4F000] text-[#0A0D12]' : 'text-[#8B949E] hover:text-[#E6EDF3]'}`}
              >
                {tab}
                {tab === 'patterns' && activePatterns.filter(p => p.severity === 'warning' || p.severity === 'critical').length > 0 && (
                  <span className="ml-1.5 bg-[#FFB347] text-black text-[0.5rem] px-1 rounded">{activePatterns.filter(p => p.severity === 'warning' || p.severity === 'critical').length}</span>
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto space-y-3" style={{ maxHeight: '520px' }}>

            {/* ── GOALS TAB ── */}
            {activeTab === 'goals' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[0.55rem] uppercase tracking-widest text-[#8B949E]">{activeGoals.length} active goals this week</span>
                  <button onClick={() => setNewGoalOpen(!newGoalOpen)} className="text-[0.6rem] uppercase tracking-widest text-[#B4F000] hover:underline font-bold">
                    + New Goal
                  </button>
                </div>

                {newGoalOpen && (
                  <div className="glass-card p-5 space-y-3 border-[#B4F000]/20 animate-in zoom-in-95 duration-200">
                    <div className="text-[0.6rem] uppercase tracking-widest text-[#B4F000] font-bold">Define New Goal</div>
                    <div className="grid grid-cols-2 gap-3">
                      <input className="glass-input text-xs col-span-2" placeholder="Goal title (e.g. Hit 150g protein)" value={newGoalForm.title} onChange={e => setNewGoalForm(f => ({ ...f, title: e.target.value }))} />
                      <input className="glass-input text-xs" type="number" placeholder="Target (e.g. 150)" value={newGoalForm.target || ''} onChange={e => setNewGoalForm(f => ({ ...f, target: Number(e.target.value) }))} />
                      <input className="glass-input text-xs" placeholder="Unit (g, sessions, hrs...)" value={newGoalForm.unit} onChange={e => setNewGoalForm(f => ({ ...f, unit: e.target.value }))} />
                      <input className="glass-input text-xs" type="date" value={newGoalForm.deadline} onChange={e => setNewGoalForm(f => ({ ...f, deadline: e.target.value }))} />
                      <select className="glass-input text-xs" value={newGoalForm.module} onChange={e => setNewGoalForm(f => ({ ...f, module: e.target.value as any }))}>
                        <option value="food">Food</option>
                        <option value="workout">Workout</option>
                        <option value="sleep">Sleep</option>
                        <option value="cross">Cross-Module</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleAddGoal} className="glass-button-primary flex-1 py-2 text-xs font-bold uppercase tracking-widest">Set Goal</button>
                      <button onClick={() => setNewGoalOpen(false)} className="glass-button px-4 py-2 text-xs">Cancel</button>
                    </div>
                  </div>
                )}

                {activeGoals.map(goal => {
                  const pct = Math.min(100, (goal.current / goal.target) * 100);
                  const color = MOD_COLOR[goal.module] || '#B4F000';
                  const daysLeft = Math.max(0, Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000));
                  return (
                    <div key={goal.id} className="glass-card p-5 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[0.5rem] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded" style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>{goal.module}</span>
                            {daysLeft <= 2 && <span className="text-[0.5rem] text-[#FF595E] font-bold uppercase tracking-wider">{daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}</span>}
                          </div>
                          <div className="font-bold text-[#E6EDF3] text-sm">{goal.title}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg" style={{ color }}>{goal.current}<span className="text-[#8B949E] text-xs font-normal">/{goal.target}</span></div>
                          <div className="text-[0.55rem] text-[#8B949E]">{goal.unit}</div>
                        </div>
                      </div>
                      <div className="w-full bg-[#161B23] rounded-full h-1.5 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: pct >= 100 ? '#22c55e' : color, boxShadow: `0 0 8px ${color}60` }} />
                      </div>
                      <div className="flex justify-between text-[0.55rem] text-[#8B949E]">
                        <span>{pct.toFixed(0)}% complete</span>
                        <span>Due {goal.deadline}</span>
                      </div>
                    </div>
                  );
                })}

                {achievedGoals.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[0.55rem] uppercase tracking-widest text-[#22c55e] font-bold">Achieved</div>
                    {achievedGoals.map(goal => (
                      <div key={goal.id} className="glass-card p-4 flex justify-between items-center opacity-70 border-[#22c55e]/20">
                        <span className="text-sm text-[#E6EDF3]">✓ {goal.title}</span>
                        <span className="text-[0.55rem] text-[#22c55e] font-bold uppercase tracking-wider">Done</span>
                      </div>
                    ))}
                  </div>
                )}

                {activeGoals.length === 0 && !newGoalOpen && (
                  <div className="text-center py-12 text-[#8B949E] text-xs">
                    <div className="text-4xl mb-3">🎯</div>
                    <p>No active goals. Click "Load Demo" in Food Module to seed data,</p>
                    <p className="mt-1">or create a goal manually.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── PATTERNS TAB ── */}
            {activeTab === 'patterns' && (
              <div className="space-y-3">
                <span className="text-[0.55rem] uppercase tracking-widest text-[#8B949E]">{activePatterns.length} cross-module patterns · AI-detected</span>
                {activePatterns.map(pat => {
                  const s = SEV[pat.severity];
                  return (
                    <div key={pat.id} className="p-5 rounded-lg border space-y-3 transition-all" style={{ borderColor: `${s.border}40`, background: s.bg }}>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <span style={{ color: s.text }} className="font-bold text-base">{s.icon}</span>
                          <span className="font-bold text-[#E6EDF3] text-sm">{pat.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[0.5rem] text-[#8B949E] font-mono">{pat.confidence}% confidence</span>
                          <button
                            onClick={() => { const mem2 = readMemory(); const p = mem2.patterns.find(x => x.id === pat.id); if (p) { p.dismissed = true; writeMemory(mem2); setPatterns(mem2.patterns.filter(x => !x.dismissed)); } }}
                            className="text-[#8B949E] hover:text-[#E6EDF3] text-xs"
                          >✕</button>
                        </div>
                      </div>
                      <p className="text-[0.7rem] text-[#8B949E] leading-relaxed">{pat.description}</p>
                      <div className="flex items-center gap-2">
                        {pat.modules.map(m => (
                          <span key={m} className="text-[0.5rem] uppercase tracking-widest px-1.5 py-0.5 rounded font-bold" style={{ color: MOD_COLOR[m] || '#8B949E', background: `${MOD_COLOR[m] || '#8B949E'}15` }}>{m}</span>
                        ))}
                        {pat.actionable && <span className="ml-auto text-[0.5rem] text-[#3A86FF] uppercase tracking-wider font-bold">Actionable</span>}
                      </div>
                    </div>
                  );
                })}
                {activePatterns.length === 0 && (
                  <div className="text-center py-12 text-[#8B949E] text-xs">
                    <div className="text-4xl mb-3">🔍</div>
                    <p>Load demo data and click "Run Analysis" to detect cross-module patterns.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── REASONING TAB ── */}
            {activeTab === 'reasoning' && (
              <div className="space-y-3">
                <span className="text-[0.55rem] uppercase tracking-widest text-[#8B949E]">ION's decision trail — {recentReasoning.length} logged</span>
                {recentReasoning.map((entry: AgentReasoningEntry) => (
                  <div key={entry.id} className="glass-card p-5 space-y-3 border-[#3A86FF]/10">
                    <div className="flex justify-between items-center">
                      <span className="text-[0.55rem] text-[#3A86FF] font-bold uppercase tracking-widest">{entry.trigger}</span>
                      <span className="text-[0.5rem] text-[#8B949E] font-mono">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="space-y-1.5 text-[0.65rem]">
                      <div><span className="text-[#8B949E] uppercase tracking-wider text-[0.55rem]">Observed: </span><span className="text-[#E6EDF3]">{entry.observation}</span></div>
                      <div><span className="text-[#8B949E] uppercase tracking-wider text-[0.55rem]">Reasoned: </span><span className="text-[#8B949E]">{entry.reasoning}</span></div>
                      <div><span className="text-[#B4F000] uppercase tracking-wider text-[0.55rem] font-bold">→ </span><span className="text-[#E6EDF3]">{entry.decision}</span></div>
                      {entry.outcome && <div><span className="text-[#22c55e] uppercase tracking-wider text-[0.55rem]">Outcome: </span><span className="text-[#8B949E]">{entry.outcome}</span></div>}
                    </div>
                  </div>
                ))}
                {recentReasoning.length === 0 && (
                  <div className="text-center py-12 text-[#8B949E] text-xs">
                    <div className="text-4xl mb-3">🧮</div>
                    <p>Click "Run Analysis" to start ION's autonomous reasoning loop.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── WEARABLE TAB ── */}
            {activeTab === 'wearable' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[0.55rem] uppercase tracking-widest text-[#8B949E]">Google Fit Wearable Intelligence</span>
                  <div className="flex gap-3">
                    {localStorage.getItem('google_fit_connected') ? (
                      <button
                        onClick={handleSyncWearable}
                        disabled={wearableSyncing}
                        className="text-[0.6rem] uppercase tracking-widest text-[#3A86FF] hover:underline font-bold"
                      >
                        {wearableSyncing ? 'Syncing...' : '↻ Sync Now'}
                      </button>
                    ) : (
                      <button
                        onClick={handleConnectGoogleFit}
                        className="text-[0.6rem] uppercase tracking-widest text-[#B4F000] hover:underline font-bold"
                      >
                        ⚡ Connect Google Fit
                      </button>
                    )}
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Steps', val: wearableSummary.steps, unit: 'steps', color: '#B4F000', icon: '👣' },
                    { label: 'Heart Rate', val: wearableSummary.hr, unit: 'bpm', color: '#FF595E', icon: '❤️' },
                    { label: 'Calories', val: wearableSummary.calories, unit: 'kcal', color: '#FFB347', icon: '🔥' },
                    { label: 'Sleep', val: wearableSummary.sleep.toFixed(1), unit: 'hrs', color: '#8844FF', icon: '🌙' },
                  ].map(m => (
                    <div key={m.label} className="glass-card p-4 relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full" style={{ background: m.color }} />
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[0.5rem] uppercase tracking-widest font-bold text-[#8B949E]">{m.label}</span>
                        <span className="text-sm">{m.icon}</span>
                      </div>
                      <div className="text-xl font-bold text-[#E6EDF3]">{m.val} <span className="text-[0.6rem] text-[#8B949E] font-normal">{m.unit}</span></div>
                    </div>
                  ))}
                </div>

                {/* Recovery Score */}
                {recoveryData && (
                  <div className="glass-card p-5 relative">
                    <div className="text-[0.6rem] uppercase tracking-widest text-[#8B949E] mb-4">Metabolic Recovery Score</div>
                    <div className="flex items-center gap-6">
                      <div className="relative w-20 h-20">
                        <svg className="w-full h-full" viewBox="0 0 36 36">
                          <path className="stroke-[#161B23]" fill="none" strokeWidth="3" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                          <path
                            className="transition-all duration-1000 ease-out"
                            fill="none" strokeWidth="3" strokeDasharray={`${recoveryData.score}, 100`}
                            strokeLinecap="round" stroke={recoveryData.score > 70 ? '#22c55e' : recoveryData.score > 40 ? '#FFB347' : '#FF595E'}
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-lg font-bold text-[#E6EDF3]">{recoveryData.score}%</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#E6EDF3] mb-1">Status: <span style={{ color: recoveryData.score > 70 ? '#22c55e' : recoveryData.score > 40 ? '#FFB347' : '#FF595E' }}>{recoveryData.status}</span></div>
                        <p className="text-[0.65rem] text-[#8B949E] leading-relaxed max-w-[180px]">
                          {recoveryData.score > 70 ? 'Optimal state. High intensity training recommended today.' :
                            recoveryData.score > 40 ? 'Moderate fatigue. Focus on skill-based or light recovery work.' :
                              'High metabolic stress. Rest and hydration are critical priorities today.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Briefing */}
                <div className="glass-card p-5 border-[#3A86FF]/20">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[0.6rem] uppercase tracking-widest text-[#3A86FF] font-bold">ION Daily Health Briefing</span>
                    <button
                      onClick={generateBriefing}
                      disabled={loadingBriefing}
                      className="text-[0.55rem] uppercase tracking-widest bg-[#3A86FF]/10 text-[#3A86FF] px-2 py-1 rounded hover:bg-[#3A86FF]/20"
                    >
                      {loadingBriefing ? 'Analyzing...' : '⚡ Generate Briefing'}
                    </button>
                  </div>
                  {briefing ? (
                    <div className="text-[0.7rem] text-[#E6EDF3] leading-relaxed font-medium animate-in fade-in slide-in-from-top-1 duration-500 whitespace-pre-line">
                      {briefing}
                    </div>
                  ) : (
                    <div className="text-[0.65rem] text-[#8B949E] italic py-4 text-center">
                      Tap "Generate Briefing" for a wearable-aware daily health summary.
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
