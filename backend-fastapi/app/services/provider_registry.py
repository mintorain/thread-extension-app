from app.adapters.base import LLMAdapter
from app.adapters.anthropic_adapter import AnthropicAdapter
from app.adapters.openai_adapter import OpenAIAdapter

class ProviderRegistry:
    def __init__(self) -> None:
        self._providers: dict[str, LLMAdapter] = {
            'claude': AnthropicAdapter(),
            'chatgpt': OpenAIAdapter(),
        }

    def get(self, provider: str) -> LLMAdapter:
        if provider not in self._providers:
            raise ValueError(f'Unsupported provider: {provider}')
        return self._providers[provider]

    def list_models(self) -> dict[str, list[str]]:
        return {
            'claude': ['sonnet', 'haiku'],
            'chatgpt': ['gpt-4.1', 'gpt-4o-mini'],
            'gemini': ['gemini-2.0-flash'],
            'grok': ['grok-3'],
        }
