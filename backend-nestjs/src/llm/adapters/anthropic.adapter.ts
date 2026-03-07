import { Injectable } from '@nestjs/common';
import { GenerateInput, GenerateOptions, GenerateResult, LlmAdapter } from './llm.adapter';

@Injectable()
export class AnthropicAdapter implements LlmAdapter {
  readonly provider = 'claude' as const;

  async validateKey(apiKey: string): Promise<boolean> {
    return apiKey.startsWith('sk-') && apiKey.length > 10;
  }

  async generateThread(apiKey: string, input: GenerateInput, options: GenerateOptions): Promise<GenerateResult> {
    void apiKey;
    return {
      providerUsed: this.provider,
      model: options.model ?? 'sonnet',
      hook: `${input.title} 핵심 정리`,
      points: ['핵심 포인트 1', '핵심 포인트 2', '핵심 포인트 3'],
      insight: '후속 시장 반응 추적이 필요합니다.',
      hashtags: ['#이슈정리', '#트렌드', '#뉴스'],
      source: input.url,
      tokenIn: 1200,
      tokenOut: 280,
    };
  }
}
