"""The combined web app serves the map client at / and the API at /api."""

import asyncio
from pathlib import Path

import httpx

from pollination.web import create_app


def test_serves_api_client_and_client_routes(tmp_path: Path) -> None:
    (tmp_path / "index.html").write_text("<p>shell</p>")
    (tmp_path / "app.js").write_text("js")

    async def exercise() -> None:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=create_app(tmp_path)),
            base_url="http://test",
        ) as client:
            assert (await client.get("/api/health")).json() == {"status": "ok"}
            assert (await client.get("/")).text == "<p>shell</p>"
            assert (await client.get("/app.js")).text == "js"
            assert (await client.get("/some/route")).text == "<p>shell</p>"
            assert (await client.get("/api/docs")).status_code == httpx.codes.OK

    asyncio.run(exercise())
