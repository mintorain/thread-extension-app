import { Injectable } from '@nestjs/common';
import { LlmRegistry } from '../../llm/llm.registry';
import { RoutingService } from '../../llm/routing.service';
import { KeysService } from '../keys/keys.service';
import { GenerateThreadDto } from './dto/generate-thread.dto';

@Injectable()
export class GenerateService {
  constructor(
    private readonly registry: LlmRegistry,
    private readonly routing: RoutingService,
    private readonly keysService: KeysService,
  ) {}

  async generate(userId: string, dto: GenerateThreadDto) {
    const order = await this.routing.resolveProviderOrder(userId, dto.providerMode, dto.provider);
    let lastError: unknown;

    for (const provider of order) {
      try {
        const adapter = this.registry.get(provider);
        const apiKey = await this.keysService.getPlainKey(userId, provider);
        return await adapter.generateThread(apiKey, dto.input, dto.options);
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError ?? new Error('All providers failed');
  }
}
