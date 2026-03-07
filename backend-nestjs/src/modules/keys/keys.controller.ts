import { Body, Controller, Put, Param, Req, UseGuards } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { ProviderName } from '../../common/constants/providers';
import { LlmRegistry } from '../../llm/llm.registry';
import { KeysService } from './keys.service';

class SaveKeyDto {
  @IsString()
  @MinLength(8)
  apiKey!: string;
}

@Controller('v1/keys')
@UseGuards(AuthGuard)
export class KeysController {
  constructor(
    private readonly keysService: KeysService,
    private readonly registry: LlmRegistry,
  ) {}

  @Put(':provider')
  async upsertKey(@Req() req: any, @Param('provider') provider: ProviderName, @Body() dto: SaveKeyDto) {
    const adapter = this.registry.get(provider);
    const valid = await adapter.validateKey(dto.apiKey);
    if (!valid) return { saved: false, provider, keyStatus: 'invalid' };
    await this.keysService.save(req.user.id, provider, dto.apiKey);
    return { saved: true, provider, keyStatus: 'active' };
  }
}
