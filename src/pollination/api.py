"""FastAPI entry point for the pollination service."""

from fastapi import FastAPI

app = FastAPI(title="Pollination API")


@app.get("/health")
def health() -> dict[str, str]:
    """Report that the service is running."""
    return {"status": "ok"}
