# Attribution

- **Source**: https://github.com/mattupstate/flask-jwt
- **Commit**: `c27084114e258863b82753fc574a362cd6c62fcd`
- **License**: MIT (see upstream `LICENSE`)
- **Files kept**: `flask_jwt/__init__.py` (the whole library, unmodified),
  `tests/conftest.py` (unmodified). `tests/test_jwt.py` is trimmed to 3 of
  the original ~20 tests (`test_initialize`,
  `test_auth_endpoint_with_valid_request`,
  `test_auth_endpoint_with_invalid_credentials`) to keep the task focused
  on the one failure below; the rest of the original suite is unrelated to
  it. A top-level `conftest.py` (empty) was added — not present upstream —
  purely so pytest can import the sibling `flask_jwt` package without an
  install step; it changes no behavior.
- **Pinned dependency causing the break**: `requirements.txt` pins the
  rest of the original Flask stack to versions contemporaneous with the
  vendored code (Flask 2.0.3 / Werkzeug 2.0.3 / Jinja2 3.0.3 /
  itsdangerous 2.0.1 / click 8.0.4) so only one thing changes:
  `PyJWT>=2.0` (originally pinned `PyJWT>=1.4.0,<1.5.0` upstream).
  **PyJWT 2.0 changed `jwt.encode()` to return `str` instead of `bytes`**
  (a documented breaking change in PyJWT's 2.0 migration guide). The
  vendored code at `flask_jwt/__init__.py:132` still does
  `access_token.decode('utf-8')`, written for the old bytes-returning
  behavior.
