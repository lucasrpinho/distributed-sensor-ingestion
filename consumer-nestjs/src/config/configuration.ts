export default () => ({
  kafka: {
    brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
    topic: process.env.KAFKA_TOPIC || 'sensor_metrics',
    groupId: process.env.KAFKA_GROUP_ID || 'sensor-metrics-consumer',
    sessionTimeout: parseInt(process.env.KAFKA_SESSION_TIMEOUT || '30000', 10),
    heartbeatInterval: parseInt(
      process.env.KAFKA_HEARTBEAT_INTERVAL || '3000',
      10,
    ),
    maxBytesPerPartition: parseInt(
      process.env.KAFKA_MAX_BYTES_PER_PARTITION || '2097152',
      10,
    ),
    minBytes: parseInt(process.env.KAFKA_MIN_BYTES || '1024', 10),
    maxBytes: parseInt(process.env.KAFKA_MAX_BYTES || '20971520', 10),
    maxWaitTimeInMs: parseInt(
      process.env.KAFKA_MAX_WAIT_TIME_MS || '100',
      10,
    ),
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'metrics',
    password: process.env.DB_PASSWORD || 'metrics',
    database: process.env.DB_NAME || 'metrics',
  },
  consumer: {
    batchSize: parseInt(process.env.CONSUMER_BATCH_SIZE || '50', 10),
    commitInterval: parseInt(process.env.CONSUMER_COMMIT_INTERVAL || '2500', 10),
  },
});
