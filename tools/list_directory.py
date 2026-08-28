"""list_directory tool: lists entries under a path within repo_root."""

from pathlib import Path

from .paths import resolve

EXCLUDED_DIRS = {
    ".git", "__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache",
    "venv", ".venv", "node_modules", "dist", "build", ".idea", ".vscode",
}


def list_directory(repo_root, path=".", recursive=False, max_depth=3):
    """List files and directories under path within repo_root.

    Common noise directories (.git, __pycache__, venv, node_modules,
    ...) are excluded so the agent isn't wading through build/vcs
    artifacts. Non-recursive by default; set recursive=True to walk
    down up to max_depth levels.
    """
    target = resolve(repo_root, path)
    if not target.is_dir():
        raise NotADirectoryError(f"{path} is not a directory under {repo_root}")

    root = Path(repo_root).resolve()
    entries = []

    def _walk(current, depth):
        try:
            children = sorted(current.iterdir(), key=lambda p: (p.is_file(), p.name.lower()))
        except PermissionError:
            return
        for child in children:
            if child.name in EXCLUDED_DIRS:
                continue
            rel = child.relative_to(root).as_posix()
            if child.is_dir():
                entries.append({"path": rel, "type": "dir"})
                if recursive and depth < max_depth:
                    _walk(child, depth + 1)
            else:
                entries.append({"path": rel, "type": "file"})

    _walk(target, 1)
    return entries
