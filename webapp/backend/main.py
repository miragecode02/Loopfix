"""Read-only API over loopfix.db and logs/*.json for the web viewer.

Never writes to the database or the log files - this is purely a
presentation layer over data the eval harness (scripts/run_eval.py)
already produced.
"""

import json
import os
import sqlite3
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

ROOT = Path(__file__).resolve().parent.parent.parent
DB_PATH = ROOT / "loopfix.db"
LOGS_DIR = ROOT / "logs"

app = FastAPI(title="Loopfix Viewer API")

# Same-origin deployments (the Vercel setup below serves the frontend and this
# API from one domain) don't need CORS at all, but local dev runs the Vite
# server on a different port, and ALLOWED_ORIGINS lets a split deployment
# (frontend and API on different domains) opt in explicitly.
_default_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
_extra_origins = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_default_origins + _extra_origins,
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
    # log_path is the absolute path the harness recorded at run time, which
    # won't resolve on a different machine (or deployment) than the one that
    # produced it. The log filename stem is portable, so re-resolve it
    # against this process's LOGS_DIR instead of trusting the stored path.
    # These paths were recorded on Windows (backslash-separated); pathlib on
    # a POSIX runtime doesn't treat "\" as a separator, so normalize first.
    log_id = Path(log_path.replace("\\", "/")).stem if log_path else None
    task["log_id"] = log_id
    task["error"] = None
    resolved_path = LOGS_DIR / f"{log_id}.json" if log_id else None
    if resolved_path and resolved_path.is_file():
        try:
            log = json.loads(resolved_path.read_text(encoding="utf-8"))
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
