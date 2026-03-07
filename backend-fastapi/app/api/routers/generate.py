from fastapi import APIRouter, HTTPException

from app.schemas.generate import GenerateThreadRequest
from app.services.generation_service import GenerationService
from app.services.key_service import key_service
from app.services.provider_registry import ProviderRegistry
from app.services.routing_service import RoutingService

router = APIRouter(tags=['Generate'])


@router.post('/generate/thread')
async def generate_thread(payload: GenerateThreadRequest) -> dict:
    registry = ProviderRegistry()
    routing = RoutingService()
    service = GenerationService(registry, routing, key_service)

    try:
        result = await service.generate(
            user_id='demo-user',
            data=payload.input,
            opt=payload.options,
            provider_mode=payload.providerMode,
            provider=payload.provider,
        )
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {
        'providerUsed': result.provider_used,
        'model': result.model,
        'thread': {
            'hook': result.hook,
            'points': result.points,
            'insight': result.insight,
            'hashtags': result.hashtags,
            'source': result.source,
        },
        'metrics': {'tokenIn': result.token_in, 'tokenOut': result.token_out},
    }
