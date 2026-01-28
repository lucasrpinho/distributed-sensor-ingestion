import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { KafkaModule } from './kafka/kafka.module';
import { MetricsModule } from './metrics/metrics.module';
import { IdempotencyModule } from './idempotency/idempotency.module';
import { ProducerConfigModule } from './producer-config/producer-config.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    IdempotencyModule,
    MetricsModule,
    KafkaModule,
    ProducerConfigModule,
  ],
})
export class AppModule {}
