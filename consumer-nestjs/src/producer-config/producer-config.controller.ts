import { Body, Controller, Get, Put } from '@nestjs/common';
import { ProducerConfig, ProducerConfigService } from './producer-config.service';

@Controller('producer-config')
export class ProducerConfigController {
  constructor(private readonly producerConfigService: ProducerConfigService) {}

  @Get()
  async getConfig(): Promise<ProducerConfig> {
    return this.producerConfigService.getConfig();
  }

  @Put()
  async updateConfig(
    @Body()
    body: Partial<ProducerConfig>,
  ): Promise<ProducerConfig> {
    return this.producerConfigService.updateConfig({
      sensorCount: body.sensorCount ?? 0,
      eventsPerSec: body.eventsPerSec ?? 0,
      runDurationSec: body.runDurationSec ?? 0,
      kafkaBrokers: body.kafkaBrokers ?? '',
      kafkaTopic: body.kafkaTopic ?? '',
    });
  }
}

