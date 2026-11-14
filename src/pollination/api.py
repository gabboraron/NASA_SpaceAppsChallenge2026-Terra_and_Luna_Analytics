"""FastAPI entry point for the pollination service."""

from fastapi import FastAPI

from pollination.contract import router

app = FastAPI(title="Pollination API")
app.include_router(router)


@app.get("/health")
def health() -> dict[str, str]:
    """Report that the service is running."""
    return {"status": "ok"}
