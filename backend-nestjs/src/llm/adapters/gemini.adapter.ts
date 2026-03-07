import { Injectable } from '@nestjs/common';
import { GenerateInput, GenerateOptions, GenerateResult, LlmAdapter } from './llm.adapter';

@Injectable()
export class GeminiAdapter implements LlmAdapter {
  readonly provider = 'gemini' as const;

  async validateKey(apiKey: string): Promise<boolean> {
    return apiKey.length > 10;
  }

  async generateThread(apiKey: string, input: GenerateInput, options: GenerateOptions): Promise<GenerateResult> {
    void apiKey;
    return {
      providerUsed: this.provider,
      model: options.model ?? 'gemini-2.0-flash',
      hook: `핵심 이슈 체크: ${input.title}`,
      points: ['핵심 포인트 1', '핵심 포인트 2', '핵심 포인트 3'],
      insight: '중기 구조 변화 관점에서 추적이 필요합니다.',
      hashtags: ['#인사이트', '#시장분석', '#뉴스요약'],
      source: input.url,
      tokenIn: 1100,
      tokenOut: 260,
    };
  }
}
