## Go Sensor Producer

This service simulates a large number of sensors and publishes events into the Kafka topic `sensor_metrics`.

### Responsibilities

- Generate ordered events per `sensor_id`.
- Use `sensor_id` as the Kafka message key to ensure per-sensor ordering.
- Respect backpressure from Kafka (retries, bounded in-flight records).
- Generate globally unique `event_id` for each event (UUID v4).

### Building

```bash
cd producer-go
go mod download
go build -o producer-go
```

### Running

**Basic usage:**
```bash
./producer-go
```

**With custom configuration:**
```bash
./producer-go \
  -brokers localhost:9092 \
  -topic sensor_metrics \
  -sensors 2000 \
  -rate 10000 \
  -duration 300
```

**Environment variables:**
- `KAFKA_BROKERS` - Kafka broker addresses (comma-separated, default: `localhost:9092`)
- `KAFKA_TOPIC` - Kafka topic name (default: `sensor_metrics`)
- `SENSOR_COUNT` - Number of sensors to simulate (default: `1000`)
- `EVENTS_PER_SEC` - Target events per second (default: `5000`)
- `RUN_DURATION_SEC` - Run duration in seconds, 0 = infinite (default: `60`)

### Features

- **Backpressure handling**: Producer automatically throttles when Kafka is slow
- **Idempotent producer**: Prevents duplicate messages on retries
- **Per-sensor ordering**: Uses `sensor_id` as partition key
- **Graceful shutdown**: Handles SIGTERM/SIGINT signals
- **Statistics**: Logs success/error counts every 5 seconds

### Message Format

Each event is a JSON object:
```json
{
  "sensor_id": "sensor_123",
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-15T10:30:45.123456789Z",
  "value": 42.5
}
```

See `docs/decisions.md` for the complete message contract and load profile.

