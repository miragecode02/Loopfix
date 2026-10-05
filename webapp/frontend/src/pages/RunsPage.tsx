import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type RunSummary } from '../api'
import FeedbackState, { LoadingState } from '../components/FeedbackState'
import RunHistory from '../components/RunHistory'
import RunComparison from '../components/RunComparison'

export default function RunsPage({ refreshKey }: { refreshKey: number }) {
  const [result, setResult] = useState<{ requestKey: string; runs?: RunSummary[]; error?: string }>({ requestKey: '' })
  const [attempt, setAttempt] = useState(0)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const requestKey = `${refreshKey}:${attempt}`

  useEffect(() => {
    let active = true
    api.listRuns()
      .then((runs) => { if (active) setResult({ requestKey, runs }) })
      .catch((reason: unknown) => { if (active) setResult({ requestKey, error: reason instanceof Error ? reason.message : String(reason) }) })
    return () => { active = false }
  }, [requestKey])

  const error = result.requestKey === requestKey ? result.error : undefined
  const runs = result.requestKey === requestKey ? result.runs : undefined

  if (error) {
    return (
      <FeedbackState
        eyebrow="Run history"
        title="Couldn’t load your runs."
        description={<><span>{error}</span><span className="mt-2 block">Check the API connection and retry.</span></>}
        action={{ label: 'Try again', onClick: () => setAttempt((value) => value + 1) }}
      />
    )
  }
  if (!runs) return <LoadingState label="Loading benchmark run history" />

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link to="/" className="text-sm hover:underline" style={{ color: 'var(--series-blue)' }}>← Overview</Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Run history</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Find a session by run number or model, compare outcomes, then open a run to explore each task trace.
          </p>
        </div>
        <div className="rounded-lg border px-3 py-2 text-sm" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
          <span className="font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{runs.length}</span> {runs.length === 1 ? 'run' : 'runs'} recorded
        </div>
      </header>
      {runs.length > 1 && <RunComparison runs={runs} selectedIds={selectedIds.filter((id) => runs.some((run) => run.id === id))} onChange={setSelectedIds} />}
      <RunHistory runs={runs} controls />
    </div>
  )
}
