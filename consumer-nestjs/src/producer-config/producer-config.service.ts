import { Inject, Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';

export interface ProducerConfig {
  sensorCount: number;
  eventsPerSec: number;
  runDurationSec: number;
  kafkaBrokers: string;
  kafkaTopic: string;
}

@Injectable()
export class ProducerConfigService {
  private readonly logger = new Logger(ProducerConfigService.name);

  constructor(@Inject('DATABASE_POOL') private readonly pool: Pool) {}

  private async ensureTable() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS producer_config (
        id INTEGER PRIMARY KEY DEFAULT 1,
        sensor_count INTEGER NOT NULL,
        events_per_sec INTEGER NOT NULL,
        run_duration_sec INTEGER NOT NULL,
        kafka_brokers TEXT NOT NULL,
        kafka_topic TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  }

  private getDefaults(): ProducerConfig {
    return {
      sensorCount: 1000,
      eventsPerSec: 5000,
      runDurationSec: 0,
      kafkaBrokers: 'localhost:9092',
      kafkaTopic: 'sensor_metrics',
    };
  }

  async getConfig(): Promise<ProducerConfig> {
    await this.ensureTable();

    const result = await this.pool.query(
      'SELECT sensor_count, events_per_sec, run_duration_sec, kafka_brokers, kafka_topic FROM producer_config WHERE id = 1',
    );

    if (result.rows.length === 0) {
      return this.getDefaults();
    }

    const row = result.rows[0];
    return {
      sensorCount: row.sensor_count,
      eventsPerSec: row.events_per_sec,
      runDurationSec: row.run_duration_sec,
      kafkaBrokers: row.kafka_brokers,
      kafkaTopic: row.kafka_topic,
    };
  }

  async updateConfig(config: ProducerConfig): Promise<ProducerConfig> {
    await this.ensureTable();

    const defaults = this.getDefaults();

    const merged: ProducerConfig = {
      sensorCount: config.sensorCount ?? defaults.sensorCount,
      eventsPerSec: config.eventsPerSec ?? defaults.eventsPerSec,
      runDurationSec: config.runDurationSec ?? defaults.runDurationSec,
      kafkaBrokers: config.kafkaBrokers || defaults.kafkaBrokers,
      kafkaTopic: config.kafkaTopic || defaults.kafkaTopic,
    };

    await this.pool.query(
      `
      INSERT INTO producer_config (id, sensor_count, events_per_sec, run_duration_sec, kafka_brokers, kafka_topic)
      VALUES (1, $1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET
        sensor_count = EXCLUDED.sensor_count,
        events_per_sec = EXCLUDED.events_per_sec,
        run_duration_sec = EXCLUDED.run_duration_sec,
        kafka_brokers = EXCLUDED.kafka_brokers,
        kafka_topic = EXCLUDED.kafka_topic,
        updated_at = NOW()
    `,
      [
        merged.sensorCount,
        merged.eventsPerSec,
        merged.runDurationSec,
        merged.kafkaBrokers,
        merged.kafkaTopic,
      ],
    );

    this.logger.log('Updated producer configuration');

    return merged;
  }
}

