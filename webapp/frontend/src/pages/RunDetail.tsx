import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, type RunDetail as RunDetailData, type TaskResult } from '../api'
import FeedbackState, { LoadingState } from '../components/FeedbackState'
import StatTile from '../components/StatTile'
import StatusBadge from '../components/StatusBadge'
import { statusOf } from '../utils/taskStatus'

type TaskFilter = 'all' | 'resolved' | 'unresolved' | 'errored'

function formatDuration(seconds: number | null) {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '—'
  if (seconds < 60) return `${Math.round(seconds)}s`
  const minutes = Math.floor(seconds / 60)
  const remainder = Math.round(seconds % 60)
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`
}

function TaskCard({ task }: { task: TaskResult }) {
  const status = statusOf(task)
  const content = (
    <>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <code className="min-w-0 break-all text-sm font-semibold">{task.task_name}</code>
        <StatusBadge status={status} />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
        {task.test_iterations != null && <span>{task.test_iterations} test {task.test_iterations === 1 ? 'attempt' : 'attempts'}</span>}
        {task.tool_calls != null && <span>{task.tool_calls} tool calls</span>}
        {task.duration_seconds != null && <span>{formatDuration(task.duration_seconds)}</span>}
      </div>
      {task.error && (
        <p className="mt-3 line-clamp-2 break-words text-xs" style={{ color: 'var(--status-warning)' }}>{task.error}</p>
      )}
      {!task.log_id && <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>No detailed task log is available.</p>}
      {task.log_id && <p className="mt-3 text-xs font-medium" style={{ color: 'var(--series-blue)' }}>View task details →</p>}
    </>
  )

  return task.log_id ? (
    <Link
      to={`/tasks/${encodeURIComponent(task.log_id)}`}
      className="block rounded-xl p-4 transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:p-5"
      style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
    >
      {content}
    </Link>
  ) : (
    <article className="rounded-xl p-4 sm:p-5" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
      {content}
    </article>
  )
}

export default function RunDetail({ refreshKey }: { refreshKey: number }) {
  const { runId } = useParams()
  const [result, setResult] = useState<{ key: string; data?: RunDetailData; error?: string }>({ key: '' })
  const [attempt, setAttempt] = useState(0)
  const requestKey = `${runId ?? ''}:${refreshKey}:${attempt}`
  const validRunId = !!runId && /^\d+$/.test(runId)
  const [controls, setControls] = useState<{ key: string; query: string; filter: TaskFilter }>({ key: '', query: '', filter: 'all' })
  const query = controls.key === requestKey ? controls.query : ''
  const filter = controls.key === requestKey ? controls.filter : 'all'

  useEffect(() => {
    let active = true
    if (!validRunId || !runId) return () => { active = false }
    api.getRun(Number(runId))
      .then((data) => { if (active) setResult({ key: requestKey, data }) })
      .catch((reason: unknown) => { if (active) setResult({ key: requestKey, error: reason instanceof Error ? reason.message : String(reason) }) })
    return () => { active = false }
  }, [requestKey, runId, validRunId])

  const data = result.key === requestKey ? result.data : undefined
  const error = result.key === requestKey ? result.error : undefined

  const visibleTasks = useMemo(() => {
    if (!data) return []
    const normalizedQuery = query.trim().toLowerCase()
    return data.tasks.filter((task) => {
      const status = statusOf(task)
      const matchesText = !normalizedQuery || task.task_name.toLowerCase().includes(normalizedQuery)
      const matchesStatus = filter === 'all' || status === filter
      return matchesText && matchesStatus
    })
  }, [data, filter, query])

  if (error) {
    return (
      <FeedbackState
        eyebrow="Run details"
        title="This run couldn’t be loaded."
        description={error}
        action={{ label: 'Try again', onClick: () => setAttempt((value) => value + 1) }}
      />
    )
  }
  if (!validRunId) {
    return <FeedbackState eyebrow="Run details" title="Run IDs must be numeric." action={{ label: 'Browse run history', to: '/runs' }} />
  }
  if (!data) return <LoadingState label="Loading run details" variant="runDetail" />

  const { run, tasks } = data
  const resolveRate = run.task_count > 0 ? Math.round((run.resolved_count / run.task_count) * 100) : 0

  return (
    <div className="space-y-8">
      <header>
        <Link to="/runs" className="text-sm hover:underline" style={{ color: 'var(--series-blue)' }}>← Run history</Link>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>Benchmark run</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Run #{run.id}</h1>
            <p className="mt-2 break-words text-sm" style={{ color: 'var(--text-secondary)' }}>
              Started {new Date(run.started_at * 1000).toLocaleString()} · {run.model ?? 'Model not recorded'}
            </p>
          </div>
          <Link to="/runs" className="text-sm font-medium hover:underline" style={{ color: 'var(--series-blue)' }}>All runs →</Link>
        </div>
      </header>

      <section aria-label="Run summary" className="metric-strip">
        <StatTile label="Resolve rate" value={`${resolveRate}%`} sub={`${run.resolved_count} of ${run.task_count} tasks`} accent="var(--status-good)" tip="Passed tasks ÷ total tasks for this session." />
        <StatTile label="Resolved" value={String(run.resolved_count)} sub="Tasks that passed" accent="var(--status-good)" tip="The agent's patch made the failing tests pass." />
        <StatTile label="Unresolved" value={String(run.unresolved_count)} sub="Tasks left unresolved" accent="var(--status-critical)" tip="The agent finished but its patch didn't fix the tests." />
        <StatTile label="Errored" value={String(run.errored_count)} sub={`Duration ${formatDuration(run.finished_at - run.started_at)}`} accent="var(--status-warning)" tip="The run crashed before finishing (usually a model rate limit), so it isn't counted against fix quality." />
      </section>

      <section aria-labelledby="tasks-heading" className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="tasks-heading" className="text-lg font-semibold tracking-tight">Tasks</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Search this run or filter tasks by outcome.</p>
          </div>
          <p className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }} aria-live="polite">{visibleTasks.length} of {tasks.length} tasks</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_13rem]">
          <label>
            <span className="sr-only">Search tasks</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setControls({ key: requestKey, query: event.target.value, filter })}
              placeholder="Search task names"
              className="min-h-11 w-full rounded-lg border px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              style={{ background: 'var(--surface-1)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </label>
          <label>
            <span className="sr-only">Filter tasks by outcome</span>
            <select
              value={filter}
              onChange={(event) => setControls({ key: requestKey, query, filter: event.target.value as TaskFilter })}
              className="min-h-11 w-full rounded-lg border px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              style={{ background: 'var(--surface-1)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              <option value="all">Every outcome</option>
              <option value="resolved">Resolved</option>
              <option value="unresolved">Unresolved</option>
              <option value="errored">Errored</option>
            </select>
          </label>
        </div>

        {visibleTasks.length === 0 ? (
          <div className="rounded-xl border p-6 text-sm" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            {tasks.length === 0 ? 'This run has no task records.' : 'No tasks match the current search and outcome filter.'}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">{visibleTasks.map((task) => <TaskCard key={task.id} task={task} />)}</div>
        )}
      </section>
    </div>
  )
}
