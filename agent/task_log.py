"""Structured JSON execution log: one record per task run.

Persists only the call log (tool/input/reason/output, one entry per
decision -> tool call -> result) plus run metadata and the final
report — never the raw message history, so no chain-of-thought ever
reaches a saved log or the viewer built on top of it.
"""

import json
import time
import uuid
from pathlib import Path

DEFAULT_LOG_DIR = Path(__file__).resolve().parent.parent / "logs"


def build_log(mode, repo_root, task_description, result, max_iterations, started_at, finished_at, task_id=None, extra=None):
    """Build a JSON-serializable log dict from an investigate()/fix() result."""
    log = {
        "task_id": task_id or uuid.uuid4().hex[:12],
        "mode": mode,  # "investigate" | "fix"
        "repo_root": str(repo_root),
        "task_description": task_description,
        "model": result["model"],  # the model the loop actually resolved and used
        "max_iterations": max_iterations,
        "started_at": started_at,
        "finished_at": finished_at,
        "duration_seconds": round(finished_at - started_at, 2),
        "resolved": result.get("resolved"),  # None for investigate mode
        "test_iterations": result.get("test_iterations"),  # None for investigate mode
        "report": result["report"],
        "call_log": result["call_log"],
    }
    if extra:
        log.update(extra)
    return log


def save_log(log, log_dir=DEFAULT_LOG_DIR):
    log_dir = Path(log_dir)
    log_dir.mkdir(parents=True, exist_ok=True)
    path = log_dir / f"{log['task_id']}.json"
    path.write_text(json.dumps(log, indent=2, default=str), encoding="utf-8")
    return path


def run_and_log(fn, mode, repo_root, task_description, model=None, max_iterations=None, log_dir=DEFAULT_LOG_DIR, extra=None, **kwargs):
    """Call fn(repo_root, task_description, ...), time it, and save the log.

    fn is agent.loop.investigate or agent.loop.fix. extra, if given, is
    merged into the saved log as-is (e.g. {"diff": ...} for fix runs).
    Returns (result, log_path).
    """
    started_at = time.time()
    result = fn(repo_root, task_description, model=model, **kwargs)
    finished_at = time.time()

    log = build_log(
        mode=mode,
        repo_root=repo_root,
        task_description=task_description,
        result=result,
        max_iterations=max_iterations,
        started_at=started_at,
        finished_at=finished_at,
        extra=extra,
    )
    path = save_log(log, log_dir=log_dir)
    return result, path
