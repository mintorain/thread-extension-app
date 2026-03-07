import { Injectable } from '@nestjs/common';
import { GenerateInput, GenerateOptions, GenerateResult, LlmAdapter } from './llm.adapter';

@Injectable()
export class GrokAdapter implements LlmAdapter {
  readonly provider = 'grok' as const;

  async validateKey(apiKey: string): Promise<boolean> {
    return apiKey.length > 10;
  }

  async generateThread(apiKey: string, input: GenerateInput, options: GenerateOptions): Promise<GenerateResult> {
    void apiKey;
    return {
      providerUsed: this.provider,
      model: options.model ?? 'grok-3',
      hook: `빠른 이슈 훅: ${input.title}`,
      points: ['핵심 포인트 1', '핵심 포인트 2', '핵심 포인트 3'],
      insight: '이해관계자 반응 추적이 핵심입니다.',
      hashtags: ['#오늘이슈', '#요약', '#쓰레드'],
      source: input.url,
      tokenIn: 1250,
      tokenOut: 290,
    };
  }
}
