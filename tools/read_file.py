"""read_file tool: returns a file's content, optionally a line range."""

from .paths import resolve


def read_file(repo_root, path, start_line=None, end_line=None):
    """Read a file within repo_root.

    start_line/end_line are 1-indexed and inclusive; omit either to
    default to the start/end of the file. Output is line-numbered so
    the agent can reference exact locations in later edit_file calls.
    """
    target = resolve(repo_root, path)
    if not target.is_file():
        raise FileNotFoundError(f"{path} is not a file under {repo_root}")

    lines = target.read_text(encoding="utf-8", errors="replace").splitlines()

    start = max(1, start_line or 1)
    end = min(len(lines), end_line if end_line is not None else len(lines))

    numbered = [f"{i}\t{lines[i - 1]}" for i in range(start, end + 1)]
    return {
        "path": path,
        "start_line": start,
        "end_line": end,
        "total_lines": len(lines),
        "content": "\n".join(numbered),
    }
