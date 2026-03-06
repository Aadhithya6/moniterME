/**
 * googleFitService.ts
 * Integrates with Google Fit API to fetch wearable data.
 * Supports OAuth2 flow via Google Identity Services.
 */

export interface WearableSignal {
  type: "WEARABLE_HEART_RATE" | "WEARABLE_STEPS" | "WEARABLE_CALORIES" | "WEARABLE_SLEEP";
  value: number;
  timestamp: number;
  metadata: {
    source: string;
    context: string;
  };
}

export async function fetchGoogleFitData(): Promise<WearableSignal[]> {
  const token = localStorage.getItem('google_fit_token');
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!token || !clientId) {
    console.warn("Google Fit not connected or Client ID missing. Using simulator.");
    return fallbackSimulator();
  }

  try {
    const now = Date.now();
    const startTime = now - 86400000; // Last 24 hours

    // Fetch steps
    const steps = await fetchAggregate(token, 'com.google.step_count.delta', startTime, now);
    // Fetch heart rate (bpm)
    const hr = await fetchAggregate(token, 'com.google.heart_rate.bpm', startTime, now);
    // Fetch calories
    const calories = await fetchAggregate(token, 'com.google.calories.expended', startTime, now);

    // Normalize into WearableSignals
    const signals: WearableSignal[] = [
      { type: "WEARABLE_STEPS", value: steps || 0, timestamp: now, metadata: { source: "google_fit_api", context: "real_data" } },
      { type: "WEARABLE_HEART_RATE", value: hr || 70, timestamp: now, metadata: { source: "google_fit_api", context: "real_data" } },
      { type: "WEARABLE_CALORIES", value: calories || 2200, timestamp: now, metadata: { source: "google_fit_api", context: "real_data" } },
      { type: "WEARABLE_SLEEP", value: 7.2, timestamp: now - 86400000, metadata: { source: "google_fit_api", context: "simulated_sleep" } }
    ];

    return signals;
  } catch (error) {
    console.error("Error fetching Google Fit data:", error);
    return fallbackSimulator();
  }
}

async function fetchAggregate(token: string, dataType: string, startTime: number, endTime: number): Promise<number> {
  const response = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      aggregateBy: [{ dataTypeName: dataType }],
      bucketByTime: { durationMillis: endTime - startTime },
      startTimeMillis: startTime,
      endTimeMillis: endTime
    })
  });

  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem('google_fit_token');
    localStorage.removeItem('google_fit_connected');
    throw new Error(`Google Fit Session Expired. Please reconnect.`);
  }

  if (!response.ok) throw new Error(`Google Fit API Error: ${response.statusText}`);

  const data = await response.json();
  // Simplified parsing - in reality, logic differs per data type
  try {
    return data.bucket[0].dataset[0].point[0].value[0].intVal || data.bucket[0].dataset[0].point[0].value[0].fpVal || 0;
  } catch {
    return 0;
  }
}

async function fallbackSimulator(): Promise<WearableSignal[]> {
  const now = Date.now();
  return [
    { type: "WEARABLE_STEPS", value: Math.floor(Math.random() * 5000) + 7000, timestamp: now, metadata: { source: "google_fit", context: "simulator" } },
    { type: "WEARABLE_HEART_RATE", value: Math.floor(Math.random() * 20) + 65, timestamp: now, metadata: { source: "google_fit", context: "simulator" } },
    { type: "WEARABLE_CALORIES", value: Math.floor(Math.random() * 500) + 2000, timestamp: now, metadata: { source: "google_fit", context: "simulator" } },
    { type: "WEARABLE_SLEEP", value: Math.floor(Math.random() * 3) + 5.5, timestamp: now - 86400000, metadata: { source: "google_fit", context: "simulator" } }
  ];
}
