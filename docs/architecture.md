# Architecture

## High-Level Overview

The system simulates a global fleet of sensors producing metrics at high volume. Events flow through a message broker to consumers that process and store them safely, and a lightweight dashboard visualises the ingested data and producer configuration.

**Flow:**

Sensors (simulated) → Message Broker → Consumers → Storage → Dashboard (read-only)

---
