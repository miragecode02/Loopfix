"""Tests for the eval-harness infrastructure: SQLite storage
(agent.eval_db), the JSON task log (agent.task_log), and the
shared driver helpers (agent.eval_common).
"""

import subprocess
from pathlib import Path

from agent import eval_common, eval_db, task_log

FIXTURE_DIR = Path(__file__).resolve().parent.parent / "sandbox" / "toy_repo_broken"


# -- eval_db -----------------------------------------------------------------

def test_record_run_and_list_runs_round_trip(tmp_path):
    db_path = tmp_path / "eval.db"
    results = [
        {"name": "task_a", "resolved": True, "test_iterations": 1,
         "tool_calls": 5, "duration_seconds": 12.3, "log_path": "a.json"},
        {"name": "task_b", "resolved": False, "test_iterations": None,
         "tool_calls": 0, "duration_seconds": 1.0, "log_path": "b.json"},
    ]

    run_id = eval_db.record_run(results, model="test-model", started_at=100.0,
                                 finished_at=200.0, db_path=db_path)

    runs = eval_db.list_runs(db_path=db_path)
    assert len(runs) == 1
    assert runs[0][0] == run_id
    assert runs[0][3] == "test-model"
    assert runs[0][4] == 2  # task_count
    assert runs[0][5] == 1  # resolved_count


def test_record_run_persists_per_task_rows(tmp_path):
    db_path = tmp_path / "eval.db"
    results = [
        {"name": "only_task", "resolved": True, "test_iterations": 2,
         "tool_calls": 7, "duration_seconds": 5.5, "log_path": "x.json"},
    ]

    run_id = eval_db.record_run(results, model="m", started_at=0.0,
                                 finished_at=1.0, db_path=db_path)

    conn = eval_db.get_connection(db_path=db_path)
    try:
        row = conn.execute(
            "SELECT run_id, task_name, resolved, test_iterations, tool_calls "
            "FROM eval_task_results WHERE run_id = ?", (run_id,),
        ).fetchone()
    finally:
        conn.close()
    assert row == (run_id, "only_task", 1, 2, 7)


# -- eval_common ---------------------------------------------------------

def test_load_pytest_output_strips_ground_truth(tmp_path):
    failure_file = tmp_path / "task.failure.txt"
    failure_file.write_text(
        "FAILED test_foo.py::test_bar\nTypeError: bad arg\n"
        "Ground truth root cause:\nThis should never reach the prompt.",
        encoding="utf-8",
    )

    output = eval_common.load_pytest_output(failure_file)

    assert "TypeError: bad arg" in output
    assert "should never reach the prompt" not in output


def test_make_git_workspace_creates_isolated_commit(tmp_path):
    workspaces_dir = tmp_path / "workspaces"

    workspace = eval_common.make_git_workspace(FIXTURE_DIR, workspaces_dir, "mytask")

    assert workspace.exists()
    assert (workspace / ".git").is_dir()
    assert (workspace / ".gitignore").read_text(encoding="utf-8") == "__pycache__/\n*.pyc\n.pytest_cache/\n"
    status = subprocess.run(
        ["git", "status", "--porcelain"], cwd=workspace, capture_output=True, text=True, check=True,
    )
    assert status.stdout.strip() == ""  # everything committed, working tree clean

    # The tracked fixture itself must never be mutated.
    assert not (FIXTURE_DIR / ".gitignore").exists()


# -- task_log -----------------------------------------------------------

def test_build_log_shapes_result_into_log_dict():
    result = {
        "model": "test-model",
        "resolved": True,
        "test_iterations": 1,
        "report": "STATUS: resolved",
        "call_log": [{"tool": "run_tests", "output": {"passed": True}}],
    }

    log = task_log.build_log(
        mode="fix",
        repo_root="/some/repo",
        task_description="fix the thing",
        result=result,
        max_iterations=5,
        started_at=100.0,
        finished_at=112.5,
        task_id="fixed-id",
        extra={"diff": "+ x = 1"},
    )

    assert log["task_id"] == "fixed-id"
    assert log["mode"] == "fix"
    assert log["duration_seconds"] == 12.5
    assert log["resolved"] is True
    assert log["call_log"] == result["call_log"]
    assert log["diff"] == "+ x = 1"


def test_save_log_writes_json_named_by_task_id(tmp_path):
    log = {"task_id": "abc123", "mode": "fix", "call_log": []}

    path = task_log.save_log(log, log_dir=tmp_path)

    assert path == tmp_path / "abc123.json"
    assert path.read_text(encoding="utf-8").startswith("{")
    assert '"task_id": "abc123"' in path.read_text(encoding="utf-8")
