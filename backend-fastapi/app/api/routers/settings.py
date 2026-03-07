from fastapi import APIRouter

router = APIRouter(tags=['Settings'])

demo_settings = {
    'mode': 'priority',
    'primaryProvider': 'claude',
    'providerPriority': ['claude', 'chatgpt', 'gemini', 'grok'],
    'fallbackEnabled': True,
    'defaultModelByProvider': {'claude': 'sonnet', 'chatgpt': 'gpt-4.1'},
}

@router.get('/settings/ai')
async def get_settings() -> dict:
    return demo_settings

@router.put('/settings/ai')
async def update_settings(payload: dict) -> dict:
    demo_settings.update(payload)
    return {'updated': True}
