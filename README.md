## Distributed Sensor Ingestion System (Local-Only)

This repository is a **distributed systems demo** that simulates a global fleet of sensors sending high-throughput metrics into a local Kafka cluster, processed by a NestJS consumer and stored in Postgres.

The goal is to demonstrate:
- **Event-driven architecture** with Kafka
- **Partitioning and per-sensor ordering**
- **Backpressure handling** in producer and consumer
- **Idempotent processing** with a `processed_events` store
- **Infrastructure as Code** via Terraform (local-focused)

### Repository Layout

- `docs/` – vision, architecture, constraints, and decisions (source of truth)
- `producer-go/` – Go-based sensor simulator and Kafka producer
- `consumer-nestjs/` – NestJS Kafka consumer and metric processor
- `infra/`
  - `compose/` – Docker Compose stack for Kafka, Kafka UI, and Postgres
  - `terraform/` – Terraform modules for local-focused IaC examples
- `scripts/` – helper scripts (load profiles, reset data, etc.)

### Runbook (High-Level, WIP)

1. Start the local stack (Kafka, UI, Postgres) via Docker Compose.
2. Run the Go producer to start emitting per-sensor events into Kafka.
3. Run the NestJS consumer to process events into Postgres.
4. Use Kafka UI and SQL queries to:
   - Inspect partitions and consumer lag.
   - Verify per-sensor ordering.
   - Confirm idempotent handling of duplicate `event_id`s.

Refer to `docs/` for detailed architectural decisions and demo scenarios.

