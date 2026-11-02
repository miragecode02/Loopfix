"""Vercel serverless entrypoint for the Loopfix read-only viewer API.

Vercel maps this file to the /api route and forwards every request under
/api/* to it (see the rewrite in vercel.json). It just re-exports the real
FastAPI app so there is only one copy of the API logic.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from webapp.backend.main import app  # noqa: E402  (import after sys.path fix)

__all__ = ["app"]
