"""Runs the bounded fix/debug loop against a toy_repo_broken* scenario,
in an isolated, throwaway git workspace (never mutates the tracked
fixture directly).

Usage:
    python scripts/run_fix.py <repo_dir_name>

<repo_dir_name> is a directory under sandbox/ (e.g. toy_repo_broken)
with a sibling <repo_dir_name>.failure.txt containing the captured
pytest output (ground truth stripped before it reaches the agent).
"""

import shutil
import subprocess
import sys
import time
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agent.loop import MAX_FIX_ITERATIONS, fix  # noqa: E402
from agent.task_log import build_log, save_log  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SANDBOX_DIR = ROOT / "sandbox"
WORKSPACES_DIR = ROOT / "workspaces"

TASK_TEMPLATE = """Tests are failing in this repo after a dependency/library version bump.

Failing pytest output:
{pytest_output}

Find the root cause and fix it so the tests pass."""


def load_pytest_output(failure_file):
    text = failure_file.read_text(encoding="utf-8")
    return text.split("Ground truth root cause:")[0].strip()


def make_git_workspace(repo_name):
    src = SANDBOX_DIR / repo_name
    dest = WORKSPACES_DIR / f"{repo_name}-{uuid.uuid4().hex[:8]}"
    shutil.copytree(src, dest)

    # Real cloned repos almost always ignore __pycache__; these toy
    # fixtures don't have a .gitignore, so running pytest inside the
    # sandbox would otherwise show up as diff noise (a tracked .pyc).
    (dest / ".gitignore").write_text("__pycache__/\n*.pyc\n.pytest_cache/\n", encoding="utf-8")

    def _git(args):
        subprocess.run(["git", *args], cwd=dest, capture_output=True, text=True, check=True)

    _git(["init", "-q"])
    _git(["add", "-A"])
    _git(["-c", "user.email=loopfix@example.com", "-c", "user.name=Loopfix", "commit", "-q", "-m", "initial broken state"])
    return dest


def main():
    if len(sys.argv) != 2:
        print(f"usage: {sys.argv[0]} <repo_dir_name>")
        sys.exit(1)

    repo_name = sys.argv[1]
    failure_file = SANDBOX_DIR / f"{repo_name}.failure.txt"
    pytest_output = load_pytest_output(failure_file)
    task_description = TASK_TEMPLATE.format(pytest_output=pytest_output)

    workspace = make_git_workspace(repo_name)
    print(f"workspace: {workspace}")

    started_at = time.time()
    result = fix(str(workspace), task_description)
    finished_at = time.time()

    diff_proc = subprocess.run(["git", "diff"], cwd=workspace, capture_output=True, text=True)

    log = build_log(
        mode="fix",
        repo_root=str(workspace),
        task_description=task_description,
        result=result,
        max_iterations=MAX_FIX_ITERATIONS,
        started_at=started_at,
        finished_at=finished_at,
        extra={"diff": diff_proc.stdout},
    )
    log_path = save_log(log)

    print(f"\n=== RESOLVED: {result['resolved']} (test_iterations={result['test_iterations']}) ===")
    print("\n=== REPORT ===")
    print(result["report"])
    print(f"\n=== CALL LOG ({len(result['call_log'])} tool calls) ===")
    for entry in result["call_log"]:
        print(f"- {entry['tool']}(reason={entry['reason']!r})")
        if entry["tool"] in ("edit_file", "create_file"):
            print(f"    input={entry['input']}")
        if entry["tool"] == "run_tests":
            output = entry["output"]
            if isinstance(output, dict):
                print(f"    passed={output.get('passed')} returncode={output.get('returncode')}")

    print("\n=== FINAL DIFF ===")
    print(diff_proc.stdout or "(no changes)")
    print(f"\nlog saved to {log_path}")


if __name__ == "__main__":
    main()
