"use client";

import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useEffect, useState } from "react";
import { fetchMetricsSummary, type MetricsSummary } from "../lib/api";

export default function OverviewPage() {
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchMetricsSummary({});
        setSummary(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load summary");
      }
    };

    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Overview
        </h2>
        <p className="text-sm text-muted-foreground">
          High-level view of your local sensor metrics pipeline.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total events (range)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {summary ? summary.total_events.toLocaleString() : "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              Total metrics currently stored in Postgres.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active sensors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">
              Later we can derive this from distinct sensor_ids in range.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ingestion lag (s)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {summary && summary.lag_seconds != null
                ? Math.round(summary.lag_seconds)
                : "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              Calculated from latest metric timestamp vs now.
            </p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <p className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

