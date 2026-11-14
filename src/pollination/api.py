"""FastAPI entry point for the pollination service."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from pollination.contract import router

app = FastAPI(title="Pollination API")
# The Vite dev server may call the API directly; in Docker nginx proxies /api.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
app.include_router(router)


@app.get("/health")
def health() -> dict[str, str]:
    """Report that the service is running."""
    return {"status": "ok"}
