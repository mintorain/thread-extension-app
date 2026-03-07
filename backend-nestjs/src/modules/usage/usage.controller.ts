import { Controller, Get, Query } from '@nestjs/common';

@Controller('v1/usage')
export class UsageController {
  @Get('summary')
  summary(@Query('from') from: string, @Query('to') to: string) {
    return { from, to, totalRequests: 0, byProvider: [], estimatedCostUsd: 0 };
  }
}
