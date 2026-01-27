import { Module } from '@nestjs/common';
import { KafkaConsumerService } from './kafka-consumer.service';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [IdempotencyModule, MetricsModule],
  providers: [KafkaConsumerService],
})
export class KafkaModule {}
