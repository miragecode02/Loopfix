"""Shared helpers for the single-task (scripts/run_fix.py) and
full-benchmark (scripts/run_eval.py) drivers: turning a captured
failure.txt into a task prompt, and building a throwaway git
workspace from a sandbox fixture so run_tests/get_diff have a real
repo to work with without ever mutating the tracked fixture.
"""

import shutil
import subprocess
import uuid
from pathlib import Path

TASK_TEMPLATE = """Tests are failing in this repo after a dependency/library version bump.

Failing pytest output:
{pytest_output}

Find the root cause and fix it so the tests pass."""


def load_pytest_output(failure_file):
    text = Path(failure_file).read_text(encoding="utf-8")
    return text.split("Ground truth root cause:")[0].strip()


def make_git_workspace(src_dir, workspaces_dir, label):
    """Copy src_dir into a fresh throwaway git repo under workspaces_dir.

    Never mutates src_dir. Returns the new workspace path.
    """
    src_dir = Path(src_dir)
    workspaces_dir = Path(workspaces_dir)
    dest = workspaces_dir / f"{label}-{uuid.uuid4().hex[:8]}"
    shutil.copytree(src_dir, dest)

    # Real cloned repos almost always ignore __pycache__; these
    # fixtures don't all ship a .gitignore, so running pytest inside
    # the sandbox would otherwise show up as diff noise (a tracked
    # .pyc).
    (dest / ".gitignore").write_text(
        "__pycache__/\n*.pyc\n.pytest_cache/\n", encoding="utf-8"
    )

    def _git(args):
        subprocess.run(
            ["git", *args], cwd=dest, capture_output=True, text=True, check=True
        )

    _git(["init", "-q"])
    _git(["add", "-A"])
    _git(
        [
            "-c", "user.email=loopfix@example.com",
            "-c", "user.name=Loopfix",
            "commit", "-q", "-m", "initial broken state",
        ]
    )
    return dest
