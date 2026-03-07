export type ProviderName = 'claude' | 'chatgpt' | 'gemini' | 'grok';

export const PROVIDER_MODELS: Record<ProviderName, string[]> = {
  claude: ['sonnet', 'haiku'],
  chatgpt: ['gpt-4.1', 'gpt-4o-mini'],
  gemini: ['gemini-2.0-flash'],
  grok: ['grok-3'],
};
