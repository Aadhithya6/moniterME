/**
 * recoveryEngine.ts
 * Calculates a consolidated recovery score based on multiple metabolic signals.
 */

import { readMemory, addEpisode } from '../lib/ionMemory';

export async function calculateRecoveryScore() {
  const mem = readMemory();
  const recentEpisodes = mem.episodes.slice(0, 30);

  const latestSleep = recentEpisodes.find(e => e.type === 'WEARABLE_SLEEP')?.data?.value || 7;
  const latestHR = recentEpisodes.find(e => e.type === 'WEARABLE_HEART_RATE')?.data?.value || 70;
  const latestSteps = recentEpisodes.find(e => e.type === 'WEARABLE_STEPS')?.data?.value || 5000;

  let score = 100;
// Deduction logic
  
  if (latestSleep < 6) score -= 25;
  else if (latestSleep < 7) score -= 10;

  if (latestHR > 85) score -= 20;
  else if (latestHR > 75) score -= 10;

  if (latestSteps > 15000) score -= 15;
  else if (latestSteps > 10000) score -= 5;

  // Bound score
  score = Math.max(0, Math.min(100, score));

  let status: 'LOW' | 'MODERATE' | 'HIGH' = 'HIGH';
  if (score < 50) status = 'LOW';
  else if (score < 80) status = 'MODERATE';

  const result = { recoveryScore: score, status };

  addEpisode({
    type: 'RECOVERY_SCORE',
    module: 'wearable',
    title: `Recovery: ${score}% (${status})`,
    detail: `Calculated from biometrics: Sleep ${latestSleep}h, HR ${latestHR}bpm, Steps ${latestSteps}`,
    data: result
  });

  return result;
}
