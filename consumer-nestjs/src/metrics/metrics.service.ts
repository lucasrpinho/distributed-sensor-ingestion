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

  async queryMetrics(params: {
    from?: string;
    to?: string;
    sensorId?: string;
    limit: number;
    offset: number;
  }): Promise<
    Array<{
      sensor_id: string;
      event_id: string;
      timestamp: string;
      value: number;
      created_at: string;
    }>
  > {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (params.from) {
      conditions.push(`timestamp >= $${idx++}`);
      values.push(params.from);
    }

    if (params.to) {
      conditions.push(`timestamp <= $${idx++}`);
      values.push(params.to);
    }

    if (params.sensorId) {
      conditions.push(`sensor_id = $${idx++}`);
      values.push(params.sensorId);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    values.push(params.limit);
    const limitIndex = idx++;
    values.push(params.offset);
    const offsetIndex = idx++;

    const query = `
      SELECT sensor_id, event_id, timestamp, value, created_at
      FROM metrics
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${limitIndex}
      OFFSET $${offsetIndex}
    `;

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  async getMetricsSummary(params: {
    from?: string;
    to?: string;
    sensorId?: string;
  }): Promise<{
    total_events: number;
    from?: string | null;
    to?: string | null;
    lag_seconds?: number | null;
  }> {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (params.from) {
      conditions.push(`timestamp >= $${idx++}`);
      values.push(params.from);
    }

    if (params.to) {
      conditions.push(`timestamp <= $${idx++}`);
      values.push(params.to);
    }

    if (params.sensorId) {
      conditions.push(`sensor_id = $${idx++}`);
      values.push(params.sensorId);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        COUNT(*)::bigint as total_events,
        MIN(timestamp) as from,
        MAX(timestamp) as to,
        CASE 
          WHEN MAX(timestamp) IS NULL THEN NULL
          ELSE EXTRACT(EPOCH FROM (NOW() - MAX(timestamp))) 
        END as lag_seconds
      FROM metrics
      ${whereClause}
    `;

    const result = await this.pool.query(query, values);
    const row = result.rows[0] || {
      total_events: 0,
      from: null,
      to: null,
      lag_seconds: null,
    };

    return {
      total_events: Number(row.total_events) || 0,
      from: row.from,
      to: row.to,
      lag_seconds:
        row.lag_seconds !== null && row.lag_seconds !== undefined
          ? Number(row.lag_seconds)
          : null,
    };
  }
}
