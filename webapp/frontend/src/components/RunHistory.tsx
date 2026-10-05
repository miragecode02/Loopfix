import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import type { RunSummary } from '../api'

type OutcomeFilter = 'all' | 'errored' | 'unresolved' | 'resolved'
type SortMode = 'newest' | 'oldest' | 'best' | 'worst'

function formatDate(epochSeconds: number) {
  return new Date(epochSeconds * 1000).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '—'
  const minutes = Math.floor(seconds / 60)
  const remainder = Math.round(seconds % 60)
  return minutes > 0 ? `${minutes}m ${remainder}s` : `${remainder}s`
}

function resolvedRate(run: RunSummary) {
  return run.task_count > 0 ? Math.round((run.resolved_count / run.task_count) * 100) : 0
}

function RunOutcome({ run }: { run: RunSummary }) {
  const rate = resolvedRate(run)
  const total = Math.max(run.task_count, 1)
  const resolvedWidth = Math.min(100, (run.resolved_count / total) * 100)
  const unresolvedWidth = Math.min(100 - resolvedWidth, (run.unresolved_count / total) * 100)
  const erroredWidth = Math.min(100 - resolvedWidth - unresolvedWidth, (run.errored_count / total) * 100)

  return (
    <div className="min-w-28">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
          {run.resolved_count}/{run.task_count}
        </span>
        <span style={{ color: 'var(--text-muted)' }}>{rate}% resolved</span>
      </div>
      <div
        className="mt-2 flex h-1.5 overflow-hidden rounded-full"
        style={{ background: 'var(--surface-2)' }}
        role="img"
        aria-label={`${run.resolved_count} resolved, ${run.unresolved_count} unresolved, ${run.errored_count} errored`}
      >
        <span style={{ width: `${resolvedWidth}%`, background: 'var(--status-good)' }} />
        <span style={{ width: `${unresolvedWidth}%`, background: 'var(--status-critical)' }} />
        <span style={{ width: `${erroredWidth}%`, background: 'var(--status-warning)' }} />
      </div>
    </div>
  )
}

function OutcomeBadge({ run }: { run: RunSummary }) {
  const outcome = run.task_count === 0
    ? { label: 'No tasks', bg: 'var(--surface-2)', fg: 'var(--text-secondary)' }
    : run.errored_count > 0
      ? { label: 'Has errors', bg: 'var(--status-warning-bg)', fg: 'var(--status-warning)' }
      : run.unresolved_count > 0
        ? { label: 'Unresolved', bg: 'var(--status-critical-bg)', fg: 'var(--status-critical)' }
        : { label: 'All resolved', bg: 'var(--status-good-bg)', fg: 'var(--status-good)' }

  return (
    <span className="inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: outcome.bg, color: outcome.fg }}>
      {outcome.label}
    </span>
  )
}

function matchesFilter(run: RunSummary, filter: OutcomeFilter) {
  if (filter === 'errored') return run.errored_count > 0
  if (filter === 'unresolved') return run.unresolved_count > 0
  if (filter === 'resolved') return run.task_count > 0 && run.resolved_count === run.task_count
  return true
}

