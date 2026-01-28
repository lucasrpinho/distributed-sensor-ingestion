const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api";

export interface Metric {
  sensor_id: string;
  event_id: string;
  timestamp: string;
  value: number;
  created_at: string;
}

export interface MetricsSummary {
  total_events: number;
  from?: string | null;
  to?: string | null;
  lag_seconds?: number | null;
}

export interface ProducerConfig {
  sensorCount: number;
  eventsPerSec: number;
  runDurationSec: number;
  kafkaBrokers: string;
  kafkaTopic: string;
}

export async function fetchMetrics(params: {
  from?: string;
  to?: string;
  sensorId?: string;
  limit?: number;
  offset?: number;
}): Promise<Metric[]> {
  const url = new URL(`${API_BASE_URL}/metrics`);

  if (params.from) url.searchParams.set("from", params.from);
  if (params.to) url.searchParams.set("to", params.to);
  if (params.sensorId) url.searchParams.set("sensorId", params.sensorId);
  if (params.limit) url.searchParams.set("limit", String(params.limit));
  if (params.offset) url.searchParams.set("offset", String(params.offset));

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Failed to fetch metrics: ${res.statusText}`);
  }

  return res.json();
}

export async function fetchMetricsSummary(params: {
  from?: string;
  to?: string;
  sensorId?: string;
}): Promise<MetricsSummary> {
  const url = new URL(`${API_BASE_URL}/metrics/summary`);

  if (params.from) url.searchParams.set("from", params.from);
  if (params.to) url.searchParams.set("to", params.to);
  if (params.sensorId) url.searchParams.set("sensorId", params.sensorId);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Failed to fetch metrics summary: ${res.statusText}`);
  }

  return res.json();
}

export async function fetchProducerConfig(): Promise<ProducerConfig> {
  const res = await fetch(`${API_BASE_URL}/producer-config`);
  if (!res.ok) {
    throw new Error(`Failed to fetch producer config: ${res.statusText}`);
  }

  return res.json();
}

export async function updateProducerConfig(
  config: ProducerConfig
): Promise<ProducerConfig> {
  const res = await fetch(`${API_BASE_URL}/producer-config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config)
  });

  if (!res.ok) {
    throw new Error(`Failed to update producer config: ${res.statusText}`);
  }

  return res.json();
}

