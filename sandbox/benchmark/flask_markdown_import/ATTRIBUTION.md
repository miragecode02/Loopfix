# Source

- Repo: https://github.com/dcolish/flask-markdown
- Commit: `03f8fcc38e9aebd39a2f06ce162ce859b6797fa4` (master)
- License: BSD-style ("Some rights reserved" 3-clause BSD text in the
  repo's `LICENSE` file; GitHub's license detector reports "Other"
  because the file doesn't exactly match the canonical BSD template,
  but the text itself is a standard 3-clause BSD grant).

# What was kept

- `flaskext/markdown.py` — vendored verbatim, no logic changes.
- `flaskext/__init__.py` — replaced with an empty file. The original
  used `__import__('pkg_resources').declare_namespace(__name__)` to
  merge this package into a shared `flaskext` namespace across
  multiple independently-installed Flask extensions (a common pattern
  circa 2010-2013). That only matters when several `flaskext.*`
  extensions are installed side by side; since this benchmark task
  vendors only this one extension, the namespace declaration serves
  no purpose here and was dropped. It does not touch the code path
  under test.
- `test_markdown_filter.py` — written for this benchmark (the
  original repo has no pytest suite), exercising the real vendored
  `Markdown` filter class's real `__call__` behavior.

# The break

`flaskext/markdown.py` does `from flask import Markup`. Flask
re-exported `Markup` (really `markupsafe.Markup`) for backwards
compatibility through the 2.x series, deprecated it in 2.3, and
removed the re-export entirely in Flask 3.0
(https://flask.palletsprojects.com/en/3.0.x/changes/). `requirements.txt`
pins `flask>=3.0`, so the import fails immediately at module load
time — a real, current (as of Flask 3.x) compatibility break, not
fabricated.
