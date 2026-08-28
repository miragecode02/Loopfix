"""search_text tool: ripgrep wrapper over a repo."""

import json
import shutil
import subprocess
from pathlib import Path


class RipgrepNotFoundError(RuntimeError):
    pass


def search_text(repo_root, query, glob=None, max_results=50, case_sensitive=False):
    """Search repo_root for query using ripgrep, returning structured matches.

    Respects .gitignore by default (ripgrep's normal behavior) and
    always skips the .git directory itself. Returns at most
    max_results matches as {path, line, text}.
    """
    if shutil.which("rg") is None:
        raise RipgrepNotFoundError("ripgrep (rg) is not installed or not on PATH")

    root = Path(repo_root).resolve()

    cmd = ["rg", "--json", "--max-count", str(max_results), "--no-heading"]
    if not case_sensitive:
        cmd.append("--ignore-case")
    if glob:
        cmd.extend(["--glob", glob])
    cmd.append(query)

    proc = subprocess.run(cmd, cwd=root, capture_output=True, text=True)

    # rg exit code 1 means "no matches", not a failure.
    if proc.returncode not in (0, 1):
        raise RuntimeError(f"ripgrep failed: {proc.stderr.strip()}")

    matches = []
    for line in proc.stdout.splitlines():
        if not line.strip():
            continue
        event = json.loads(line)
        if event.get("type") != "match":
            continue
        data = event["data"]
        matches.append({
            "path": data["path"]["text"],
            "line": data["line_number"],
            "text": data["lines"]["text"].rstrip("\n"),
        })
        if len(matches) >= max_results:
            break

    return matches
