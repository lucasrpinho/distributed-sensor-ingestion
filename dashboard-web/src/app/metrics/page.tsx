"use client";

import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { useEffect, useState } from "react";
import { fetchMetrics, type Metric } from "../../lib/api";

export default function MetricsPage() {
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [sensorId, setSensorId] = useState<string>("");
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMetrics({
        from: from || undefined,
        to: to || undefined,
        sensorId: sensorId || undefined,
        limit: 200
      });
      setMetrics(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Metrics
        </h2>
        <p className="text-sm text-muted-foreground">
          Filter and inspect raw metrics ingested into Postgres.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <input
              type="datetime-local"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <input
              type="datetime-local"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
            <input
              type="text"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="sensor_id"
              value={sensorId}
              onChange={(e) => setSensorId(e.target.value)}
            />
            <button
              type="button"
              onClick={() => void loadMetrics()}
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-60"
              disabled={loading}
            >
              Apply
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Metrics table</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">sensor_id</th>
                    <th className="px-4 py-2">timestamp</th>
                    <th className="px-4 py-2">value</th>
                    <th className="px-4 py-2">event_id</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td
                        className="px-4 py-2 text-xs text-muted-foreground"
                        colSpan={4}
                      >
                        Loading metrics...
                      </td>
                    </tr>
                  )}
                  {!loading && metrics.length === 0 && (
                    <tr>
                      <td
                        className="px-4 py-2 text-xs text-muted-foreground"
                        colSpan={4}
                      >
                        No metrics found for current filters.
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    metrics.map((m) => (
                      <tr key={m.event_id}>
                        <td className="px-4 py-2 align-top font-mono text-xs">
                          {m.sensor_id}
                        </td>
                        <td className="px-4 py-2 align-top text-xs">
                          {new Date(m.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 align-top text-xs">
                          {m.value}
                        </td>
                        <td className="px-4 py-2 align-top break-all font-mono text-xs">
                          {m.event_id}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {error && (
            <p className="mt-2 text-xs text-destructive">
              {error}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

