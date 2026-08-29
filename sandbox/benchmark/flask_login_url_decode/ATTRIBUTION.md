# Attribution

- **Source**: https://github.com/maxcountryman/flask-login
- **Commit**: `91541785cec4153cc148485929ec44c1c734b410` (tag `0.6.2`)
- **License**: MIT (see upstream `LICENSE`)
- **Files kept**: the entire `flask_login/` package (`__about__.py`,
  `__init__.py`, `config.py`, `login_manager.py`, `mixins.py`,
  `signals.py`, `test_client.py`, `utils.py`), unmodified. The original
  `tests/test_login.py` is ~1800 lines covering the whole library;
  `tests/test_login_url.py` here is a trimmed rewrite keeping only
  `TestLoginUrlGeneration` (renamed from the original class of the same
  name), the one test class that exercises `login_url()`/
  `make_next_param()` — the only code path in this vendored slice that
  touches `werkzeug.urls`. Added (not present upstream, no behavior
  change): a root `conftest.py` (empty, anchors pytest's import rootdir)
  and `pytest.ini` (`testpaths = tests`, so pytest doesn't try to collect
  `flask_login/test_client.py` as a test module purely because of its
  filename — it's a real library module, not a test).
- **Pinned dependency causing the break**: `requirements.txt` pins
  `Werkzeug>=2.1` (upstream at this commit required only
  `Werkzeug>=1.0.1`) alongside a compatible modern `Flask>=2.3`.
  **Werkzeug 2.1 removed `werkzeug.urls.url_decode` and `url_encode`**
  (deprecated since Werkzeug 2.0, removed per Werkzeug's changelog).
  `flask_login/utils.py` lines 14-15 still do
  `from werkzeug.urls import url_decode` / `import url_encode`, used
  inside `login_url()` (`utils.py` ~line 126-130) to round-trip the
  `next` query parameter — so importing `flask_login` at all now raises
  `ImportError` under the pinned Werkzeug.
