"""run_tests tool: executes the repo's pytest suite inside the Docker sandbox.

Thin wrapper over sandbox.runner.run_tests that resolves repo_root to
an absolute path (required for the Docker bind mount) and reshapes
the result into a simple pass/fail-oriented dict for the agent.
"""

from pathlib import Path

from sandbox.runner import run_tests as _run_in_sandbox


def run_tests(repo_root, target=None, timeout=120):
    abs_repo_root = str(Path(repo_root).resolve())
    pytest_args = [target] if target else []
    result = _run_in_sandbox(abs_repo_root, pytest_args=pytest_args, timeout=timeout)
    return {
        "passed": result["returncode"] == 0 and not result["timed_out"],
        "returncode": result["returncode"],
        "timed_out": result["timed_out"],
        "duration_seconds": result["duration_seconds"],
        "output": (result["stdout"] + result["stderr"]).strip(),
    }
