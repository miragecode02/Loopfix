"""Builds a JSON-serializable symbol index (function/class -> file + lines).

Python-only MVP, so this uses the stdlib `ast` module rather than
ctags or regex — it's already exact for Python and needs no external
dependency, which regex/ctags would trade accuracy for.
"""

import ast
import json
from pathlib import Path

from .list_directory import EXCLUDED_DIRS


class _SymbolVisitor(ast.NodeVisitor):
    def __init__(self, file_rel_path):
        self.file_rel_path = file_rel_path
        self.symbols = []
        self._class_stack = []

    def visit_ClassDef(self, node):
        self.symbols.append(self._entry(node, "class", node.name))
        self._class_stack.append(node.name)
        self.generic_visit(node)
        self._class_stack.pop()

    def visit_FunctionDef(self, node):
        self._record_function(node)

    def visit_AsyncFunctionDef(self, node):
        self._record_function(node)

    def _record_function(self, node):
        # Intentionally not descending into a function body, so closures
        # and locally-defined helpers don't clutter the index — MVP scope
        # is module/class-level symbols only.
        kind = "method" if self._class_stack else "function"
        qualname = ".".join(self._class_stack + [node.name])
        self.symbols.append(self._entry(node, kind, qualname))

    def _entry(self, node, kind, qualname):
        return {
            "name": node.name,
            "qualname": qualname,
            "kind": kind,
            "file": self.file_rel_path,
            "line_start": node.lineno,
            "line_end": getattr(node, "end_lineno", node.lineno),
        }


def build_symbol_index(repo_root):
    root = Path(repo_root).resolve()
    symbols = []
    for py_file in root.rglob("*.py"):
        rel_parts = py_file.relative_to(root).parts
        if any(part in EXCLUDED_DIRS for part in rel_parts):
            continue
        rel = py_file.relative_to(root).as_posix()
        try:
            source = py_file.read_text(encoding="utf-8", errors="replace")
            tree = ast.parse(source, filename=rel)
        except SyntaxError:
            continue
        visitor = _SymbolVisitor(rel)
        visitor.visit(tree)
        symbols.extend(visitor.symbols)
    return symbols


def save_index(symbols, index_path):
    Path(index_path).write_text(json.dumps(symbols, indent=2), encoding="utf-8")


def load_index(index_path):
    return json.loads(Path(index_path).read_text(encoding="utf-8"))
