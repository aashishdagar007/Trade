"""
Run with: uvicorn backend.main:app --reload --port 8000
"""

from fastapi.middleware.cors import CORSMiddleware

from .ws_server import app
from .api.rest import router as rest_router

app.include_router(rest_router, prefix="/api")

# Electron renderer runs on a local origin during dev -- lock this down
# once you're not running against localhost anymore.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}
