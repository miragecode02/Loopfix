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
