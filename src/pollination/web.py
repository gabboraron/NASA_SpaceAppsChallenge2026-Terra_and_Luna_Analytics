"""Single-process web server: the built map client at ``/`` and the API at ``/api``.

Used by the Docker image, so one container serves the whole app (no nginx).
"""

from pathlib import Path

from fastapi import FastAPI
from starlette.exceptions import HTTPException
from starlette.responses import Response
from starlette.staticfiles import StaticFiles
from starlette.types import Scope

from pollination import api
from pollination.config import Settings


class SpaFiles(StaticFiles):
    """Static files that answer unknown paths with ``index.html`` (client routes)."""

    async def get_response(self, path: str, scope: Scope) -> Response:
        """Serve the file at ``path``, or the app shell when there is none.

        Args:
            path: Request path relative to the static directory.
            scope: ASGI request scope.

        Returns:
            The file, or ``index.html`` for a path that is not a file.

        Raises:
            HTTPException: For errors other than a missing file.
        """
        try:
            return await super().get_response(path, scope)
        except HTTPException as exc:
            if exc.status_code != 404:  # noqa: PLR2004 - HTTP status code
                raise
            return await super().get_response("index.html", scope)


def create_app(static_dir: Path) -> FastAPI:
    """Build the combined app.

    Args:
        static_dir: Directory with the built map client (``npm run build`` output).

    Returns:
        An app serving the API under ``/api`` and the map client everywhere else.
    """
    # Starlette skips the lifespan of mounted apps, so run the API's here.
    app = FastAPI(
        lifespan=api.lifespan, docs_url=None, redoc_url=None, openapi_url=None
    )
    app.mount("/api", api.app)
    app.mount("/", SpaFiles(directory=static_dir, html=True, check_dir=False))
    return app


app = create_app(Settings().static_dir)
