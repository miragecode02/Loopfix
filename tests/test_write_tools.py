"""Tests for the write and test-execution tools.

test_run_tests_* actually invoke the Docker sandbox (real container
runs, not mocked) against the toy repos.
"""

import subprocess
from pathlib import Path

import pytest

from tools.create_file import FileAlreadyExistsError, create_file
from tools.edit_file import EditNotFoundError, EditNotUniqueError, edit_file
from tools.get_diff import get_diff
from tools.run_tests import run_tests

TOY_REPO = Path(__file__).resolve().parent.parent / "sandbox" / "toy_repo"
TOY_REPO_BROKEN = Path(__file__).resolve().parent.parent / "sandbox" / "toy_repo_broken"


# -- edit_file --------------------------------------------------------------

def test_edit_file_replaces_unique_match(tmp_path):
    (tmp_path / "mod.py").write_text("def add(a, b):\n    return a + b\n")

    edit_file(tmp_path, "mod.py", "return a + b", "return a - b")

    assert (tmp_path / "mod.py").read_text() == "def add(a, b):\n    return a - b\n"


def test_edit_file_raises_when_old_str_missing(tmp_path):
    (tmp_path / "mod.py").write_text("x = 1\n")
    with pytest.raises(EditNotFoundError):
        edit_file(tmp_path, "mod.py", "not_present", "y = 2")


def test_edit_file_raises_when_old_str_not_unique(tmp_path):
    (tmp_path / "mod.py").write_text("x = 1\nx = 1\n")
    with pytest.raises(EditNotUniqueError):
        edit_file(tmp_path, "mod.py", "x = 1", "x = 2")


# -- create_file --------------------------------------------------------------

def test_create_file_writes_new_file(tmp_path):
    create_file(tmp_path, "pkg/new_mod.py", "x = 1\n")
    assert (tmp_path / "pkg" / "new_mod.py").read_text() == "x = 1\n"


def test_create_file_refuses_to_overwrite(tmp_path):
    (tmp_path / "existing.py").write_text("x = 1\n")
    with pytest.raises(FileAlreadyExistsError):
        create_file(tmp_path, "existing.py", "x = 2\n")


# -- get_diff --------------------------------------------------------------

def _git(args, cwd):
    subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True, check=True)


def test_get_diff_shows_uncommitted_change(tmp_path):
    (tmp_path / "mod.py").write_text("x = 1\n")
    _git(["init"], tmp_path)
    _git(["add", "-A"], tmp_path)
    _git(["-c", "user.email=t@example.com", "-c", "user.name=t", "commit", "-m", "init"], tmp_path)

    (tmp_path / "mod.py").write_text("x = 2\n")

    diff = get_diff(tmp_path)
    assert "-x = 1" in diff
    assert "+x = 2" in diff


# -- run_tests (real Docker sandbox) --------------------------------------

def test_run_tests_passes_on_healthy_repo():
    result = run_tests(TOY_REPO, target="test_mathutils.py")
    assert result["passed"] is True
    assert result["returncode"] == 0


def test_run_tests_fails_on_broken_repo():
    result = run_tests(TOY_REPO_BROKEN)
    assert result["passed"] is False
    assert "TypeError" in result["output"]
