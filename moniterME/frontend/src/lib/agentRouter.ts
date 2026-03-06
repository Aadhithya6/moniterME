// agentRouter.ts — ION's LangGraph-style state machine (browser-native)
// Now with persistent memory, multi-turn context, and episodic logging

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  addConversationTurn, getRecentConversation,
  addEpisode, addReasoningEntry,
} from './ionMemory';

export interface AgentState {
  apiKey: string;
  context: any;
  toolsConfig: any;
  onStep: (step: string) => void;
  onActiveNode: (node: string) => void;
  onCompleteNode?: (node: string) => void;
  intent: string;
  toolResult: any;
  finalReply: string;
  verdictCard: any;
}

// ─── Node: classify ───────────────────────────────────────────────────────────
async function classifyNode(state: AgentState): Promise<Partial<AgentState>> {
  state.onActiveNode("classify");
  state.onStep("> Classifying intent...");

  const llm = new ChatGoogleGenerativeAI({ model: "gemini-2.5-flash-lite", apiKey: state.apiKey, maxRetries: 0 });

  const recentContext = getRecentConversation(4)
    .map(t => `${t.role === 'ion' ? 'ION' : 'User'}: ${t.text}`)
    .join('\n');

  const prompt = `Analyze the user's message and classify intent into ONE of:
LOG_FOOD | LOG_WATER | GET_SUGGESTION | PRE_EAT_CHECK | GET_REPORT | SYNC_WEARABLE_DATA | GET_RECOVERY_STATUS | GET_HEALTH_INSIGHT | GENERAL_ADVICE

Recent conversation context:
${recentContext || 'None'}

User Message: "${state.context.userMsg}"
Return ONLY JSON: { "intent": "CLASSIFICATION_STRING" }`;

  let intent = "GENERAL_ADVICE";
  try {
    const res = await llm.invoke(prompt);
    const parsed = JSON.parse(res.content.toString().replace(/```json|```/g, "").trim());
    if (parsed.intent) intent = parsed.intent;
  } catch { }

  state.onStep(`> Routing to: ${intent} ✓`);
  await new Promise(r => setTimeout(r, 400));
  return { intent };
}

// ─── Node: execute ────────────────────────────────────────────────────────────
async function executeNode(state: AgentState): Promise<Partial<AgentState>> {
  state.onActiveNode("execute");
  state.onStep("> Executing tool...");
  await new Promise(r => setTimeout(r, 400));

  let toolResult = null;
  const { intent, context, toolsConfig } = state;

  try {
    if (intent === "LOG_FOOD") {
      const llm = new ChatGoogleGenerativeAI({ model: "gemini-2.5-flash-lite", apiKey: state.apiKey, maxRetries: 0 });
      const prompt = `Extract food details from: "${context.userMsg}". Return ONLY JSON: {"name":string,"calories":number,"protein":number,"carbs":number,"fat":number,"emoji":string}`;
      const res = await llm.invoke(prompt);
      const parsed = JSON.parse(res.content.toString().replace(/```json|```/g, "").trim());
      toolResult = await toolsConfig.analyzeAndLogFood(parsed);

      // Log to episodic memory
      addEpisode({
        type: 'food_log',
        module: 'food',
        title: `Logged: ${parsed.name || 'food item'}`,
        detail: `${parsed.calories || 0} kcal · ${parsed.protein || 0}g protein`,
        data: parsed,
      });
    } else if (intent === "LOG_WATER") {
      toolResult = await toolsConfig.addWaterEntry(250);
      addEpisode({ type: 'food_log', module: 'food', title: 'Logged 250ml water', detail: 'Hydration entry' });
    } else if (intent === "GET_SUGGESTION") {
      toolResult = await toolsConfig.getNextMealSuggestion();
    } else if (intent === "PRE_EAT_CHECK") {
      toolResult = await toolsConfig.beforeYouEatCheck(context.userMsg);
    } else if (intent === "GET_REPORT") {
      toolResult = await toolsConfig.getTodaySummary();
    } else if (intent === "SYNC_WEARABLE_DATA") {
      toolResult = await toolsConfig.syncWearableData();
    } else if (intent === "GET_RECOVERY_STATUS") {
      toolResult = await toolsConfig.getRecoveryStatus();
    } else if (intent === "GET_HEALTH_INSIGHT") {
      toolResult = await toolsConfig.getHealthInsight();
    }
  } catch {
    toolResult = "Tool execution failed.";
  }

  return { toolResult };
}

