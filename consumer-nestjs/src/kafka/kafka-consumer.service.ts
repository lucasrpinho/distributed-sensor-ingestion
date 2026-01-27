import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Kafka,
  Consumer,
  EachBatchPayload,
  CompressionTypes,
  CompressionCodecs,
} from 'kafkajs';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { MetricsService } from '../metrics/metrics.service';
import { SensorEventDto } from '../dto/sensor-event.dto';


const SnappyCodec = require('kafkajs-snappy');
CompressionCodecs[CompressionTypes.Snappy] = SnappyCodec;

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private consumer: Consumer;
  private isRunning = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly idempotencyService: IdempotencyService,
    private readonly metricsService: MetricsService,
  ) {}

  async onModuleInit() {
    const kafkaConfig = this.configService.get('kafka');
    const kafka = new Kafka({
      clientId: 'sensor-metrics-consumer',
      brokers: kafkaConfig.brokers,
    });

    this.consumer = kafka.consumer({
      groupId: kafkaConfig.groupId,
      sessionTimeout: kafkaConfig.sessionTimeout || 30000,
      heartbeatInterval: kafkaConfig.heartbeatInterval || 3000,
      maxBytesPerPartition: kafkaConfig.maxBytesPerPartition || 1048576, // 1MB
      minBytes: kafkaConfig.minBytes || 1,
      maxBytes: kafkaConfig.maxBytes || 10485760, // 10MB
      maxWaitTimeInMs: kafkaConfig.maxWaitTimeInMs || 5000,
    });

    await this.start();
  }

  async onModuleDestroy() {
    await this.stop();
  }

  private async start() {
    try {
      const kafkaConfig = this.configService.get('kafka');
      
      await this.consumer.connect();
      const fromBeginning =
        process.env.KAFKA_FROM_BEGINNING === 'true' || false;

      await this.consumer.subscribe({
        topic: kafkaConfig.topic,
        fromBeginning,
      });

      this.isRunning = true;
      this.logger.log(
        `Connected to Kafka and subscribed to topic: ${kafkaConfig.topic}`,
      );
      this.logger.log(`Starting from: ${fromBeginning ? 'beginning' : 'latest'}`);

      this.consumer.on('consumer.crash', async (event) => {
        this.logger.error(`Consumer crashed: ${event.payload.error.message}`);
        this.isRunning = false;
      });

      await this.consumer.run({
        eachBatch: async (payload: EachBatchPayload) => {
          try {
            await this.processBatch(payload);
          } catch (error) {
            this.logger.error(
              `Error processing batch from partition ${payload.batch.partition}: ${error.message}`,
            );
            throw error;
          }
        },
        eachBatchAutoResolve: false,
      });
    } catch (error) {
      this.logger.error(`Failed to start Kafka consumer: ${error.message}`);
      this.isRunning = false;
      throw error;
    }
  }

  private async processBatch(payload: EachBatchPayload) {
    const { batch, resolveOffset, heartbeat, isRunning, isStale } = payload;
    const partition = batch.partition;
    const topic = batch.topic;

    this.logger.debug(
      `Processing batch: partition ${partition}, ${batch.messages.length} messages`,
    );

    const eventsToProcess: Array<{
      event: SensorEventDto;
      offset: string;
    }> = [];

    for (const message of batch.messages) {
      if (!isRunning() || isStale()) {
        this.logger.warn('Consumer stopped or stale, aborting batch');
        break;
      }

      try {
        const event = this.parseMessage(message);
        if (event) {
          eventsToProcess.push({
            event,
            offset: message.offset,
          });
        }
      } catch (error) {
        this.logger.error(
          `Failed to parse message at offset ${message.offset}: ${error.message}`,
        );
        resolveOffset(message.offset);
        await heartbeat();
      }
    }

    if (eventsToProcess.length === 0) {
      this.logger.debug('No valid events to process in this batch');
      return;
    }

    const idempotencyChecks = await this.idempotencyService.batchCheckNewEvents(
      eventsToProcess.map((e) => ({
        eventId: e.event.event_id,
        sensorId: e.event.sensor_id,
        partition,
        offset: e.offset,
      })),
    );

    const newEvents = eventsToProcess.filter(
      (e) => idempotencyChecks.get(e.event.event_id) === true,
    );

    if (newEvents.length === 0) {
      this.logger.debug('All events in batch were duplicates, skipping');
      for (const e of eventsToProcess) {
        resolveOffset(e.offset);
      }
      await heartbeat();
      return;
    }

    try {
      await this.metricsService.batchInsertMetrics(
        newEvents.map((e) => e.event),
      );

      for (const e of eventsToProcess) {
        resolveOffset(e.offset);
      }

      this.logger.log(
        `Processed ${newEvents.length} new events from partition ${partition} (${eventsToProcess.length - newEvents.length} duplicates skipped)`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process batch from partition ${partition}: ${error.message}`,
      );
      throw error;
    }

    await heartbeat();
  }

  private parseMessage(message: any): SensorEventDto | null {
    try {
      const value = message.value?.toString();
      if (!value) {
        return null;
      }

      const event: SensorEventDto = JSON.parse(value);

      if (
        !event.sensor_id ||
        !event.event_id ||
        !event.timestamp ||
        typeof event.value !== 'number'
      ) {
        throw new Error('Invalid event structure');
      }

      return event;
    } catch (error) {
      throw new Error(`Failed to parse message: ${error.message}`);
    }
  }

  private async stop() {
    if (this.isRunning) {
      this.isRunning = false;
      await this.consumer?.disconnect();
      this.logger.log('Kafka consumer stopped');
    }
  }
}
