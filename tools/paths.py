"""Path containment shared by every tool.

Every tool takes a repo_root (the workspace the agent is allowed to
touch) plus a path relative to it. Since these paths ultimately come
from an LLM's tool-call arguments, resolve() rejects anything that
would escape repo_root (e.g. `../../etc/passwd`) instead of trusting
the caller.
"""

from pathlib import Path


class PathEscapesRepoError(ValueError):
    pass


def resolve(repo_root, relative_path):
    root = Path(repo_root).resolve()
    candidate = (root / relative_path).resolve()
    try:
        candidate.relative_to(root)
    except ValueError:
        raise PathEscapesRepoError(
            f"{relative_path!r} resolves outside repo root {root}"
        )
    return candidate