// ─── Node: generate ───────────────────────────────────────────────────────────
async function generateNode(state: AgentState): Promise<Partial<AgentState>> {
  state.onActiveNode("generate");
  state.onStep("> Generating response...");
  await new Promise(r => setTimeout(r, 400));

  if (state.intent === "PRE_EAT_CHECK") {
    const verdictCard = state.toolsConfig.getLastVerdictCard?.();
    if (verdictCard) return { finalReply: "I analyzed your potential meal:", verdictCard };
  }

  const llm = new ChatGoogleGenerativeAI({ model: "gemini-2.5-flash-lite", apiKey: state.apiKey, maxRetries: 0 });
  const p = state.context.profile || {};
  const todayCtx = `${state.context.totalCalories} kcal of ${state.context.dailyGoal} goal. Water: ${state.context.waterConsumed}ml.`;

  // Pull recent conversation for multi-turn awareness
  const recentHistory = getRecentConversation(6)
    .map(t => `${t.role === 'ion' ? 'ION' : p.name || 'User'}: ${t.text}`)
    .join('\n');

  const prompt = `You are ION, a sharp autonomous personal health agent with persistent memory.
User: ${p.name || 'User'}, Goal: ${p.goal || 'Maintain'}, TDEE: ${p.tdee || 2500} kcal
Today: ${todayCtx}

Recent conversation:
${recentHistory || 'No prior context this session'}

Tool result: ${state.toolResult || 'None'}
User said: "${state.context.userMsg}"

Respond directly and concisely. Reference user's name and specific numbers. Tell them exactly what to do next. 2-3 sentences max. Return raw text.`;

  try {
    const res = await llm.invoke(prompt);
    return { finalReply: res.content.toString() };
  } catch {
    return { finalReply: "Communication error. Please try again." };
  }
}

// ─── Node: reflect ────────────────────────────────────────────────────────────
async function reflectNode(state: AgentState): Promise<Partial<AgentState>> {
  state.onActiveNode("reflect");
  state.onStep("> Reflecting...");
  await new Promise(r => setTimeout(r, 300));

  let nudge = "";
  const { intent, context } = state;

  if (intent === "LOG_FOOD") {
    const waterPct = context.waterConsumed / (context.waterGoal || 2500);
    if (waterPct < 0.4) nudge = "\n\n💧 Hydration alert: below 40% of daily goal. Drink water now.";
  } else if (intent === "GET_SUGGESTION") {
    if (new Date().getHours() >= 20) nudge = "\n\n🌙 Late evening — keep it light and sleep-friendly.";
  }

  // Log to agent reasoning
  addReasoningEntry({
    trigger: `User: "${context.userMsg.slice(0, 60)}"`,
    observation: `Intent: ${state.intent} · Calories: ${context.totalCalories}/${context.dailyGoal}`,
    reasoning: `Responded to ${state.intent} with tool result and context awareness`,
    decision: (state.finalReply + nudge).slice(0, 200),
  });

  // Write to conversation memory
  addConversationTurn({ role: 'user', text: context.userMsg });
  addConversationTurn({ role: 'ion', text: (state.finalReply + nudge).slice(0, 300) });

  return { finalReply: state.finalReply + nudge };
}

// ─── Main graph runner ────────────────────────────────────────────────────────
export async function routeAgentTask(config: {
  apiKey: string;
  context: any;
  toolsConfig: any;
  onStep: (step: string) => void;
  onActiveNode: (node: string) => void;
  onCompleteNode?: (node: string) => void;
}) {
  let state: AgentState = {
    apiKey: config.apiKey,
    context: config.context,
    toolsConfig: config.toolsConfig,
    onStep: config.onStep,
    onActiveNode: config.onActiveNode || (() => { }),
    onCompleteNode: config.onCompleteNode,
    intent: "",
    toolResult: null,
    finalReply: "",
    verdictCard: null,
  };

  const merge = (p: Partial<AgentState>) => { state = { ...state, ...p }; };

  merge(await classifyNode(state));
  if (state.onCompleteNode) state.onCompleteNode("classify");

  if (state.intent !== "GENERAL_ADVICE") {
    merge(await executeNode(state));
    if (state.onCompleteNode) state.onCompleteNode("execute");
  }

  merge(await generateNode(state));
  if (state.onCompleteNode) state.onCompleteNode("generate");

  merge(await reflectNode(state));
  if (state.onCompleteNode) state.onCompleteNode("reflect");

  return { text: state.finalReply, verdictCard: state.verdictCard };
}
