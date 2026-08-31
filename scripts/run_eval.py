"""Runs the bounded fix/debug loop against every task in the real-repo
benchmark (sandbox/benchmark/*/), each in its own throwaway git
workspace, and reports honest aggregate pass/fail numbers.

No retries, no cherry-picking: every task discovered under
sandbox/benchmark/ runs and is reported, success or failure.

Usage:
    python scripts/run_eval.py
"""

import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agent.eval_common import TASK_TEMPLATE, load_pytest_output, make_git_workspace  # noqa: E402
from agent.eval_db import record_run  # noqa: E402
from agent.loop import MAX_FIX_ITERATIONS, fix  # noqa: E402
from agent.task_log import build_log, save_log  # noqa: E402
from sandbox.runner import build_task_image  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
BENCHMARK_DIR = ROOT / "sandbox" / "benchmark"
WORKSPACES_DIR = ROOT / "workspaces"

# Groq's free-tier TPM budget is shared across the whole run, not
# per-task, so back-to-back tasks can exhaust it even with per-call
# retries. A cooldown between tasks lets the per-minute window recover.
TASK_COOLDOWN_SECONDS = 20


def discover_tasks():
    """Find every (name, task_dir, failure_file) under sandbox/benchmark/."""
    tasks = []
    for failure_file in sorted(BENCHMARK_DIR.glob("*.failure.txt")):
        name = failure_file.name[: -len(".failure.txt")]
        task_dir = BENCHMARK_DIR / name
        if task_dir.is_dir():
            tasks.append((name, task_dir, failure_file))
    return tasks


def run_one(name, task_dir, failure_file):
    pytest_output = load_pytest_output(failure_file)
    task_description = TASK_TEMPLATE.format(pytest_output=pytest_output)

    workspace = make_git_workspace(task_dir, WORKSPACES_DIR, name)

    requirements_file = task_dir / "requirements.txt"
    image = build_task_image(task_dir) if requirements_file.exists() else None

    started_at = time.time()
    try:
        result = fix(str(workspace), task_description, image=image)
        error = None
    except Exception as e:
        # A crash (e.g. an API/rate-limit error) is a real outcome for
        # this task, not a reason to abort the whole benchmark run -
        # every discovered task must still get a row and a log.
        result = {"model": None, "resolved": False, "test_iterations": None,
                   "report": f"ERROR: {e}", "call_log": []}
        error = str(e)
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
        task_id=f"eval-{name}-{int(started_at)}",
        extra={"diff": diff_proc.stdout, "benchmark_task": name, "error": error},
    )
    log_path = save_log(log)

    return {
        "name": name,
        "resolved": bool(result["resolved"]),
        "test_iterations": result["test_iterations"],
        "tool_calls": len(result["call_log"]),
        "duration_seconds": round(finished_at - started_at, 2),
        "log_path": str(log_path),
        "model": result["model"],
        "error": error,
    }


def print_summary(results):
    total = len(results)
    resolved_count = sum(1 for r in results if r["resolved"])
    error_count = sum(1 for r in results if r.get("error"))
    completed = [r for r in results if not r.get("error")]

    print("\n=== BENCHMARK SUMMARY ===")
    print(f"Resolved: {resolved_count}/{total} ({100 * resolved_count / total:.0f}%)")
    if error_count:
        print(f"Errored (harness/API failure, not a fix attempt): {error_count}/{total}")
    if completed:
        avg_iterations = sum(r["test_iterations"] for r in completed) / len(completed)
        avg_tool_calls = sum(r["tool_calls"] for r in completed) / len(completed)
        avg_duration = sum(r["duration_seconds"] for r in completed) / len(completed)
        print(f"Avg run_tests iterations (completed tasks only): {avg_iterations:.2f}")
        print(f"Avg tool calls (completed tasks only): {avg_tool_calls:.2f}")
        print(f"Avg duration (completed tasks only): {avg_duration:.1f}s")
    for r in results:
        if r.get("error"):
            print(f"  [ERROR] {r['name']} - {r['error']}")
        else:
            mark = "PASS" if r["resolved"] else "FAIL"
            print(f"  [{mark}] {r['name']} "
                  f"(iterations={r['test_iterations']}, tool_calls={r['tool_calls']}, "
                  f"{r['duration_seconds']}s)")


def main():
    tasks = discover_tasks()
    if not tasks:
        print(f"No benchmark tasks found under {BENCHMARK_DIR}")
        sys.exit(1)

    print(f"Running {len(tasks)} benchmark task(s)...\n")
    run_started_at = time.time()
    results = []
    for i, (name, task_dir, failure_file) in enumerate(tasks):
        print(f"--- {name} ---")
        outcome = run_one(name, task_dir, failure_file)
        results.append(outcome)
        if outcome.get("error"):
            print(f"ERROR: {outcome['error']}")
        else:
            status = "RESOLVED" if outcome["resolved"] else "UNRESOLVED"
            print(
                f"{status} in {outcome['test_iterations']} run_tests attempt(s), "
                f"{outcome['tool_calls']} tool calls, {outcome['duration_seconds']}s"
            )
        print(f"log: {outcome['log_path']}\n")
        if i < len(tasks) - 1:
            time.sleep(TASK_COOLDOWN_SECONDS)
    run_finished_at = time.time()

    print_summary(results)

    run_id = record_run(
        results,
        model=results[0]["model"] if results else None,
        started_at=run_started_at,
        finished_at=run_finished_at,
    )
    print(f"\nBenchmark run recorded in loopfix.db (eval_runs.id={run_id})")

    return results


if __name__ == "__main__":
    main()
