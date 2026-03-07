import { Injectable } from '@nestjs/common';

@Injectable()
export class RoutingService {
  private readonly defaultOrder = ['claude', 'chatgpt', 'gemini', 'grok'] as const;

  async resolveProviderOrder(
    userId: string,
    providerMode: 'single' | 'priority',
    provider?: 'claude' | 'chatgpt' | 'gemini' | 'grok',
  ) {
    void userId;
    if (providerMode === 'single') {
      if (!provider) throw new Error('provider is required when providerMode=single');
      return [provider];
    }
    if (!provider) return [...this.defaultOrder];
    return [provider, ...this.defaultOrder.filter((p) => p !== provider)];
  }
}
