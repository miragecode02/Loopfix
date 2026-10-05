import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, TerminalWindow } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { api, type RunSummary } from '../api'
import CopyButton from '../components/CopyButton'
import FeedbackState, { LoadingState } from '../components/FeedbackState'
import RunComparison from '../components/RunComparison'
import RunHistory from '../components/RunHistory'
import RunsChart from '../components/RunsChart'

type Range = '30d' | '90d' | 'all'
const RUN_COMMAND = 'python scripts/run_eval.py'

function percent(resolved: number, total: number) {
  return total > 0 ? Math.round((resolved / total) * 100) : 0
}

function formatTime(epochSeconds: number) {
  return new Date(epochSeconds * 1000).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function Dashboard({ refreshKey }: { refreshKey: number }) {
  const [result, setResult] = useState<{ requestKey: string; runs?: RunSummary[]; error?: string; loadedAt?: number }>({ requestKey: '' })
  const [attempt, setAttempt] = useState(0)
  const [range, setRange] = useState<Range>('90d')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const requestKey = `${refreshKey}:${attempt}`

  useEffect(() => {
    let active = true
    api.listRuns()
      .then((runs) => { if (active) setResult({ requestKey, runs, loadedAt: Date.now() }) })
      .catch((reason: unknown) => { if (active) setResult({ requestKey, error: reason instanceof Error ? reason.message : String(reason) }) })
    return () => { active = false }
  }, [requestKey])

  const error = result.requestKey === requestKey ? result.error : undefined
  const runs = result.requestKey === requestKey ? result.runs : undefined
  const loadedAt = result.requestKey === requestKey ? result.loadedAt : undefined
  const chartRuns = useMemo(() => {
    if (!runs || range === 'all' || loadedAt === undefined) return runs ?? []
    const days = range === '30d' ? 30 : 90
    const cutoff = loadedAt / 1000 - days * 24 * 60 * 60
    return runs.filter((run) => run.started_at >= cutoff)
  }, [loadedAt, range, runs])

  if (error) {
    return (
      <FeedbackState
        eyebrow="Local data source"
        title="The benchmark index isn’t responding."
        description={<><span>{error}</span><span className="mt-2 block">Start the Loopfix API, then refresh this workspace.</span></>}
        action={{ label: 'Retry connection', onClick: () => setAttempt((value) => value + 1) }}
      />
    )
  }
  if (!runs) return <LoadingState label="Loading benchmark overview" />
  if (runs.length === 0) {
    return (
      <FeedbackState
        eyebrow="Local benchmark workspace"
        title="No sessions recorded yet."
        description="Run the evaluation harness from the project root. When it finishes, the outcomes and agent traces will appear here."
      >
        <div className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between" style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
          <code className="break-all text-sm">{RUN_COMMAND}</code>
          <CopyButton value={RUN_COMMAND} label="Copy command" />
        </div>
      </FeedbackState>
    )
  }

  const latest = runs[0]
  const totalTasks = runs.reduce((sum, run) => sum + run.task_count, 0)
  const bestRate = Math.max(...runs.map((run) => percent(run.resolved_count, run.task_count)))
  const selectedExistingIds = selectedIds.filter((id) => runs.some((run) => run.id === id))
  const periods: { id: Range; label: string }[] = [
    { id: '30d', label: '30 days' },
    { id: '90d', label: '90 days' },
    { id: 'all', label: 'All time' },
  ]

  return (
    <div className="space-y-9 sm:space-y-11">
      <header className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
            <span className="status-pulse" aria-hidden="true" /> Agent evaluation / local workspace
          </div>
          <h1 className="mt-3 max-w-3xl text-[2rem] font-semibold leading-[1.05] tracking-[-0.045em] sm:text-4xl">Repair quality, measured.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Inspect what the agent resolved, where it got stuck, and how each benchmark session changed the result.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>{runs.length} recorded {runs.length === 1 ? 'session' : 'sessions'}</span><span className="h-1 w-1 rounded-full" style={{ background: 'var(--border-strong)' }} />
            <span>Last updated {result.loadedAt ? formatTime(result.loadedAt / 1000) : 'just now'}</span>
          </div>
        </div>

        <motion.aside layout className="command-card">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--accent-soft-text)' }}>
              <TerminalWindow size={16} aria-hidden="true" /> Run a new evaluation
            </span>
            <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--rail-muted)' }}>CLI</span>
          </div>
          <div className="mt-4 rounded-lg border px-3 py-2.5 font-mono text-xs" style={{ background: 'var(--rail-inset)', borderColor: 'var(--rail-border)', color: 'var(--rail-text)' }}>{RUN_COMMAND}</div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-[11px]" style={{ color: 'var(--rail-muted)' }}>Copies to your clipboard</span>
            <CopyButton value={RUN_COMMAND} label="Copy command" />
          </div>
        </motion.aside>
      </header>

      <section aria-label="Benchmark summary" className="metric-strip">
        {[
          { label: 'Latest resolve rate', value: `${percent(latest.resolved_count, latest.task_count)}%`, sub: `Run #${latest.id} · ${latest.resolved_count}/${latest.task_count} tasks`, accent: true },
          { label: 'All-time best', value: `${bestRate}%`, sub: 'Highest single-run rate' },
          { label: 'Sessions', value: String(runs.length), sub: 'Recorded benchmark runs' },
          { label: 'Tasks evaluated', value: String(totalTasks), sub: 'Across all sessions' },
        ].map((metric) => (
          <div key={metric.label} className="metric-cell">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>{metric.label}</div>
            <div className="mt-2 font-mono text-3xl font-semibold tracking-tight tabular-nums" style={{ color: metric.accent ? 'var(--accent)' : 'var(--text-primary)' }}>{metric.value}</div>
            <div className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{metric.sub}</div>
          </div>
        ))}
      </section>

      <section aria-labelledby="outcomes-heading" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">01 / PERFORMANCE</p>
            <h2 id="outcomes-heading" className="section-heading">Outcome distribution</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Compare task outcomes by run. Click a column to drill in.</p>
          </div>
          <div className="segmented-control" role="group" aria-label="Chart time range">
            {periods.map((period) => (
              <motion.button
                layout
                key={period.id}
                type="button"
                aria-pressed={range === period.id}
                onClick={() => setRange(period.id)}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                className={`segment-button ${range === period.id ? 'is-active' : ''}`}
              >{period.label}</motion.button>
            ))}
          </div>
        </div>
        <RunsChart runs={chartRuns} />
      </section>

      <section aria-labelledby="comparison-section-heading" className="space-y-4">
        <div>
          <p className="eyebrow">02 / INVESTIGATION</p>
          <h2 id="comparison-section-heading" className="section-heading">Find what changed</h2>
        </div>
        <RunComparison runs={runs} selectedIds={selectedExistingIds} onChange={setSelectedIds} />
      </section>

      <section aria-labelledby="recent-runs-heading" className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">03 / SESSION LOG</p>
            <h2 id="recent-runs-heading" className="section-heading">Recent sessions</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Search, filter, or open a run to inspect task traces.</p>
          </div>
          <Link to="/runs" className="action-button action-button-quiet shrink-0">Run history <ArrowUpRight size={15} aria-hidden="true" /></Link>
        </div>
        <RunHistory runs={runs.slice(0, 5)} controls />
      </section>
    </div>
  )
}
