"""Tests for the read-only FastAPI viewer API (webapp/backend/main.py).

Builds a throwaway loopfix.db + logs dir with agent.eval_db /
agent.task_log (the same modules the real eval harness uses), points the
API at them via monkeypatch, and drives it through FastAPI's TestClient.
Never touches the real loopfix.db.
"""

import json

import pytest
from fastapi.testclient import TestClient

from agent import eval_db
from webapp.backend import main


@pytest.fixture
def client(tmp_path, monkeypatch):
    db_path = tmp_path / "loopfix.db"
    logs_dir = tmp_path / "logs"
    logs_dir.mkdir()

    resolved_log = {"task_id": "eval-resolved_task-1", "mode": "fix", "call_log": []}
    (logs_dir / "eval-resolved_task-1.json").write_text(json.dumps(resolved_log), encoding="utf-8")

    errored_log = {"task_id": "eval-errored_task-2", "mode": "fix", "call_log": [], "error": "boom"}
    (logs_dir / "eval-errored_task-2.json").write_text(json.dumps(errored_log), encoding="utf-8")

    results = [
        {"name": "resolved_task", "resolved": True, "test_iterations": 1,
         "tool_calls": 3, "duration_seconds": 5.0, "log_path": str(logs_dir / "eval-resolved_task-1.json")},
        {"name": "errored_task", "resolved": False, "test_iterations": None,
         "tool_calls": 0, "duration_seconds": 1.0, "log_path": str(logs_dir / "eval-errored_task-2.json")},
    ]
    run_id = eval_db.record_run(results, model="test-model", started_at=100.0,
                                 finished_at=200.0, db_path=db_path)

    monkeypatch.setattr(main, "DB_PATH", db_path)
    monkeypatch.setattr(main, "LOGS_DIR", logs_dir)

    with TestClient(main.app) as test_client:
        yield test_client, run_id


def test_list_runs_reports_resolved_and_errored_counts(client):
    test_client, run_id = client

    response = test_client.get("/api/runs")

    assert response.status_code == 200
    [run] = response.json()
    assert run["id"] == run_id
    assert run["task_count"] == 2
    assert run["resolved_count"] == 1
    assert run["errored_count"] == 1
    assert run["unresolved_count"] == 0


def test_get_run_includes_per_task_error_detail(client):
    test_client, run_id = client

    response = test_client.get(f"/api/runs/{run_id}")

    assert response.status_code == 200
    body = response.json()
    tasks_by_name = {t["task_name"]: t for t in body["tasks"]}
    assert tasks_by_name["resolved_task"]["error"] is None
    assert tasks_by_name["errored_task"]["error"] == "boom"


def test_get_run_404s_for_unknown_run(client):
    test_client, _ = client

    response = test_client.get("/api/runs/999999")

    assert response.status_code == 404


def test_get_log_returns_log_json(client):
    test_client, _ = client

    response = test_client.get("/api/logs/eval-resolved_task-1")

    assert response.status_code == 200
    assert response.json()["task_id"] == "eval-resolved_task-1"


def test_get_log_rejects_path_traversal(client):
    test_client, _ = client

    response = test_client.get("/api/logs/..%2F..%2Fsecret")

    assert response.status_code == 404


def test_get_log_404s_for_missing_log(client):
    test_client, _ = client

    response = test_client.get("/api/logs/does-not-exist")

    assert response.status_code == 404
