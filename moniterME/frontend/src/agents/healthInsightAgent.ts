/**
 * healthInsightAgent.ts
 * Generates proactive, data-driven health insights using biometrics and lifestyle data.
 */

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { readMemory, addEpisode } from '../lib/ionMemory';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

export async function generateProactiveInsight() {
  const mem = readMemory();
  const profile = JSON.parse(localStorage.getItem('ion_user_profile') || '{}');

  // Prepare payload for AI
  const recentEpisodes = mem.episodes.slice(0, 40).map(e => ({
    type: e.type,
    title: e.title,
    detail: e.detail,
    date: e.date
  }));

  const payload = {
    profile,
    recentEvents: recentEpisodes,
    activeGoals: mem.goals.filter(g => g.status === 'active'),
    detectedPatterns: mem.patterns.filter(p => !p.dismissed)
  };

  const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash-lite",
    apiKey: API_KEY,
    maxRetries: 0
  });

  const prompt = `You are ION, a proactive personal health agent. 
Analyze these wearable signals and health data:
${JSON.stringify(payload, null, 2)}

Provide ONE highly specific, direct health insight. 
Rules:
1. If Recovery Score is LOW, focus on rest. 
2. If Heart Rate is HIGH and Sleep is LOW, warn about overtraining.
3. If Steps are HIGH, suggest carb/protein fueling.
4. If Sleep is LOW, warn about hunger hormones.

Response should be 2-3 sentences max. Be sharp and actionable. Return raw text only.`;

  try {
    const res = await llm.invoke(prompt);
    const insight = res.content.toString();

    // Store as agent intervention
    addEpisode({
      type: 'agent_intervention',
      module: 'agent',
      title: 'Wearable Intelligence Insight',
      detail: insight,
      data: { source: 'HealthInsightAgent' }
    });

    return insight;
  } catch (error) {
    console.error("Agent failed to generate insight:", error);
    return "ION is currently syncing your biometrics. Check back in a moment.";
  }
}
