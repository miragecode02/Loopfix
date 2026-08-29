"""SQLite storage for aggregate benchmark results.

Purely a queryable history of benchmark runs across time — the
structured JSON logs (agent.task_log) remain the detailed per-task
artifact the viewer reads; this does not replace them.
"""

import sqlite3
from pathlib import Path

DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent / "loopfix.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS eval_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at REAL NOT NULL,
    finished_at REAL NOT NULL,
    model TEXT,
    task_count INTEGER NOT NULL,
    resolved_count INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS eval_task_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL REFERENCES eval_runs(id),
    task_name TEXT NOT NULL,
    resolved INTEGER NOT NULL,
    test_iterations INTEGER,
    tool_calls INTEGER,
    duration_seconds REAL,
    log_path TEXT
);
"""


def get_connection(db_path=DEFAULT_DB_PATH):
    conn = sqlite3.connect(db_path)
    conn.executescript(SCHEMA)
    return conn


def record_run(results, model, started_at, finished_at, db_path=DEFAULT_DB_PATH):
    """Persist one full benchmark run (a call to run_eval.main()).

    results is the list of per-task dicts from run_eval.run_one:
    {name, resolved, test_iterations, tool_calls, duration_seconds, log_path}.
    Returns the new eval_runs.id.
    """
    resolved_count = sum(1 for r in results if r["resolved"])

    conn = get_connection(db_path)
    try:
        with conn:
            cursor = conn.execute(
                "INSERT INTO eval_runs (started_at, finished_at, model, task_count, resolved_count) "
                "VALUES (?, ?, ?, ?, ?)",
                (started_at, finished_at, model, len(results), resolved_count),
            )
            run_id = cursor.lastrowid
            conn.executemany(
                "INSERT INTO eval_task_results "
                "(run_id, task_name, resolved, test_iterations, tool_calls, duration_seconds, log_path) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                [
                    (
                        run_id,
                        r["name"],
                        int(r["resolved"]),
                        r["test_iterations"],
                        r["tool_calls"],
                        r["duration_seconds"],
                        r["log_path"],
                    )
                    for r in results
                ],
            )
        return run_id
    finally:
        conn.close()


def list_runs(db_path=DEFAULT_DB_PATH):
    conn = get_connection(db_path)
    try:
        return conn.execute(
            "SELECT id, started_at, finished_at, model, task_count, resolved_count "
            "FROM eval_runs ORDER BY id"
        ).fetchall()
    finally:
        conn.close()
