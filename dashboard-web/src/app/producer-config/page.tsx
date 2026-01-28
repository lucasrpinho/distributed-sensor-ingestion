"use client";

import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { useEffect, useState } from "react";
import {
  fetchProducerConfig,
  type ProducerConfig,
  updateProducerConfig
} from "../../lib/api";

export default function ProducerConfigPage() {
  const [config, setConfig] = useState<ProducerConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchProducerConfig();
        setConfig(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load producer configuration");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const handleChange =
    (field: keyof ProducerConfig) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!config) return;
      const value =
        field === "sensorCount" ||
        field === "eventsPerSec" ||
        field === "runDurationSec"
          ? Number(e.target.value)
          : e.target.value;
      setConfig({ ...config, [field]: value });
    };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await updateProducerConfig(config);
      setConfig(updated);
      setMessage("Configuration saved. Apply it by restarting the producer with these values.");
    } catch (err) {
      console.error(err);
      setError("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!config) return;
    setConfig({
      sensorCount: 1000,
      eventsPerSec: 5000,
      runDurationSec: 0,
      kafkaBrokers: "localhost:9092",
      kafkaTopic: "sensor_metrics"
    });
    setMessage("Reset to defaults (not yet saved).");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Producer configuration
        </h2>
        <p className="text-sm text-muted-foreground">
          View and adjust configuration values for the Go producer. Changes are stored in Postgres; restarts and env wiring are still manual.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">SENSOR_COUNT</label>
              <input
                type="number"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={config?.sensorCount ?? ""}
                onChange={handleChange("sensorCount")}
                disabled={loading || saving}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">EVENTS_PER_SEC</label>
              <input
                type="number"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={config?.eventsPerSec ?? ""}
                onChange={handleChange("eventsPerSec")}
                disabled={loading || saving}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">RUN_DURATION_SEC</label>
              <input
                type="number"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={config?.runDurationSec ?? ""}
                onChange={handleChange("runDurationSec")}
                disabled={loading || saving}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">KAFKA_BROKERS</label>
              <input
                type="text"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={config?.kafkaBrokers ?? ""}
                onChange={handleChange("kafkaBrokers")}
                disabled={loading || saving}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">KAFKA_TOPIC</label>
              <input
                type="text"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={config?.kafkaTopic ?? ""}
                onChange={handleChange("kafkaTopic")}
                disabled={loading || saving}
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => void handleSave()}
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-60"
              disabled={loading || saving || !config}
            >
              Save configuration
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground shadow-sm hover:bg-accent disabled:opacity-60"
              disabled={loading || saving}
            >
              Reset to defaults
            </button>
          </div>

          {loading && (
            <p className="mt-2 text-xs text-muted-foreground">
              Loading configuration...
            </p>
          )}
          {error && (
            <p className="mt-2 text-xs text-destructive">
              {error}
            </p>
          )}
          {message && !error && (
            <p className="mt-2 text-xs text-muted-foreground">
              {message}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

