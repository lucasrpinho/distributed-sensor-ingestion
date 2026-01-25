-- Database schema for sensor metrics ingestion system
-- This file is automatically executed by Postgres on first container start

-- Table: processed_events
-- Purpose: Idempotency guard. Records every event_id that has been processed.
-- Primary key on event_id ensures no duplicates can exist.

CREATE TABLE IF NOT EXISTS processed_events (
    event_id VARCHAR(255) PRIMARY KEY,
    sensor_id VARCHAR(255) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    kafka_partition INTEGER,
    kafka_offset BIGINT
);

CREATE INDEX IF NOT EXISTS idx_processed_events_sensor_id ON processed_events(sensor_id);
CREATE INDEX IF NOT EXISTS idx_processed_events_processed_at ON processed_events(processed_at);

-- Table: metrics
-- Purpose: Final metric storage. Contains actual sensor readings.
-- Unique constraint on event_id provides defense-in-depth against duplicates.

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
