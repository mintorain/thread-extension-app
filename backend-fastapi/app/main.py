from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.routers import providers, keys, settings, content, generate, usage

app = FastAPI(title="ThreadHook API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(providers.router, prefix="/v1")
app.include_router(keys.router, prefix="/v1")
app.include_router(settings.router, prefix="/v1")
app.include_router(content.router, prefix="/v1")
app.include_router(generate.router, prefix="/v1")
app.include_router(usage.router, prefix="/v1")

@app.get('/health')
async def health() -> dict:
    return {"ok": True}


# Landing page: mount static dir last so API routes take priority
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"

if STATIC_DIR.is_dir() and (STATIC_DIR / "index.html").is_file():
    app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")
