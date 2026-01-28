import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = process.env.PORT || 3001;

  await app.listen(port);

  logger.log(`HTTP server listening on port ${port}`);
  logger.log('Kafka consumer service started');
  logger.log('Consumer is processing messages from Kafka...');
}

bootstrap().catch((error) => {
  console.error('Failed to start consumer service:', error);
  process.exit(1);
});
