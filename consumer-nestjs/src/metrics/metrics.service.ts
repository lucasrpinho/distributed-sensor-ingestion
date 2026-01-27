import { Injectable, Inject, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { SensorEventDto } from '../dto/sensor-event.dto';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(@Inject('DATABASE_POOL') private readonly pool: Pool) {}

  /**
   * Inserts a single metric into the database.
   * Uses ON CONFLICT to handle duplicates (defense in depth).
   */
  async insertMetric(event: SensorEventDto): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO metrics (sensor_id, event_id, timestamp, value)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (event_id) DO NOTHING`,
        [event.sensor_id, event.event_id, event.timestamp, event.value],
      );
    } catch (error) {
      this.logger.error(
        `Failed to insert metric for event ${event.event_id}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Batch insert metrics using bulk INSERT for better performance.
   * Uses a transaction to ensure atomicity.
   */
  async batchInsertMetrics(events: SensorEventDto[]): Promise<void> {
    if (events.length === 0) {
      return;
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const values: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      for (const event of events) {
        values.push(
          `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3})`,
        );
        params.push(
          event.sensor_id,
          event.event_id,
          event.timestamp,
          event.value,
        );
        paramIndex += 4;
      }

      const insertQuery = `
        INSERT INTO metrics (sensor_id, event_id, timestamp, value)
        VALUES ${values.join(', ')}
        ON CONFLICT (event_id) DO NOTHING
      `;

      await client.query(insertQuery, params);
      await client.query('COMMIT');
      this.logger.debug(`Successfully inserted ${events.length} metrics`);
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error(
        `Batch insert failed for ${events.length} metrics: ${error.message}`,
      );
      throw error;
    } finally {
      client.release();
    }
  }
}
