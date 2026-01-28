import { Controller, Get, Query } from '@nestjs/common';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  async getMetrics(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('sensorId') sensorId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsedLimit = Number(limit) || 100;
    const parsedOffset = Number(offset) || 0;

    return this.metricsService.queryMetrics({
      from,
      to,
      sensorId,
      limit: parsedLimit,
      offset: parsedOffset,
    });
  }

  @Get('summary')
  async getSummary(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('sensorId') sensorId?: string,
  ) {
    return this.metricsService.getMetricsSummary({
      from,
      to,
      sensorId,
    });
  }
}

