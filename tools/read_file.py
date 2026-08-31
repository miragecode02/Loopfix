"""read_file tool: returns a file's content, optionally a line range."""

from .paths import resolve

# Groq's free-tier on-demand rate limit caps a single request at 8000
# tokens total across the whole conversation history, so an unbounded
# whole-file read can blow the budget on its own. Cap unranged reads and
# tell the agent to request a narrower range for anything past this.
MAX_UNRANGED_LINES = 300


def read_file(repo_root, path, start_line=None, end_line=None):
    """Read a file within repo_root.

    start_line/end_line are 1-indexed and inclusive; omit either to
    default to the start/end of the file (capped at MAX_UNRANGED_LINES
    when no range is given, to keep a single read bounded). Output is
    line-numbered so the agent can reference exact locations in later
    edit_file calls.
    """
    target = resolve(repo_root, path)
    if not target.is_file():
        raise FileNotFoundError(f"{path} is not a file under {repo_root}")

    lines = target.read_text(encoding="utf-8", errors="replace").splitlines()

    start = max(1, start_line or 1)
    if end_line is not None:
        end = min(len(lines), end_line)
    elif start_line is None and len(lines) > MAX_UNRANGED_LINES:
        end = MAX_UNRANGED_LINES
    else:
        end = len(lines)

    numbered = [f"{i}\t{lines[i - 1]}" for i in range(start, end + 1)]
    result = {
        "path": path,
        "start_line": start,
        "end_line": end,
        "total_lines": len(lines),
        "content": "\n".join(numbered),
    }
    if end < len(lines):
        result["note"] = (
            f"Output truncated to lines {start}-{end} of {len(lines)}. "
            "Pass start_line/end_line to read the rest."
        )
    return result
