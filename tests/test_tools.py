"""Tests for the host-side read-only tools against sandbox/toy_repo."""

from pathlib import Path

import pytest

from tools.list_directory import list_directory
from tools.paths import PathEscapesRepoError, resolve
from tools.read_file import read_file
from tools.search_symbol import search_symbol
from tools.search_text import search_text
from tools.symbol_index import build_symbol_index

TOY_REPO = Path(__file__).resolve().parent.parent / "sandbox" / "toy_repo"


# -- paths --------------------------------------------------------------

def test_resolve_allows_paths_inside_repo():
    resolve(TOY_REPO, "mathutils.py")


def test_resolve_blocks_paths_outside_repo():
    with pytest.raises(PathEscapesRepoError):
        resolve(TOY_REPO, "../../Windows/System32")


# -- read_file ------------------------------------------------------------

def test_read_file_whole_file():
    result = read_file(TOY_REPO, "mathutils.py")
    assert result["total_lines"] == 6
    assert "def add(a, b):" in result["content"]
    assert result["content"].startswith("1\t")


def test_read_file_line_range():
    result = read_file(TOY_REPO, "mathutils.py", start_line=5, end_line=6)
    assert result["start_line"] == 5
    assert result["end_line"] == 6
    assert "def divide" in result["content"]
    assert "def add" not in result["content"]


def test_read_file_missing_file_raises():
    with pytest.raises(FileNotFoundError):
        read_file(TOY_REPO, "does_not_exist.py")


# -- list_directory -------------------------------------------------------

def test_list_directory_lists_expected_files():
    entries = list_directory(TOY_REPO)
    paths = {e["path"] for e in entries}
    assert paths == {
        "mathutils.py",
        "test_hang.py",
        "test_mathutils.py",
        "test_network.py",
    }
    assert all(e["type"] == "file" for e in entries)


def test_list_directory_recursive_excludes_pycache(tmp_path):
    (tmp_path / "pkg").mkdir()
    (tmp_path / "pkg" / "mod.py").write_text("x = 1\n")
    (tmp_path / "pkg" / "__pycache__").mkdir()
    (tmp_path / "pkg" / "__pycache__" / "mod.cpython-311.pyc").write_bytes(b"")

    entries = list_directory(tmp_path, recursive=True)
    paths = {e["path"] for e in entries}
    assert "pkg/mod.py" in paths
    assert not any("__pycache__" in p for p in paths)


# -- search_text ------------------------------------------------------------

def test_search_text_finds_matches():
    matches = search_text(TOY_REPO, "def divide")
    assert len(matches) == 1
    assert matches[0]["path"] == "mathutils.py"
    assert matches[0]["line"] == 5


def test_search_text_no_matches_returns_empty_list():
    matches = search_text(TOY_REPO, "definitely_not_in_this_repo_xyz")
    assert matches == []


def test_search_text_glob_filter():
    matches = search_text(TOY_REPO, "def ", glob="test_hang.py")
    assert {m["path"] for m in matches} == {"test_hang.py"}


# -- symbol index / search_symbol --------------------------------------

def test_build_symbol_index_finds_functions():
    symbols = build_symbol_index(TOY_REPO)
    names = {s["name"] for s in symbols}
    assert {"add", "divide", "test_add", "test_divide"} <= names


def test_search_symbol_matches_by_name():
    matches = search_symbol(TOY_REPO, "divide")
    assert len(matches) == 1
    assert matches[0]["file"] == "mathutils.py"
    assert matches[0]["line_start"] == 5


def test_search_symbol_caches_to_index_path(tmp_path):
    index_path = tmp_path / "index.json"
    assert not index_path.exists()

    first = search_symbol(TOY_REPO, "add", index_path=index_path)
    assert index_path.exists()

    second = search_symbol(TOY_REPO, "add", index_path=index_path)
    assert first == second
