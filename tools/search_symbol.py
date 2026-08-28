"""search_symbol tool: look up function/class definitions by name."""

from pathlib import Path

from .symbol_index import build_symbol_index, load_index, save_index


def search_symbol(repo_root, name, index_path=None, case_sensitive=False, rebuild=False):
    """Find function/class/method definitions matching name.

    Matches against both the bare name and the qualified name (e.g.
    a method matches either "run" or "Runner.run"). If index_path is
    given, the index is cached there and reused unless rebuild=True or
    the cache doesn't exist yet.
    """
    if index_path and Path(index_path).exists() and not rebuild:
        symbols = load_index(index_path)
    else:
        symbols = build_symbol_index(repo_root)
        if index_path:
            save_index(symbols, index_path)

    if case_sensitive:
        return [s for s in symbols if name in (s["name"], s["qualname"])]

    needle = name.lower()
    return [
        s for s in symbols
        if needle in (s["name"].lower(), s["qualname"].lower())
    ]
