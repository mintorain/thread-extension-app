import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { GenerateService } from './generate.service';
import { GenerateThreadDto } from './dto/generate-thread.dto';

@Controller('v1/generate')
@UseGuards(AuthGuard)
export class GenerateController {
  constructor(private readonly generateService: GenerateService) {}

  @Post('thread')
  async generateThread(@Req() req: any, @Body() dto: GenerateThreadDto) {
    const result = await this.generateService.generate(req.user.id, dto);
    return {
      providerUsed: result.providerUsed,
      model: result.model,
      thread: {
        hook: result.hook,
        points: result.points,
        insight: result.insight,
        hashtags: result.hashtags,
        source: result.source,
      },
      metrics: {
        tokenIn: result.tokenIn,
        tokenOut: result.tokenOut,
      },
    };
  }
}
