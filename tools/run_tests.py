"""run_tests tool: executes the repo's pytest suite inside the Docker sandbox.

Thin wrapper over sandbox.runner.run_tests that resolves repo_root to
an absolute path (required for the Docker bind mount) and reshapes
the result into a simple pass/fail-oriented dict for the agent.
"""

from pathlib import Path

from sandbox.runner import IMAGE as DEFAULT_IMAGE
from sandbox.runner import run_tests as _run_in_sandbox

# Same rationale as read_file's MAX_UNRANGED_LINES: keep a single tool
# result well under Groq's 8000-token single-request cap. The tail is
# what matters for diagnosis (pytest's failure summary is printed last).
MAX_OUTPUT_CHARS = 6000


def run_tests(repo_root, target=None, timeout=120, image=None):
    abs_repo_root = str(Path(repo_root).resolve())
    pytest_args = [target] if target else []
    result = _run_in_sandbox(
        abs_repo_root, pytest_args=pytest_args, timeout=timeout, image=image or DEFAULT_IMAGE
    )
    output = (result["stdout"] + result["stderr"]).strip()
    if len(output) > MAX_OUTPUT_CHARS:
        omitted = len(output) - MAX_OUTPUT_CHARS
        output = f"[... {omitted} earlier characters truncated ...]\n" + output[-MAX_OUTPUT_CHARS:]
    return {
        "passed": result["returncode"] == 0 and not result["timed_out"],
        "returncode": result["returncode"],
        "timed_out": result["timed_out"],
        "duration_seconds": result["duration_seconds"],
        "output": output,
    }
