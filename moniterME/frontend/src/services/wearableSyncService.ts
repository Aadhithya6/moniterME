/**
 * wearableSyncService.ts
 * Orchestrates the synchronization of wearable data into ION's memory.
 */

import { fetchGoogleFitData } from './googleFitService';
import { addEpisode } from '../lib/ionMemory';
import { runHealthAnalysis } from './healthStateEngine';
import { calculateRecoveryScore } from './recoveryEngine';

export async function syncWearableData() {
  console.log("Starting wearable sync...");

  try {
    // 1. Fetch data
    const signals = await fetchGoogleFitData();

    // 2. Normalize and Store in Memory
    for (const signal of signals) {
      addEpisode({
        type: signal.type,
        module: 'wearable',
        title: `${signal.type.replace('WEARABLE_', '').replace('_', ' ')}: ${signal.value}`,
        detail: `Sync from ${signal.metadata.source} (${signal.metadata.context})`,
        data: signal
      });
    }

    // 3. Trigger engines
    await runHealthAnalysis();
    await calculateRecoveryScore();

    console.log("Wearable sync complete.");
    return { success: true, count: signals.length };
  } catch (error) {
    console.error("Wearable sync failed:", error);
    return { success: false, error };
  }
}
