# Attribution

- **Source**: https://github.com/pallets-eco/flask-wtf
- **Commit**: `aceb2b4e0389b68e70f4055cd1171df007cb0f8a` (tag `v1.0.1`)
- **License**: BSD-3-Clause (see upstream `LICENSE.rst`; header reads
  "Copyright 2010 WTForms")
- **Files kept**: the entire `src/flask_wtf/` package (`__init__.py`,
  `_compat.py`, `csrf.py`, `file.py`, `form.py`, `i18n.py`,
  `recaptcha/__init__.py`, `recaptcha/fields.py`,
  `recaptcha/validators.py`, `recaptcha/widgets.py`), unmodified. The
  original `tests/test_recaptcha.py` covers config handling, HTML
  rendering, and live validation against Google's recaptcha API (which
  needs network); `tests/test_recaptcha.py` here is trimmed to the 2
  rendering-only tests (`test_render_has_js`,
  `test_render_custom_div_class`) that need no network and exercise
  `RecaptchaWidget.recaptcha_html()`, the code path that touches
  `flask.Markup`. `tests/conftest.py` is the original's `app` fixture,
  unmodified. Added (not present upstream, no behavior change): a root
  `conftest.py` (empty, anchors pytest's import rootdir).
- **Pinned dependency causing the break**: `requirements.txt` pins
  `Flask>=2.3` (upstream at this commit had no explicit Flask version
  ceiling). **Flask 2.3 removed the `flask.Markup` re-export**
  (previously just deprecated in 2.2, per Flask's changelog — you must
  import `Markup` from `markupsafe` instead). `flask_wtf/form.py` was
  already updated to `from markupsafe import Markup`, but
  `flask_wtf/recaptcha/widgets.py:3` still does
  `from flask import Markup`, so importing `flask_wtf` at all now
  raises `ImportError` once Flask is bumped to >=2.3.
