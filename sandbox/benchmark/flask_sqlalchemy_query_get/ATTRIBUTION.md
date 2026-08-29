# Attribution

- **Source**: https://github.com/pallets-eco/flask-sqlalchemy
- **Commit**: `da0e0df80cc368d95dc5a118ce857cead172aded` (tag `2.5.1`)
- **License**: BSD-3-Clause (see upstream `LICENSE.rst`)
- **Files kept**: the entire `flask_sqlalchemy/` package (`__init__.py`,
  `_compat.py`, `model.py`, `utils.py`), unmodified. `tests/conftest.py`
  and `tests/test_basic_app.py` are the originals, unmodified — a
  small, self-contained slice using an in-memory sqlite DB (no network,
  no external service). Added (not present upstream, no behavior
  change): a root `conftest.py` (empty, anchors pytest's import
  rootdir).
- **Pinned dependency causing the break**: `requirements.txt` pins the
  rest of the Flask stack to versions contemporaneous with this
  commit (Flask 2.0.3 / Werkzeug 2.0.3 / Jinja2 3.0.3 / itsdangerous
  2.0.1 / click 8.0.4 — flask-sqlalchemy 2.5.1 itself relies on Flask
  internals like `_app_ctx_stack` that later Flask versions removed,
  so Flask has to stay old for the *intended* dependency to be the one
  under test) so only one thing changes: `SQLAlchemy>=2.0` (upstream at
  this commit only required `SQLAlchemy>=0.8.0`).
  **SQLAlchemy 2.0 restructured its top-level package and no longer
  exposes `sqlalchemy.__all__`/`sqlalchemy.orm.__all__`** the way 1.x
  did. `flask_sqlalchemy/__init__.py`'s `_include_sqlalchemy()`
  (around line 108-115) iterates `module.__all__` for
  `sqlalchemy, sqlalchemy.orm` to copy every public name onto the
  convenience `db` object — this is exactly the widely-reported
  `AttributeError: module 'sqlalchemy' has no attribute '__all__'`
  that broke Flask-SQLAlchemy 2.5.1 apps when SQLAlchemy 2.0 shipped.
