## Local Runtime Stack (Docker Compose)

This directory will contain the Docker Compose definition for:
- Kafka broker (and any required dependencies)
- Kafka UI for inspecting topics, partitions, and consumer groups
- Postgres database for metrics and idempotency state

The Compose stack is the single entrypoint for running the full system locally.

