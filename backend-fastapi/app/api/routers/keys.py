from fastapi import APIRouter, HTTPException
from app.schemas.key import SaveKeyRequest
from app.services.key_service import KeyService
from app.services.provider_registry import ProviderRegistry

router = APIRouter(tags=['Keys'])
key_service = KeyService()

@router.post('/keys/{provider}/validate')
async def validate_key(provider: str, body: SaveKeyRequest) -> dict:
    registry = ProviderRegistry()
    try:
        adapter = registry.get(provider)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {'valid': await adapter.validate_key(body.apiKey), 'provider': provider}

@router.put('/keys/{provider}')
async def save_key(provider: str, body: SaveKeyRequest) -> dict:
    registry = ProviderRegistry()
    adapter = registry.get(provider)
    valid = await adapter.validate_key(body.apiKey)
    if not valid:
        return {'saved': False, 'provider': provider, 'keyStatus': 'invalid'}
    await key_service.save_key(user_id='demo-user', provider=provider, plain_key=body.apiKey)
    return {'saved': True, 'provider': provider, 'keyStatus': 'active'}
