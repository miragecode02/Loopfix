# Source

- Repo: https://github.com/smurfix/flask-script (maintained fork of the
  original, now-archived `techniq/flask-script`; this is the version
  that stayed available and installable)
- Commit: `f141a3382dd49f53e4e86f7fd0fbcc8b5c0447f4` (master)
- License: BSD-style ("Some rights reserved" 3-clause BSD text,
  copyright Dan Jacob 2010 / Matthias Urlichs 2014; GitHub's detector
  reports "Other" for the same reason as the other vendored BSD-text
  packages in this benchmark — it doesn't match the canonical template
  byte-for-byte).

# What was kept

- `flask_script/__init__.py`, `_compat.py`, `cli.py`, `commands.py` —
  vendored verbatim, no logic changes. All four are kept together
  because `__init__.py` structurally imports from the other three
  (even though, as pinned, the failure happens before those imports
  are ever reached — see below).
- `test_manager_import.py` — written for this benchmark (the original
  repo's own tests use a broader Flask test-app fixture setup not
  needed here); exercises the real vendored `Manager` class's real
  `__init__`.

# The break

`flask_script/__init__.py` does `from flask._compat import text_type`
at module load time. `flask._compat` was Flask's internal Python 2/3
compatibility shim; it was removed when Flask dropped Python 2 support
in Flask 2.0. `requirements.txt` pins `flask>=2.0`, so the module
doesn't exist and the import fails immediately.

Note `commands.py` also does `from flask import _request_ctx_stack`,
which is a *second*, independent real break (that internal was removed
in Flask 2.3) — but it's never reached: `__init__.py` fails on the
`flask._compat` import (line 15) before it gets to
`from .commands import ...` (line 18), so only one root cause actually
manifests in the captured failure. Worth knowing if this task is ever
extended past a first fix-and-rerun cycle.
