"""get_diff tool: git diff of accumulated changes in a repo."""

import subprocess
from pathlib import Path


def get_diff(repo_root):
    root = Path(repo_root).resolve()
    proc = subprocess.run(["git", "diff"], cwd=root, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"git diff failed: {proc.stderr.strip()}")
    return proc.stdout
