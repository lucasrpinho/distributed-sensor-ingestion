## NestJS Kafka Consumer

This service consumes events from the Kafka topic `sensor_metrics` and writes them into Postgres.

### Responsibilities

- Join a Kafka consumer group and read from all partitions.
- Process messages in batches with explicit offset commits after successful processing.
- Enforce idempotency using a `processed_events` table keyed by `event_id`.
- Persist metrics into a `metrics` table, preserving per-sensor ordering.

### Installation

```bash
cd consumer-nestjs
npm install
```

### Configuration

Create a `.env` file or use environment variables:

```env
# Kafka Configuration
KAFKA_BROKERS=localhost:9092
KAFKA_TOPIC=sensor_metrics
KAFKA_GROUP_ID=sensor-metrics-consumer
KAFKA_SESSION_TIMEOUT=30000
KAFKA_HEARTBEAT_INTERVAL=3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=metrics
DB_PASSWORD=metrics
DB_NAME=metrics

# Consumer Configuration
CONSUMER_BATCH_SIZE=100
CONSUMER_COMMIT_INTERVAL=5000
KAFKA_FROM_BEGINNING=false  # Set to 'true' to process all existing messages from the beginning

# Performance Tuning (Optional - for faster consumption)
KAFKA_MAX_BYTES_PER_PARTITION=2097152  # 2MB per partition (larger batches)
KAFKA_MIN_BYTES=1024  # Wait for at least 1KB before fetching
KAFKA_MAX_BYTES=20971520  # 20MB total batch size
KAFKA_MAX_WAIT_TIME_MS=100  # Lower wait time for faster batching

# Application
PORT=3000
```

### Running

**Development:**
```bash
npm run start:dev
```

**Production:**
```bash
npm run build
npm run start:prod
```

### Architecture

- **KafkaConsumerService**: Main consumer that processes batches from Kafka
- **IdempotencyService**: Checks `processed_events` table to prevent duplicate processing
- **MetricsService**: Writes metrics to Postgres `metrics` table
- **DatabaseModule**: Provides Postgres connection pool

### Features

- **Batch Processing**: Processes messages in batches for better throughput
- **Manual Offset Commits**: Offsets are committed only after successful processing
- **Idempotency**: Duplicate events are safely ignored using `processed_events` table
- **Error Handling**: Failed batches are not committed and will be retried
- **Backpressure**: Natural backpressure through Kafka consumer group mechanism
- **Transaction Safety**: Database operations use transactions for atomicity

### Processing Existing Messages

By default, the consumer starts from the latest offset (only processes new messages). To process all existing messages in the topic, set:

```env
KAFKA_FROM_BEGINNING=true
```

**Note**: This will process all messages from the beginning of the topic. If you have 200k+ messages, this may take some time. The consumer will process them in batches.

### Architecture Overview

```
Kafka Topic (sensor_metrics)
    ↓
KafkaConsumerService (batch processing)
    ↓
IdempotencyService (check processed_events)
    ↓
MetricsService (insert into metrics table)
    ↓
Postgres Database
```

### Security Considerations

- All database queries use parameterized statements (SQL injection protection)
- Input validation on all Kafka messages
- Connection pooling with limits to prevent resource exhaustion
- No hardcoded credentials (all via environment variables)
- Proper error handling and logging

See `docs/decisions.md` for the idempotency and backpressure strategies.
