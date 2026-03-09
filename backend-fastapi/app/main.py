import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
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

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
_static_ready = STATIC_DIR.is_dir()

if _static_ready:
    if (STATIC_DIR / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="assets")
    if (STATIC_DIR / "downloads").is_dir():
        app.mount("/downloads", StaticFiles(directory=str(STATIC_DIR / "downloads")), name="downloads")


@app.get('/health')
async def health() -> dict:
    return {"ok": True}


@app.get('/')
async def landing_page():
    index = STATIC_DIR / "index.html"
    if index.is_file():
        return FileResponse(str(index), media_type="text/html")
    return {
        "message": "ThreadHook API",
        "docs": "/docs",
        "static_dir": str(STATIC_DIR),
        "static_exists": _static_ready,
        "index_exists": index.is_file(),
    }
