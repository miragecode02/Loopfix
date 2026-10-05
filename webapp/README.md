# Loopfix benchmark lab

A local, read-only workspace over `loopfix.db` and `logs/*.json`. Use it to
compare benchmark sessions, find a run or task, and inspect the agent's report,
tool trace, and patch. It never changes benchmark records or log files.

## Run locally

Start the API from the repository root:

```powershell
py -3 -m uvicorn webapp.backend.main:app --host 127.0.0.1 --port 8420
```

Then start the frontend in a second terminal:

```powershell
cd webapp/frontend
npm install  # first run only
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Vite proxies `/api` to
the local FastAPI service on port 8420.

## Workspace interactions

- Press **Ctrl+K** to search recent runs, benchmark task names, and models.
- Use **Refresh current view** to reload the open dashboard or record.
- Filter the outcome chart by date range and toggle outcome categories. Select a
  chart column to open that run.
- Compare two of the latest five runs by resolved tasks, resolve rate, errors,
  and runtime.
- Search, filter, and sort run history. Open a run to filter its tasks by name
  and outcome.
- Search tool activity by tool, reason, input, or output; expand visible steps
  and copy individual inputs and outputs.
- Copy task prompts, reports, task IDs, and patches. Wrap long diff lines when
  needed. Light and dark themes are available and remembered locally.

To create a new evaluation, use the copied command `python scripts/run_eval.py`
from a terminal at the repository root.

## Structure

- `backend/main.py` — FastAPI read-only endpoints: `/api/runs`,
  `/api/runs/{id}`, and `/api/logs/{log_id}`.
- `frontend/` — Vite, React, TypeScript, Tailwind v4, Phosphor icons, and Framer
  Motion.
  - `src/pages/Dashboard.tsx` — outcome trends, comparison, recent sessions.
  - `src/pages/RunsPage.tsx` — searchable, filterable, sortable run history.
  - `src/pages/RunDetail.tsx` — task outcomes and per-run filtering.
  - `src/pages/TaskDetail.tsx` — task report, searchable activity timeline, patch,
    prompt, and environment.
