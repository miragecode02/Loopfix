"""Vercel serverless entrypoint for the Loopfix read-only viewer API.

Under Vercel's Python framework preset, every request (not just /api/*) is
forwarded to this single function, so it also serves the pre-built React
app (webapp/frontend/dist, bundled in via vercel.json's includeFiles) and
falls back to index.html for client-side routes. This keeps routing in one
place instead of fighting Vercel's rewrite/framework detection for a
two-runtime (Python + static) deployment.
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from webapp.backend.main import app  # noqa: E402  (import after sys.path fix)

from fastapi.responses import FileResponse  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402

DIST = ROOT / "webapp" / "frontend" / "dist"

app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")


@app.get("/favicon.svg", include_in_schema=False)
async def _favicon():
    return FileResponse(DIST / "favicon.svg")


@app.get("/icons.svg", include_in_schema=False)
async def _icons():
    return FileResponse(DIST / "icons.svg")


@app.get("/{_full_path:path}", include_in_schema=False)
async def _spa_fallback(_full_path: str):
    # Registered last, so it never shadows the /api/* routes above - React
    # Router handles the actual path client-side from here.
    return FileResponse(DIST / "index.html")


__all__ = ["app"]
