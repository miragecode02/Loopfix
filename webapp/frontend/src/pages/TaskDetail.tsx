import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, type TaskLog } from '../api'
import CopyButton from '../components/CopyButton'
import DiffView from '../components/DiffView'
import FeedbackState, { LoadingState } from '../components/FeedbackState'
import InfoTip from '../components/InfoTip'
import ReportCard from '../components/ReportCard'
import StatusBadge from '../components/StatusBadge'
import Timeline from '../components/Timeline'
import { statusOf } from '../utils/taskStatus'

type Tab = 'report' | 'timeline' | 'diff'

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '—'
  if (seconds < 60) return `${Math.round(seconds)}s`
  const minutes = Math.floor(seconds / 60)
  const remainder = Math.round(seconds % 60)
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`
}

function SummaryItem({ label, value, tip }: { label: string; value: string; tip?: ReactNode }) {
  return (
    <div className="metric-cell">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
        {label}
        {tip && <InfoTip label={label}>{tip}</InfoTip>}
      </div>
      <div className="mt-2 break-words text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{value}</div>
    </div>
  )
}

export default function TaskDetail({ refreshKey }: { refreshKey: number }) {
  const { logId } = useParams()
  const [result, setResult] = useState<{ key: string; log?: TaskLog; error?: string }>({ key: '' })
  const [attempt, setAttempt] = useState(0)
  const requestKey = `${logId ?? ''}:${refreshKey}:${attempt}`
  const [tabSelection, setTabSelection] = useState<{ key: string; tab: Tab }>({ key: '', tab: 'report' })
  const tab = tabSelection.key === requestKey ? tabSelection.tab : 'report'

  useEffect(() => {
    let active = true
    if (!logId) {
      return () => { active = false }
    }
    api.getLog(logId)
      .then((log) => { if (active) setResult({ key: requestKey, log }) })
      .catch((reason: unknown) => { if (active) setResult({ key: requestKey, error: reason instanceof Error ? reason.message : String(reason) }) })
    return () => { active = false }
  }, [logId, requestKey])

  const log = result.key === requestKey ? result.log : undefined
  const error = result.key === requestKey ? result.error : undefined

  if (error) {
    return (
      <FeedbackState
        eyebrow="Task details"
        title="This task log couldn’t be loaded."
        description={error}
        action={{ label: 'Try again', onClick: () => setAttempt((value) => value + 1) }}
      />
    )
  }
  if (!logId) {
    return <FeedbackState eyebrow="Task details" title="The task log ID is missing from this link." action={{ label: 'Browse run history', to: '/runs' }} />
  }
  if (!log) return <LoadingState label="Loading task details" variant="taskDetail" />

  const status = statusOf({ resolved: log.resolved, error: log.error ?? null })
  const tabs: { id: Tab; label: string }[] = [
    { id: 'report', label: 'Report' },
    { id: 'timeline', label: `Activity (${log.call_log.length})` },
    { id: 'diff', label: 'Changes' },
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <Link to="/runs" className="text-sm hover:underline" style={{ color: 'var(--series-blue)' }}>← Run history</Link>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>Task log</p>
            <h1 className="mt-1 break-words text-2xl font-semibold tracking-tight sm:text-3xl">{log.benchmark_task ?? log.task_id}</h1>
            <p className="mt-2 break-words text-sm" style={{ color: 'var(--text-secondary)' }}>
              {new Date(log.started_at * 1000).toLocaleString()} · {log.mode} mode
            </p>
          </div>
          <div className="flex items-center gap-2 self-start">
            <CopyButton compact value={log.task_id} label="Copy task log ID" />
            <StatusBadge status={status} />
          </div>
        </div>
      </header>

      <section aria-label="Task summary" className="metric-strip">
        <SummaryItem label="Duration" value={formatDuration(log.duration_seconds)} tip="Wall-clock time from the agent starting to its final report." />
        <SummaryItem label="Tool calls" value={String(log.call_log.length)} tip="How many actions the agent took — reading files, searching, editing, running tests. See the Activity tab for each one." />
        <SummaryItem label="Test attempts" value={log.test_iterations == null ? 'Not recorded' : String(log.test_iterations)} tip="How many times the agent ran the test suite in the sandbox while iterating toward a fix (capped per run)." />
        <SummaryItem label="Model" value={log.model ?? 'Not recorded'} tip="The LLM that drove the agent loop for this task." />
      </section>

      {log.error && (
        <div className="rounded-xl border p-4 text-sm" style={{ background: 'var(--status-warning-bg)', borderColor: 'var(--border)', color: 'var(--status-warning)' }}>
          <div className="font-semibold">The task ended with an error</div>
          <p className="mt-1 break-words">{log.error}</p>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
        <div className="border-b px-4 pt-2 sm:px-6" style={{ borderColor: 'var(--border)' }}>
          <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Task details">
            {tabs.map(({ id, label }) => (
              <button
                key={id}
                id={`tab-${id}`}
                type="button"
                onClick={() => setTabSelection({ key: requestKey, tab: id })}
                role="tab"
                aria-selected={tab === id}
                aria-controls="task-detail-panel"
                tabIndex={tab === id ? 0 : -1}
                className="-mb-px min-h-11 shrink-0 border-b-2 px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:px-4"
                style={{ borderColor: tab === id ? 'var(--series-blue)' : 'transparent', color: tab === id ? 'var(--series-blue)' : 'var(--text-secondary)' }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div id="task-detail-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} tabIndex={0} className="min-h-48 p-4 sm:p-6">
          {tab === 'report' && <ReportCard report={log.report} />}
          {tab === 'timeline' && <Timeline calls={log.call_log} />}
          {tab === 'diff' && <DiffView diff={log.diff ?? ''} />}
        </div>
      </section>

      <details className="overflow-hidden rounded-xl border" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-blue-500 sm:px-5" style={{ color: 'var(--text-primary)' }}>
          Task prompt and environment
        </summary>
        <div className="space-y-4 border-t p-4 sm:p-5" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between gap-3"><span className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>Original request</span><CopyButton compact value={log.task_description} label="Copy task prompt" /></div>
          <pre className="max-h-96 overflow-auto break-words whitespace-pre-wrap rounded-lg p-3 text-xs leading-relaxed" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>{log.task_description || 'No task prompt was recorded.'}</pre>
          <div className="detail-grid">
            <SummaryItem label="Repository" value={log.repo_root || 'Not recorded'} />
            <SummaryItem label="Iteration limit" value={String(log.max_iterations)} />
            <SummaryItem label="Started" value={new Date(log.started_at * 1000).toLocaleString()} />
            <SummaryItem label="Finished" value={new Date(log.finished_at * 1000).toLocaleString()} />
          </div>
        </div>
      </details>
    </div>
  )
}
