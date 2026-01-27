import { Injectable, Inject, Logger } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  constructor(@Inject('DATABASE_POOL') private readonly pool: Pool) {}

  /**
   * Checks if an event has already been processed.
   * Returns true if the event is new (not processed), false if duplicate.
   */
  async isNewEvent(
    eventId: string,
    sensorId: string,
    partition: number,
    offset: string,
  ): Promise<boolean> {
    try {
      const result = await this.pool.query(
        `INSERT INTO processed_events (event_id, sensor_id, kafka_partition, kafka_offset)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (event_id) DO NOTHING
         RETURNING event_id`,
        [eventId, sensorId, partition, offset],
      );

      return result.rows.length > 0;
    } catch (error) {
      this.logger.error(
        `Failed to check idempotency for event ${eventId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Batch check for multiple events using bulk INSERT for better performance.
   * Returns a map of event_id -> isNew (boolean).
   */
  async batchCheckNewEvents(
    events: Array<{
      eventId: string;
      sensorId: string;
      partition: number;
      offset: string;
    }>,
  ): Promise<Map<string, boolean>> {
    if (events.length === 0) {
      return new Map();
    }

    const result = new Map<string, boolean>();
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
        params.push(event.eventId, event.sensorId, event.partition, event.offset);
        paramIndex += 4;
      }

      const insertQuery = `
        INSERT INTO processed_events (event_id, sensor_id, kafka_partition, kafka_offset)
        VALUES ${values.join(', ')}
        ON CONFLICT (event_id) DO NOTHING
        RETURNING event_id
      `;

      const insertResult = await client.query(insertQuery, params);
      const insertedEventIds = new Set(
        insertResult.rows.map((row) => row.event_id),
      );

      // Mark all events - true if inserted (new), false if conflict (duplicate)
      for (const event of events) {
        result.set(event.eventId, insertedEventIds.has(event.eventId));
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error(`Batch idempotency check failed: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }

    return result;
  }
}
