# Loopfix

An agentic AI coding agent that takes a GitHub repo and a bounded engineering task, investigates the codebase using tools, makes a targeted code fix, runs tests in an isolated Docker sandbox, iterates on failures (bounded), and produces a diff + written report — paired with a real evaluation harness that measures the agent's actual success rate on a small benchmark of tasks.

## Scope (MVP)

- **Task type**: fix failing tests in a Python repo after a dependency/library version bump.
- **Agent**: single agent loop with tool calling (Groq), not multi-agent.
- **Retrieval**: ripgrep + a lightweight JSON symbol index, not a vector DB.
- **Sandbox**: one Docker container per task run, real isolation, hard timeout, no network during test execution.
- **Output**: git diff + written report (root cause, changes, test results, confidence). No auto-PR in the MVP.
- **Storage**: SQLite.
- **Eval**: an 8-12 task benchmark of real dependency-bump breakages, run for real, with honest reported numbers.

## Status

Early scaffolding. See commit history for build progression: Docker sandbox first, then read-only tools, then the agent loop, then editing + the bounded debug loop, then the eval harness.

## Build order

1. Docker sandbox (clone → run tests in container → confirm isolation & timeout)
2. Read-only tools: `search_text`, `search_symbol`, `read_file`, `list_directory`
3. Agent loop, investigation-only (no editing yet)
4. `edit_file` + `run_tests` + bounded 5-iteration debug loop
5. Structured JSON execution log + simple log viewer
6. Diff + report generation
7. 8-12 task benchmark + eval runner, run for real
8. Stretch goals (only after 1-7 are solid)
