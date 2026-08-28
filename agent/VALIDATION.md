# Investigation-loop validation (2026-08-28)

Ran `scripts/run_investigation.py` (real Groq calls, `openai/gpt-oss-120b`,
temperature 0.2) against both broken toy repos. The agent only had the
four read-only tools — no `edit_file`/`run_tests` yet — and was given
just the captured pytest failure text (never the ground-truth answer
in `sandbox/*.failure.txt`, which is stripped before the prompt is built).

| Scenario | Failure mode | Root cause found? | Confidence | Tool calls |
|---|---|---|---|---|
| `toy_repo_broken` | `TypeError`: positional arg now keyword-only | Correct — matched ground truth exactly | high | 3 |
| `toy_repo_broken2` | `AttributeError`: method renamed | Correct — matched ground truth exactly | high | 5 |

Both reports cited real file/line evidence (not fabricated), proposed
a sensible fix in words, and flagged what wasn't checked (e.g. other
call sites of the old API) instead of overclaiming. Scenario 2 even
proactively ran `search_text` for other usages of the removed method
name before concluding.

Conclusion: on these two dependency-bump-style failures, the
investigation-only loop reliably finds the correct root cause using
only search/read tools. Safe to add `edit_file` + `run_tests` and the
bounded debug loop next.

## Fix-loop validation (2026-08-28)

Ran `scripts/run_fix.py` (same model/temperature) against both
scenarios with the full tool set (`agent.loop.fix`), each in a fresh,
throwaway git workspace copied out of `sandbox/` (never mutating the
tracked fixtures) so `run_tests` and `get_diff` had a real repo to
work with.

| Scenario | Resolved? | run_tests calls used (of 5) | Fix made |
|---|---|---|---|
| `toy_repo_broken` | Yes | 1 | `checkout.py`: `apply_discount(price, discount_percent, 2)` → `apply_discount(price, discount_percent, rounding=2)` |
| `toy_repo_broken2` | Yes | 1 | `settings.py`: `cfg.get_value(...)` → `cfg.value(...)` |

Both fixes were minimal, targeted `edit_file` calls (no rewrites),
verified by an actual passing `run_tests` call inside the Docker
sandbox before the loop reported `STATUS: resolved` — `resolved` in
the returned result reflects that real pass, not the model's say-so.
Final diffs were clean single-line changes.

Two bugs were caught and fixed before this run, not after:
1. Breaking out of the tool-call loop as soon as a passing test was
   seen would've left any later tool calls in that same batch
   unanswered, which the Groq API would reject on the next request.
2. Inserting the "state your revised hypothesis" nudge as a `user`
   message interleaved between `tool`-role responses (rather than
   after the full batch) would've broken the expected message
   ordering. Both are now structured so every tool call in a batch is
   answered contiguously before any other message is added.

A rough edge in the harness itself (not the agent): the throwaway
toy fixtures have no `.gitignore`, so a sandbox test run's compiled
`.pyc` showed up as diff noise on the first run. Fixed by writing a
minimal `.gitignore` (`__pycache__/`, `*.pyc`, `.pytest_cache/`) into
each workspace before the initial commit — real cloned repos almost
always have this already.

Conclusion: on these two scenarios, the bounded fix loop reliably
finds and correctly fixes the bug in a single `run_tests` iteration,
well within the 5-attempt budget. Safe to move on to the structured
JSON execution log + log viewer next.
