"""edit_file tool: targeted find-and-replace edits, never full-file rewrites."""

from .paths import resolve


class EditNotFoundError(ValueError):
    pass


class EditNotUniqueError(ValueError):
    pass


def edit_file(repo_root, path, old_str, new_str):
    """Replace exactly one occurrence of old_str with new_str in path.

    Fails loudly rather than guessing if old_str isn't found or isn't
    unique — the caller should widen old_str with more surrounding
    context instead of risking an edit landing in the wrong spot.
    """
    target = resolve(repo_root, path)
    if not target.is_file():
        raise FileNotFoundError(f"{path} is not a file under {repo_root}")

    content = target.read_text(encoding="utf-8")
    count = content.count(old_str)
    if count == 0:
        raise EditNotFoundError(f"old_str not found in {path}")
    if count > 1:
        raise EditNotUniqueError(
            f"old_str matches {count} locations in {path}; include more "
            "surrounding context to make it unique"
        )

    target.write_text(content.replace(old_str, new_str, 1), encoding="utf-8")
    return {"path": path, "replaced": True}
