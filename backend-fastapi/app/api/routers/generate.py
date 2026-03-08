from fastapi import APIRouter, HTTPException

from app.schemas.generate import GenerateThreadRequest
from app.services.generation_service import GenerationService
from app.services.key_service import key_service
from app.services.provider_registry import ProviderRegistry
from app.services.routing_service import RoutingService

router = APIRouter(tags=['Generate'])


def _friendly_error(msg: str) -> str:
    if 'No API key' in msg or 'No OAuth token' in msg:
        return 'API Key가 등록되지 않았습니다. 설정(⚙)에서 먼저 API Key를 등록해주세요.'
    if '401' in msg or 'invalid_api_key' in msg or 'Incorrect API key' in msg:
        return 'API Key가 유효하지 않습니다. 올바른 키를 다시 등록해주세요.'
    if '403' in msg or 'Forbidden' in msg:
        return 'API Key 권한이 부족합니다. 해당 Provider에서 키 권한을 확인해주세요.'
    if '429' in msg or 'rate limit' in msg.lower():
        return 'API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.'
    if '500' in msg or '502' in msg or '503' in msg:
        return 'AI Provider 서버에 일시적 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    if 'timeout' in msg.lower() or 'timed out' in msg.lower():
        return 'AI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.'
    return msg


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
    except RuntimeError as exc:
        msg = str(exc)
        friendly = _friendly_error(msg)
        if 'No API key' in msg:
            raise HTTPException(status_code=401, detail=friendly) from exc
        if '401' in msg or 'invalid_api_key' in msg or 'Incorrect API key' in msg:
            raise HTTPException(status_code=401, detail=friendly) from exc
        raise HTTPException(status_code=503, detail=friendly) from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail=_friendly_error(str(exc))) from exc

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
