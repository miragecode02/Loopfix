"""Read-only API over loopfix.db and logs/*.json for the web viewer.

Never writes to the database or the log files - this is purely a
presentation layer over data the eval harness (scripts/run_eval.py)
already produced.
"""

import json
import sqlite3
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

ROOT = Path(__file__).resolve().parent.parent.parent
DB_PATH = ROOT / "loopfix.db"
LOGS_DIR = ROOT / "logs"

app = FastAPI(title="Loopfix Viewer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


def _connect():
    conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def _task_summary(row):
    task = dict(row)
    log_path = task["log_path"]
    task["log_id"] = Path(log_path).stem if log_path else None
    task["error"] = None
    if log_path and Path(log_path).is_file():
        try:
            log = json.loads(Path(log_path).read_text(encoding="utf-8"))
            task["error"] = log.get("error")
        except (OSError, json.JSONDecodeError):
            pass
    return task


@app.get("/api/runs")
def list_runs():
    conn = _connect()
    try:
        runs = conn.execute(
            "SELECT id, started_at, finished_at, model, task_count, resolved_count "
            "FROM eval_runs ORDER BY id DESC"
        ).fetchall()
        out = []
        for run in runs:
            tasks = conn.execute(
                "SELECT id, task_name, resolved, test_iterations, tool_calls, "
                "duration_seconds, log_path FROM eval_task_results WHERE run_id = ?",
                (run["id"],),
            ).fetchall()
            errored_count = sum(1 for t in tasks if _task_summary(t)["error"])
            out.append({
                **dict(run),
                "errored_count": errored_count,
                "unresolved_count": run["task_count"] - run["resolved_count"] - errored_count,
            })
        return out
    finally:
        conn.close()


@app.get("/api/runs/{run_id}")
def get_run(run_id: int):
    conn = _connect()
    try:
        run = conn.execute(
            "SELECT id, started_at, finished_at, model, task_count, resolved_count "
            "FROM eval_runs WHERE id = ?",
            (run_id,),
        ).fetchone()
        if run is None:
            raise HTTPException(status_code=404, detail="run not found")
        tasks = conn.execute(
            "SELECT id, task_name, resolved, test_iterations, tool_calls, "
            "duration_seconds, log_path FROM eval_task_results "
            "WHERE run_id = ? ORDER BY id",
            (run_id,),
        ).fetchall()
        task_summaries = [_task_summary(task) for task in tasks]
        errored_count = sum(1 for task in task_summaries if task["error"])
        run_summary = {
            **dict(run),
            "errored_count": errored_count,
            "unresolved_count": run["task_count"] - run["resolved_count"] - errored_count,
        }
        return {
            "run": run_summary,
            "tasks": task_summaries,
        }
    finally:
        conn.close()


@app.get("/api/logs/{log_id}")
def get_log(log_id: str):
    # log_id is a task_id (e.g. "eval-flask_jwt_token_decode-1788454987"), which
    # is always the filename stem - reject anything that isn't exactly that to
    # rule out path traversal.
    path = LOGS_DIR / f"{log_id}.json"
    if path.parent.resolve() != LOGS_DIR.resolve() or not path.is_file():
        raise HTTPException(status_code=404, detail="log not found")
    return json.loads(path.read_text(encoding="utf-8"))
