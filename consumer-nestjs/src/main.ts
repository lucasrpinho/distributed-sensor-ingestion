import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  logger.log('Kafka consumer service started');
  logger.log('Consumer is processing messages from Kafka...');
}

bootstrap().catch((error) => {
  console.error('Failed to start consumer service:', error);
  process.exit(1);
});
