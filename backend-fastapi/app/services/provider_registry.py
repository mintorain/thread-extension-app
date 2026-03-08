from app.adapters.base import LLMAdapter
from app.adapters.anthropic_adapter import AnthropicAdapter
from app.adapters.openai_adapter import OpenAIAdapter
from app.adapters.gemini_adapter import GeminiAdapter
from app.adapters.grok_adapter import GrokAdapter

class ProviderRegistry:
    def __init__(self) -> None:
        self._providers: dict[str, LLMAdapter] = {
            'claude': AnthropicAdapter(),
            'chatgpt': OpenAIAdapter(),
            'gemini': GeminiAdapter(),
            'grok': GrokAdapter(),
        }

    def get(self, provider: str) -> LLMAdapter:
        if provider not in self._providers:
            raise ValueError(f'Unsupported provider: {provider}')
        return self._providers[provider]

    def list_models(self) -> dict[str, list[str]]:
        return {
            'claude': ['claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001'],
            'chatgpt': ['gpt-4.1', 'gpt-4o-mini'],
            'gemini': ['gemini-2.0-flash'],
            'grok': ['grok-3'],
        }
