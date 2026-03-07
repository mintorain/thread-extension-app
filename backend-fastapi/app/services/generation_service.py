from app.adapters.base import GenerateInput, GenerateOptions, GenerateResult
from app.services.key_service import KeyService
from app.services.provider_registry import ProviderRegistry
from app.services.routing_service import RoutingService

class GenerationService:
    def __init__(self, registry: ProviderRegistry, routing: RoutingService, key_service: KeyService) -> None:
        self.registry = registry
        self.routing = routing
        self.key_service = key_service

    async def generate(self, user_id: str, data: GenerateInput, opt: GenerateOptions, provider_mode: str, provider: str | None) -> GenerateResult:
        order = await self.routing.resolve_provider_order(user_id, provider_mode, provider)
        last_error: Exception | None = None
        for target in order:
            try:
                adapter = self.registry.get(target)
                api_key = await self.key_service.get_decrypted_key(user_id, target)
                return await adapter.generate_thread(api_key=api_key, data=data, opt=opt)
            except Exception as exc:
                last_error = exc
        raise RuntimeError(f'All providers failed: {last_error}')
