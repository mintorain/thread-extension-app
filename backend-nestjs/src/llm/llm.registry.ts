import { Injectable } from '@nestjs/common';
import { ProviderName } from '../common/constants/providers';
import { AnthropicAdapter } from './adapters/anthropic.adapter';
import { OpenAiAdapter } from './adapters/openai.adapter';
import { GeminiAdapter } from './adapters/gemini.adapter';
import { GrokAdapter } from './adapters/grok.adapter';
import { LlmAdapter } from './adapters/llm.adapter';

@Injectable()
export class LlmRegistry {
  private readonly map: Record<ProviderName, LlmAdapter>;

  constructor(
    anthropic: AnthropicAdapter,
    openai: OpenAiAdapter,
    gemini: GeminiAdapter,
    grok: GrokAdapter,
  ) {
    this.map = { claude: anthropic, chatgpt: openai, gemini, grok };
  }

  get(provider: ProviderName): LlmAdapter {
    return this.map[provider];
  }
}
