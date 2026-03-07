class RoutingService:
    def __init__(self) -> None:
        self.default_order = ['claude', 'chatgpt', 'gemini', 'grok']

    async def resolve_provider_order(self, user_id: str, provider_mode: str, provider: str | None) -> list[str]:
        _ = user_id
        if provider_mode == 'single':
            if not provider:
                raise RuntimeError('provider is required when providerMode=single')
            return [provider]
        if provider:
            return [provider] + [p for p in self.default_order if p != provider]
        return self.default_order
