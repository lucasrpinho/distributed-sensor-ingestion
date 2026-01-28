import { Module } from '@nestjs/common';
import { ProducerConfigService } from './producer-config.service';
import { ProducerConfigController } from './producer-config.controller';

@Module({
  providers: [ProducerConfigService],
  controllers: [ProducerConfigController],
})
export class ProducerConfigModule {}

