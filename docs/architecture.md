# Architecture

## High-Level Overview

The system simulates a global fleet of sensors producing metrics at high volume. Events flow through a message broker to consumers that process and store them safely.

**Flow:**

Sensors (simulated) → Message Broker → Consumers → Storage

---
