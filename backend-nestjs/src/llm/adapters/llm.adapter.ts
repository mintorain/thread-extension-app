import { ProviderName } from '../../common/constants/providers';

export interface GenerateInput {
  title: string;
  url: string;
  content: string;
}

export interface GenerateOptions {
  tone: 'neutral' | 'professional' | 'casual';
  length: 'short' | 'medium' | 'long';
  language: string;
  model?: string;
}

export interface GenerateResult {
  providerUsed: ProviderName;
  model: string;
  hook: string;
  points: string[];
  insight: string;
  hashtags: string[];
  source: string;
  tokenIn: number;
  tokenOut: number;
}

export interface LlmAdapter {
  readonly provider: ProviderName;
  validateKey(apiKey: string): Promise<boolean>;
  generateThread(apiKey: string, input: GenerateInput, options: GenerateOptions): Promise<GenerateResult>;
}