export default function RunHistory({
  runs,
  controls = false,
  limit,
}: {
  runs: RunSummary[]
  controls?: boolean
  limit?: number
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<OutcomeFilter>('all')
  const [sort, setSort] = useState<SortMode>('newest')

  const filteredRuns = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const matched = runs.filter((run) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        String(run.id).includes(normalizedQuery) ||
        (run.model ?? '').toLowerCase().includes(normalizedQuery)
      return matchesQuery && matchesFilter(run, filter)
    })
    return matched.sort((a, b) => {
      if (sort === 'oldest') return a.id - b.id
      if (sort === 'best') return resolvedRate(b) - resolvedRate(a)
      if (sort === 'worst') return resolvedRate(a) - resolvedRate(b)
      return b.id - a.id
    })
  }, [filter, query, runs, sort])

  const visibleRuns = limit ? filteredRuns.slice(0, limit) : filteredRuns

  return (
    <div className="space-y-4">
      {controls && (
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem_11rem]">
          <label className="block">
            <span className="filter-label">Search sessions</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search run number or model"
              className="search-control"
              style={{ background: 'var(--surface-1)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </label>
          <label className="block">
            <span className="filter-label">Outcome</span>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as OutcomeFilter)}
              className="filter-control"
              style={{ background: 'var(--surface-1)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              <option value="all">Every outcome</option>
              <option value="errored">Has errors</option>
              <option value="unresolved">Has unresolved tasks</option>
              <option value="resolved">All tasks resolved</option>
            </select>
          </label>
          <label className="block">
            <span className="filter-label">Sort by</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className="filter-control" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="best">Best resolve rate</option>
              <option value="worst">Lowest resolve rate</option>
            </select>
          </label>
        </div>
      )}

      {controls && (
        <div className="flex items-center justify-between gap-3 text-xs" style={{ color: 'var(--text-muted)' }} aria-live="polite">
          <span>{filteredRuns.length} {filteredRuns.length === 1 ? 'run' : 'runs'}</span>
          {query || filter !== 'all' || sort !== 'newest' ? (
            <button
              type="button"
              onClick={() => { setQuery(''); setFilter('all'); setSort('newest') }}
              className="rounded underline underline-offset-4 hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-blue-500"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      )}

      {visibleRuns.length === 0 ? (
        <div className="rounded-xl border p-6 text-sm" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
          {runs.length === 0 ? 'No benchmark runs have been recorded yet.' : 'No runs match these filters.'}
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border xl:hidden" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
            <AnimatePresence initial={false} mode="popLayout">
            {visibleRuns.map((run, index) => (
              <motion.article layout key={run.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }} className={`space-y-4 p-4 sm:p-5 ${index > 0 ? 'border-t' : ''}`} style={{ borderColor: 'var(--border)' }}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Link to={`/runs/${run.id}`} className="text-sm font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-blue-500" style={{ color: 'var(--series-blue)' }}>
                    Run #{run.id}
                  </Link>
                  <OutcomeBadge run={run} />
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div className="min-w-0">
                    <div className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Started</div>
                    <div className="mt-1 break-words" style={{ color: 'var(--text-secondary)' }}>{formatDate(run.started_at)}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Duration</div>
                    <div className="mt-1" style={{ color: 'var(--text-secondary)' }}>{formatDuration(run.finished_at - run.started_at)}</div>
                  </div>
                  <div className="col-span-2 min-w-0">
                    <div className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Model</div>
                    <div className="mt-1 break-words" style={{ color: 'var(--text-secondary)' }}>{run.model ?? '—'}</div>
                  </div>
                </div>
                <RunOutcome run={run} />
              </motion.article>
            ))}
            </AnimatePresence>
          </div>

          <div className="hidden overflow-hidden rounded-xl border xl:block" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ color: 'var(--text-muted)', background: 'var(--surface-2)' }}>
                  <th scope="col" className="px-4 py-3 font-medium">Run</th>
                  <th scope="col" className="px-4 py-3 font-medium">Started</th>
                  <th scope="col" className="px-4 py-3 font-medium">Duration</th>
                  <th scope="col" className="px-4 py-3 font-medium">Model</th>
                  <th scope="col" className="px-4 py-3 font-medium">Outcome</th>
                  <th scope="col" className="px-4 py-3 font-medium">Resolved</th>
                </tr>
              </thead>
              <tbody>
                {visibleRuns.map((run) => (
                  <motion.tr layout key={run.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }} className="border-t" style={{ borderColor: 'var(--border)' }}>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link to={`/runs/${run.id}`} className="font-semibold hover:underline" style={{ color: 'var(--series-blue)' }}>#{run.id}</Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{formatDate(run.started_at)}</td>
                    <td className="whitespace-nowrap px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{formatDuration(run.finished_at - run.started_at)}</td>
                    <td className="max-w-56 break-words px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{run.model ?? '—'}</td>
                    <td className="px-4 py-3"><OutcomeBadge run={run} /></td>
                    <td className="w-56 px-4 py-3"><RunOutcome run={run} /></td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
