# Source

- Repo: https://github.com/Bachmann1234/marshmallow-polyfield
- Commit: `3d5b35a2290bca5fe0c7d77840319f13c38d5500` (short `3d5b35a229`),
  the last commit before the repo's own "Incorporate breaking changes
  from Marshmallow 3.0" migration (`0c08d5af71`) — i.e. the real
  pre-migration, marshmallow-2.x-era state of this file.
- License: Apache License 2.0.

# What was kept

- `marshmallow_polyfield/__init__.py` and `marshmallow_polyfield/polyfield.py`
  — vendored verbatim from the pinned commit, no logic changes.
- `test_polyfield_serialize.py` — written for this benchmark (the
  original repo's own test suite at this commit exercises many more
  cases — many=True, deserialization, error paths — well beyond this
  task's scope); this test exercises the real vendored `PolyField`
  through a normal `Schema().dump(...)` call, i.e. the same path a
  real caller would use.

# The break (as actually observed — see the sibling .failure.txt)

`polyfield.py`'s `_serialize` does
`schema.context.update(getattr(self, 'context', {}))`, relying on
every `Schema` instance having a `.context` attribute by default —
true in the marshmallow 2.x/3.x era this code was written against.
`requirements.txt` pins `marshmallow>=4.0,<5`; marshmallow 4 dropped
that always-present `context` attribute, so a freshly-instantiated
`CatSchema()` no longer has one, and the line raises
`AttributeError: 'CatSchema' object has no attribute 'context'`
(caught internally and re-raised as `TypeError` by polyfield.py's own
error handling). Note this is a marshmallow 3→4 break, not the 2→3
`strict=`/`.data` break this task originally set out to find — pinning
`requirements.txt` to `marshmallow>=3.0` (unpinned upper bound) picked
up the latest available marshmallow 4.x, which is what actually
resolved to. This is still a genuine, verified real-repo
dependency-bump break, just a different (and more current) one than
originally targeted — reported honestly rather than forced into the
originally-planned shape.
