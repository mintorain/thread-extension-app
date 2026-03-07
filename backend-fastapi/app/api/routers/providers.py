from fastapi import APIRouter
from app.services.provider_registry import ProviderRegistry

router = APIRouter(tags=['Providers'])

@router.get('/providers')
async def list_providers() -> dict:
    registry = ProviderRegistry()
    return {'providers': [{'name': n, 'models': m} for n, m in registry.list_models().items()]}
