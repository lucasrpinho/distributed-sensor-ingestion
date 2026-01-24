# Database Schema Implementation Guide

## Overview

Postgres stores two tables:
1. **`processed_events`** - Idempotency guard (prevents duplicate processing)
2. **`metrics`** - Final metric data (queryable sensor readings)

Both tables are designed for high-throughput ingestion with clear indexing and optional time-based partitioning.

---

## Table: `processed_events`

**Purpose**: Idempotency guard. Every `event_id` is recorded here before processing. Duplicate `event_id`s are safely ignored.

### Schema

```sql
CREATE TABLE processed_events (
    event_id VARCHAR(255) PRIMARY KEY,
    sensor_id VARCHAR(255) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    kafka_partition INTEGER,
    kafka_offset BIGINT
);

CREATE INDEX idx_processed_events_sensor_id ON processed_events(sensor_id);
CREATE INDEX idx_processed_events_processed_at ON processed_events(processed_at);
```

### Rationale

- **`event_id` as PRIMARY KEY**: Enforces uniqueness at the database level. Duplicate inserts will fail, which is exactly what we want for idempotency.
- **`sensor_id` index**: Enables queries like "show all events processed for sensor X" (useful for debugging/demo).
- **`processed_at` index**: Enables time-based queries (e.g., "events processed in last hour").
- **`kafka_partition` and `kafka_offset`**: Optional metadata for debugging. Shows which Kafka partition/offset delivered the event (useful for validating ordering).

### Idempotency Pattern

```sql
-- Consumer checks if event_id exists (fast lookup via primary key)
SELECT event_id FROM processed_events WHERE event_id = $1;

-- If not found, insert atomically (will fail if duplicate due to PK constraint)
INSERT INTO processed_events (event_id, sensor_id, kafka_partition, kafka_offset)
VALUES ($1, $2, $3, $4)
ON CONFLICT (event_id) DO NOTHING
RETURNING event_id;

-- If INSERT returns a row, event is new → process it
-- If INSERT returns nothing (ON CONFLICT), event is duplicate → skip
```

**Why this works**:
- Primary key constraint ensures no duplicates can exist.
- `ON CONFLICT DO NOTHING` makes the insert idempotent (safe to retry).
- Consumer can check the return value to decide whether to process the metric.

---

## Table: `metrics`

**Purpose**: Final metric storage. Contains the actual sensor readings that can be queried.

### Schema

```sql
CREATE TABLE metrics (
    id BIGSERIAL PRIMARY KEY,
    sensor_id VARCHAR(255) NOT NULL,
    event_id VARCHAR(255) NOT NULL UNIQUE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_metrics_sensor_id ON metrics(sensor_id);
CREATE INDEX idx_metrics_timestamp ON metrics(timestamp);
CREATE INDEX idx_metrics_sensor_timestamp ON metrics(sensor_id, timestamp DESC);
```

### Rationale

- **`id` (BIGSERIAL)**: Auto-incrementing primary key for row identity. Not used for business logic.
- **`event_id UNIQUE`**: Secondary uniqueness constraint. Prevents duplicate metrics even if idempotency guard is bypassed (defense in depth).
- **`sensor_id` index**: Fast lookups by sensor (e.g., "all metrics for sensor_123").
- **`timestamp` index**: Time-range queries (e.g., "metrics in last hour").
- **Composite index `(sensor_id, timestamp DESC)`**: Optimizes queries like "latest N metrics for sensor X" (common pattern for sensor dashboards).

### Insert Pattern

```sql
-- Insert metric (will fail if event_id already exists due to UNIQUE constraint)
INSERT INTO metrics (sensor_id, event_id, timestamp, value)
VALUES ($1, $2, $3, $4)
ON CONFLICT (event_id) DO NOTHING;
```

**Why `event_id` is UNIQUE here too**:
- Defense in depth. Even if `processed_events` check is bypassed, the database prevents duplicate metrics.
- Makes queries simpler (can join `metrics` to `processed_events` via `event_id` if needed).

---

## Optional: Time-Based Partitioning (Advanced)

For a portfolio demo, **partitioning is optional**. Simple indexes are sufficient for MVP.

If you want to demonstrate partitioning knowledge:

```sql
-- Partition metrics by month (example)
CREATE TABLE metrics (
    id BIGSERIAL,
    sensor_id VARCHAR(255) NOT NULL,
    event_id VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, timestamp),
    UNIQUE (event_id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Create partitions for current and next month
CREATE TABLE metrics_2024_01 PARTITION OF metrics
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE metrics_2024_02 PARTITION OF metrics
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
```

**Tradeoff**: More complex setup, but shows understanding of time-series partitioning. For MVP, skip this unless you explicitly want to demonstrate it.

---

## Initialization Strategy

