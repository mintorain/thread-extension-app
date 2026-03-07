from fastapi import FastAPI
from app.api.routers import providers, keys, settings, content, generate, usage

app = FastAPI(title="ThreadHook API", version="1.0.0")

app.include_router(providers.router, prefix="/v1")
app.include_router(keys.router, prefix="/v1")
app.include_router(settings.router, prefix="/v1")
app.include_router(content.router, prefix="/v1")
app.include_router(generate.router, prefix="/v1")
app.include_router(usage.router, prefix="/v1")

@app.get('/health')
async def health() -> dict:
    return {"ok": True}
