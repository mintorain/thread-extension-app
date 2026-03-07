import { Module } from '@nestjs/common';
import { AnthropicAdapter } from './adapters/anthropic.adapter';
import { OpenAiAdapter } from './adapters/openai.adapter';
import { GeminiAdapter } from './adapters/gemini.adapter';
import { GrokAdapter } from './adapters/grok.adapter';
import { LlmRegistry } from './llm.registry';
import { RoutingService } from './routing.service';

@Module({
  providers: [AnthropicAdapter, OpenAiAdapter, GeminiAdapter, GrokAdapter, LlmRegistry, RoutingService],
  exports: [LlmRegistry, RoutingService],
})
export class LlmModule {}