### Option 1: Docker Init Script (Recommended for MVP)

Create `infra/compose/init.sql`:

```sql
-- Create tables
CREATE TABLE IF NOT EXISTS processed_events (
    event_id VARCHAR(255) PRIMARY KEY,
    sensor_id VARCHAR(255) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    kafka_partition INTEGER,
    kafka_offset BIGINT
);

CREATE INDEX IF NOT EXISTS idx_processed_events_sensor_id ON processed_events(sensor_id);
CREATE INDEX IF NOT EXISTS idx_processed_events_processed_at ON processed_events(processed_at);

CREATE TABLE IF NOT EXISTS metrics (
    id BIGSERIAL PRIMARY KEY,
    sensor_id VARCHAR(255) NOT NULL,
    event_id VARCHAR(255) NOT NULL UNIQUE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metrics_sensor_id ON metrics(sensor_id);
CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_metrics_sensor_timestamp ON metrics(sensor_id, timestamp DESC);
```

Update `docker-compose.yml`:

```yaml
postgres:
  image: postgres:16
  container_name: postgres
  environment:
    - POSTGRES_USER=metrics
    - POSTGRES_PASSWORD=metrics
    - POSTGRES_DB=metrics
  ports:
    - "5432:5432"
  volumes:
    - postgres_data:/var/lib/postgresql/data
    - ./init.sql:/docker-entrypoint-initdb.d/init.sql  # Add this line
```

**Why this works**: Postgres automatically runs `.sql` files in `/docker-entrypoint-initdb.d/` on first container start (when database is empty).

### Option 2: NestJS Migrations (If using TypeORM/Prisma)

If you use an ORM with migrations, create migration files in `consumer-nestjs/migrations/`. This is more "production-like" but adds complexity for MVP.

**Recommendation**: Use Option 1 (init.sql) for simplicity. Migrations can be added later if you want to demonstrate ORM patterns.

---

## Validation Queries (For Demo/Testing)

### Check per-sensor ordering

```sql
-- Verify events for a sensor are ordered by timestamp
SELECT sensor_id, event_id, timestamp, value
FROM metrics
WHERE sensor_id = 'sensor_123'
ORDER BY timestamp ASC;
```

**Expected**: Timestamps should be monotonically increasing (or at least non-decreasing) per sensor, because Kafka guarantees ordering within a partition.

### Check idempotency

```sql
-- Count unique event_ids in processed_events (should equal row count)
SELECT 
    COUNT(*) as total_rows,
    COUNT(DISTINCT event_id) as unique_event_ids
FROM processed_events;

-- Should show: total_rows = unique_event_ids (no duplicates)
```

```sql
-- Find any duplicate event_ids in metrics (should return 0 rows)
SELECT event_id, COUNT(*) as count
FROM metrics
GROUP BY event_id
HAVING COUNT(*) > 1;
```

### Check ingestion rate

```sql
-- Metrics ingested per minute
SELECT 
    DATE_TRUNC('minute', created_at) as minute,
    COUNT(*) as events_processed
FROM metrics
GROUP BY minute
ORDER BY minute DESC
LIMIT 10;
```

### Check consumer lag (indirect)

```sql
-- Compare latest event timestamp in DB vs current time
SELECT 
    MAX(timestamp) as latest_metric_time,
    NOW() as current_time,
    EXTRACT(EPOCH FROM (NOW() - MAX(timestamp))) as lag_seconds
FROM metrics;
```

If `lag_seconds` is large, consumer is behind (backpressure scenario).

---

## Data Types Rationale

- **`VARCHAR(255)` for IDs**: Sufficient for UUIDs or prefixed IDs like `sensor_12345`. Can be `TEXT` if you prefer, but `VARCHAR(255)` is more explicit.
- **`TIMESTAMP WITH TIME ZONE`**: Handles timezones correctly. Always use this for timestamps in Postgres.
- **`DOUBLE PRECISION`**: Standard floating-point for numeric metrics. Use `NUMERIC` if you need exact precision (e.g., financial data), but `DOUBLE PRECISION` is fine for sensor readings.
- **`BIGSERIAL`**: Auto-incrementing 64-bit integer. Sufficient for millions of rows.

---

## Connection String (For NestJS)

```
postgresql://metrics:metrics@localhost:5432/metrics
```

Or via environment variables:
- `DB_HOST=localhost`
- `DB_PORT=5432`
- `DB_USER=metrics`
- `DB_PASSWORD=metrics`
- `DB_NAME=metrics`

---

## Next Steps

1. Create `infra/compose/init.sql` with the schema above.
2. Update `docker-compose.yml` to mount `init.sql` into Postgres container.
3. Test: `docker compose up postgres` → verify tables exist via `psql` or a DB client.
4. Implement NestJS consumer to use these tables (see consumer implementation guide).
