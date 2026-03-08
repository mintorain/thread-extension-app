import { Injectable } from '@nestjs/common';
import { GenerateInput, GenerateOptions, GenerateResult, LlmAdapter } from './llm.adapter';

@Injectable()
export class OpenAiAdapter implements LlmAdapter {
  readonly provider = 'chatgpt' as const;

  async validateKey(apiKey: string): Promise<boolean> {
    // OpenAI keys vary by product/project; avoid over-restrictive prefix checks.
    const key = (apiKey || '').trim();
    if (key.length < 20) return false;

    if (key.startsWith('sk-') || key.startsWith('sk-proj-') || key.startsWith('oai-')) {
      return true;
    }

    // Fallback: accept long non-whitespace tokens for MVP environments.
    return !/\s/.test(key);
  }

  async generateThread(apiKey: string, input: GenerateInput, options: GenerateOptions): Promise<GenerateResult> {
    void apiKey;
    return {
      providerUsed: this.provider,
      model: options.model ?? 'gpt-4.1',
      hook: `지금 봐야 할 이슈: ${input.title}`,
      points: ['핵심 포인트 1', '핵심 포인트 2', '핵심 포인트 3'],
      insight: '정책과 데이터 교차 지점을 확인할 필요가 있습니다.',
      hashtags: ['#브리핑', '#업계동향', '#정보공유'],
      source: input.url,
      tokenIn: 1300,
      tokenOut: 300,
    };
  }
}
