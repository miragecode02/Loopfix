# Source

- Repo: https://github.com/thadeusb/flask-cache
- Commit: `1c60076b6d4c2df0ac1de54c59e63b4f780cecbc` (master)
- License: BSD-style ("Some rights reserved" 3-clause BSD text in the
  repo's `LICENSE` file; GitHub's license detector reports "Other"
  because the file doesn't exactly match the canonical BSD template,
  but the text itself is a standard 3-clause BSD grant, same wording
  as flask-markdown's).

# What was kept

- `flask_cache/__init__.py` — vendored verbatim (694 lines: the `Cache`
  class and its backend-loading machinery). Not trimmed further —
  cutting into the middle of a real module risks silently changing its
  behavior, so the whole file was kept as one coherent unit.
- `flask_cache/_compat.py` — vendored verbatim; imported by `__init__.py`.
- `backends.py` and `jinja2ext.py` from the original package were left
  out: `__init__.py` only imports from them lazily, inside methods, for
  backends this task's test never exercises (redis/memcached/etc.), so
  they're unreachable dead weight for this benchmark task.
- `test_cache_init.py` — written for this benchmark (the original repo
  has its own older test suite, but it exercises many backends and
  Flask/py2-3 compat paths well beyond this task's scope); this test
  exercises the real vendored `Cache` class's real `init_app`/`set`/`get`
  behavior against the built-in "simple" in-memory backend only.

# The break

`flask_cache/__init__.py` does `from werkzeug import import_string` at
module load time. Werkzeug used to re-export a number of utility
functions (including `import_string`) directly from the top-level
`werkzeug` package; that re-export was removed as Werkzeug modernized
its public API (current Werkzeug only exposes `import_string` from
`werkzeug.utils`). `requirements.txt` pins `flask>=3.0`, which pulls in
a modern Werkzeug (3.x) lacking the top-level re-export, so the import
fails immediately — a real compatibility break in an actually
unmaintained package (flask-cache was superseded by Flask-Caching
years ago), not fabricated.
