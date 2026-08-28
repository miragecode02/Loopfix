"""create_file tool: writes a brand-new file, never overwrites an existing one."""

from .paths import resolve


class FileAlreadyExistsError(ValueError):
    pass


def create_file(repo_root, path, content):
    target = resolve(repo_root, path)
    if target.exists():
        raise FileAlreadyExistsError(f"{path} already exists; use edit_file instead")

    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")
    return {"path": path, "created": True}
