"""Runs the investigation-only agent loop against the toy_repo_broken*
scenarios and prints the report, so results can be checked by hand
against each scenario's ground truth before write capability is added.

Usage:
    python scripts/run_investigation.py <repo_dir_name>

<repo_dir_name> is a directory under sandbox/ (e.g. toy_repo_broken)
with a sibling <repo_dir_name>.failure.txt containing the captured
pytest output. Only the part before "Ground truth root cause:" is
shown to the agent — the rest is kept out of the prompt entirely so
this is a real test, not a leak of the answer.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agent.loop import investigate  # noqa: E402

SANDBOX_DIR = Path(__file__).resolve().parent.parent / "sandbox"

TASK_TEMPLATE = """Tests are failing in this repo after a dependency/library version bump.

Failing pytest output:
{pytest_output}

Investigate and identify the root cause."""


def load_pytest_output(failure_file):
    text = failure_file.read_text(encoding="utf-8")
    return text.split("Ground truth root cause:")[0].strip()


def main():
    if len(sys.argv) != 2:
        print(f"usage: {sys.argv[0]} <repo_dir_name>")
        sys.exit(1)

    repo_name = sys.argv[1]
    repo_root = SANDBOX_DIR / repo_name
    failure_file = SANDBOX_DIR / f"{repo_name}.failure.txt"

    pytest_output = load_pytest_output(failure_file)
    task_description = TASK_TEMPLATE.format(pytest_output=pytest_output)

    result = investigate(str(repo_root), task_description)

    print("=== REPORT ===")
    print(result["report"])
    print()
    print(f"=== CALL LOG ({len(result['call_log'])} tool calls) ===")
    for entry in result["call_log"]:
        print(f"- {entry['tool']}({entry['input']}) reason={entry['reason']!r}")


if __name__ == "__main__":
    main()
