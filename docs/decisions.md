## Components

### 1. Sensor Producer (Go)
- Simulates thousands of sensors
- Each sensor emits ordered events
- High-throughput, non-blocking design
- Emits events with:
  - sensor_id
  - event_id (unique)
  - timestamp
  - payload (metric value)

### 2. Message Broker (Kafka)
- Acts as the ingestion buffer
- Provides durability and ordering guarantees
- Topic partitioning based on sensor_id

### 3. Consumer Service (NestJS)
- Consumes events from Kafka
- Processes events idempotently
- Stores processed metrics in a partitioned data store
- Exposes read-only HTTP endpoints for querying metrics and summary statistics

### 4. Dashboard UI (Next.js)
- Next.js + React + TypeScript single-page dashboard
- Read-only view of system behaviour (no direct writes to Kafka or Postgres)
- Provides time and sensor-based filtering over metrics
- Offers a simple form to view and update producer configuration values stored on the backend

### 5. Infrastructure (Terraform)
- Defines Kafka, services, and networking
- Cloud provider configuration (AWS or Azure)
- Used for learning and signaling IaC proficiency

---

## Ordering Model

- **Ordering is guaranteed per sensor**
- Kafka partitions are keyed by `sensor_id`
- Each sensor’s events always go to the same partition

---

## Backpressure Strategy

- Producers rely on Kafka acknowledgements
- If Kafka slows down, producers naturally throttle
- Consumers process messages in batches
- Offset commits happen only after successful processing

---

## Idempotency Strategy

- Every event has a globally unique `event_id`
- Consumer checks if `event_id` was already processed
- Duplicate events are safely ignored
- This protects against retries and consumer restarts

---

# Key Decisions

## Messaging System: Kafka

**Why Kafka?**
- Native partitioning and ordering
- Strong fit for high-throughput ingestion
- Industry-standard for event-driven systems

RabbitMQ was rejected because ordering and replay semantics are more complex for this use case.

---

## Consumer Stack: NestJS

**Why NestJS?**
- Familiar structure for backend engineers
- Strong typing with TypeScript
- Clear demonstration of enterprise backend patterns

.NET would also be valid, but NestJS offers faster iteration for this project.

---

## Storage

- **Postgres** as the primary store (Dockerised)
- Partitioned / indexed by `sensor_id` and time window
- Chosen for clarity, simple SQL querying, and unique constraints for idempotency

---

## Local Tooling & Runtime

- Docker Desktop (engine + compose) is required
- Go (latest stable) and Node.js LTS are required for services
- Terraform CLI is installed for IaC examples
- A Kafka UI container **is included by default** to inspect topics, partitions, and consumer groups

---

## Message Contract

- Topic: `sensor_metrics`
- Kafka key: `sensor_id`
- Payload fields:
  - `sensor_id` (string)
  - `event_id` (string, globally unique)
  - `timestamp` (ISO 8601 or epoch)
  - `value` (numeric metric)
- Delivery semantics: **at-least-once** with **idempotent consumer**

---

## Kafka Topic & Partitioning

- Single topic: `sensor_metrics`
- Partition count: **12** partitions
- Partitioning strategy: key by `sensor_id`
- Guarantee: **per-sensor ordering** within a partition, with parallelism across sensors

---

## Load Profile (MVP)

- Number of simulated sensors: 1,000–5,000 (configurable)
- Target throughput: 5k–20k events/second (best-effort, not a benchmark)
- Run duration: typically 1–5 minutes per demo scenario
- Goal: generate enough load to observe backpressure and consumer lag in Kafka UI

---

## Demo Scenarios

1. Normal load:
   - Producer and consumer both healthy
   - Show per-sensor ordering and successful ingestion into Postgres
2. Consumer slowdown:
   - Artificial DB latency or reduced consumer concurrency
   - Kafka backlog grows; lag visible in Kafka UI
   - Consumer recovers and drains backlog without data loss
3. Duplicate delivery:
   - Producer intentionally re-sends some `event_id`s
   - Idempotency guard prevents duplicate metric rows
   - `processed_events` table shows each `event_id` at most once

---
