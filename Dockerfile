# Whole app in one image: FastAPI serves the API at /api and the map client at /.
# Build: docker compose build
FROM node:22-alpine AS frontend
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend ./
# Unset = talk to the real API; "true" = built-in typed mocks.
ARG VITE_USE_MOCKS
ENV VITE_USE_MOCKS=$VITE_USE_MOCKS
RUN npm run build

FROM python:3.12-slim-bookworm AS builder
COPY --from=ghcr.io/astral-sh/uv:0.9.26 /uv /bin/uv
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=0
WORKDIR /app

# Dependencies first so code edits don't invalidate this layer.
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --locked --no-dev --no-install-project
COPY pyproject.toml uv.lock ./
COPY src ./src
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --no-editable

FROM python:3.12-slim-bookworm
# rasterio's bundled GDAL links against the system expat.
RUN apt-get update && apt-get install -y --no-install-recommends libexpat1 \
    && rm -rf /var/lib/apt/lists/*
RUN useradd --create-home --uid 10001 app
WORKDIR /app
COPY --from=builder --chown=app:app /app/.venv ./.venv
COPY --chown=app:app data ./data
COPY --from=frontend --chown=app:app /app/dist ./static
RUN mkdir .cache && chown app:app .cache
USER app
ENV PATH="/app/.venv/bin:$PATH" PYTHONUNBUFFERED=1 \
    DATA_DIR=/app/data CACHE_DIR=/app/.cache STATIC_DIR=/app/static
EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health')"]
# Behind a TLS-terminating proxy (Azure Container Apps), trust its X-Forwarded-* headers.
CMD ["uvicorn", "pollination.web:app", "--host", "0.0.0.0", "--port", "8000", \
     "--proxy-headers", "--forwarded-allow-ips", "*"]
