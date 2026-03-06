/**
 * healthStateEngine.ts
 * Interprets raw wearable signals into high-level health states for reasoning.
 */

import { readMemory, addEpisode } from '../lib/ionMemory';

export type HealthState = 'LOW_SLEEP' | 'HIGH_HEART_RATE' | 'HIGH_ACTIVITY' | 'LOW_RECOVERY' | 'NORMAL_RECOVERY' | 'OPTIMAL';

export async function runHealthAnalysis() {
  const mem = readMemory();
  const recentEpisodes = mem.episodes.slice(0, 50);

  // Find latest wearable signals
  const latestSleep = recentEpisodes.find(e => e.type === 'WEARABLE_SLEEP')?.data?.value;
  const latestHR = recentEpisodes.find(e => e.type === 'WEARABLE_HEART_RATE')?.data?.value;
  const latestSteps = recentEpisodes.find(e => e.type === 'WEARABLE_STEPS')?.data?.value;

  const states: HealthState[] = [];

  // Logic thresholding
  if (latestSleep && latestSleep < 6) {
    states.push('LOW_SLEEP');
  }

  // Baseline assumed at 70 bpm for simplicity, real app would calculate moving average
  if (latestHR && latestHR > 80) {
    states.push('HIGH_HEART_RATE');
  }

  if (latestSteps && latestSteps > 12000) {
    states.push('HIGH_ACTIVITY');
  }

  if (states.length === 0) {
    states.push('NORMAL_RECOVERY');
  }

  // Store detected states
  for (const state of states) {
    addEpisode({
      type: 'HEALTH_STATE',
      module: 'wearable',
      title: `State Detected: ${state}`,
      detail: `Categorized from latest biometric updates.`,
      data: { state }
    });
  }

  return states;
}
