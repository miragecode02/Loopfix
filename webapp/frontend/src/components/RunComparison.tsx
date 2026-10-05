import { ArrowsLeftRight, Check, Plus } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'framer-motion'
import type { RunSummary } from '../api'

function rate(run: RunSummary) {
  return run.task_count ? Math.round((run.resolved_count / run.task_count) * 100) : 0
}

function duration(run: RunSummary) {
  const seconds = Math.max(0, Math.round(run.finished_at - run.started_at))
  const minutes = Math.floor(seconds / 60)
  return minutes ? `${minutes}m ${seconds % 60}s` : `${seconds}s`
}

function delta(value: number, unit = '') {
  if (!value) return `0${unit}`
  return `${value > 0 ? '+' : '−'}${Math.abs(value)}${unit}`
}

export default function RunComparison({
  runs,
  selectedIds,
  onChange,
}: {
  runs: RunSummary[]
  selectedIds: number[]
  onChange: (ids: number[]) => void
}) {
  const availableRuns = runs.slice(0, 5)
  const selectedRuns = selectedIds
    .map((id) => runs.find((run) => run.id === id))
    .filter((run): run is RunSummary => !!run)
    .sort((a, b) => a.id - b.id)
  const earlier = selectedRuns[0]
  const later = selectedRuns[1]

  function toggle(runId: number) {
    if (selectedIds.includes(runId)) {
      onChange(selectedIds.filter((id) => id !== runId))
    } else if (selectedIds.length < 2) {
      onChange([...selectedIds, runId])
    }
  }

  return (
    <section aria-labelledby="compare-runs-heading" className="benchmark-panel overflow-hidden">
      <div className="grid lg:grid-cols-[minmax(15rem,0.8fr)_1.2fr]">
        <div className="border-b p-5 sm:p-6 lg:border-b-0 lg:border-r" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--accent)' }}>
            <ArrowsLeftRight size={16} aria-hidden="true" /> Comparative analysis
          </div>
          <h2 id="compare-runs-heading" className="mt-3 text-lg font-semibold tracking-tight">Compare two sessions</h2>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Choose two of the latest five runs to compare repair rate, errors, and runtime.
          </p>
          <div className="mt-5 space-y-1.5">
            {availableRuns.map((run) => {
              const selected = selectedIds.includes(run.id)
              const disabled = !selected && selectedIds.length >= 2
              return (
                <motion.button
                  layout
                  key={run.id}
                  type="button"
                  aria-pressed={selected}
                  disabled={disabled}
                  onClick={() => toggle(run.id)}
                  whileTap={disabled ? undefined : { scale: 0.985 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                  className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ background: selected ? 'var(--accent-soft)' : 'transparent', color: 'var(--text-primary)' }}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border" style={{ background: selected ? 'var(--accent)' : 'transparent', borderColor: selected ? 'var(--accent)' : 'var(--border-strong)', color: 'var(--accent-contrast)' }}>
                    {selected ? <Check size={13} weight="bold" aria-hidden="true" /> : <Plus size={13} aria-hidden="true" />}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">Run #{run.id}</span>
                  <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>{run.resolved_count}/{run.task_count}</span>
                </motion.button>
              )
            })}
          </div>
          <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }} aria-live="polite">
            {selectedIds.length === 0 ? 'Select two runs to start.' : `${selectedIds.length} of 2 selected`}
          </p>
        </div>

        <div className="min-h-40 p-5 sm:p-6 lg:min-h-72">
          <AnimatePresence mode="wait" initial={false}>
            {earlier && later ? (
              <motion.div
                key={`${earlier.id}-${later.id}`}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              >
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b pb-4" style={{ borderColor: 'var(--border)' }}>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>Earlier</div>
                    <div className="mt-1 font-mono text-lg font-semibold">#{earlier.id}</div>
                  </div>
                  <ArrowsLeftRight size={18} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
                  <div className="text-right">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>Later</div>
                    <div className="mt-1 font-mono text-lg font-semibold">#{later.id}</div>
                  </div>
                </div>
                <div className="mt-2 divide-y" style={{ borderColor: 'var(--border)' }}>
                  <div className="grid grid-cols-[minmax(5rem,1fr)_auto_auto_auto] items-center gap-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>
                    <span>Metric</span>
                    <span className="font-mono tabular-nums">#{earlier.id}</span>
                    <span className="font-mono tabular-nums">#{later.id}</span>
                    <span className="min-w-16 text-right">Change</span>
                  </div>
                  {[
                    { label: 'Resolved', before: `${earlier.resolved_count}/${earlier.task_count}`, after: `${later.resolved_count}/${later.task_count}`, change: delta(later.resolved_count - earlier.resolved_count, ' tasks'), positiveIsGood: true },
                    { label: 'Resolve rate', before: `${rate(earlier)}%`, after: `${rate(later)}%`, change: delta(rate(later) - rate(earlier), ' pp'), positiveIsGood: true },
                    { label: 'Errors', before: String(earlier.errored_count), after: String(later.errored_count), change: delta(later.errored_count - earlier.errored_count), positiveIsGood: false },
                    { label: 'Runtime', before: duration(earlier), after: duration(later), change: delta(Math.round(later.finished_at - later.started_at - (earlier.finished_at - earlier.started_at)), 's'), positiveIsGood: false },
                  ].map((row) => (
                    <div key={row.label} className="grid grid-cols-[minmax(5rem,1fr)_auto_auto_auto] items-center gap-3 py-3 text-sm">
                      <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                      <span className="font-mono text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>{row.before}</span>
                      <span className="font-mono text-xs font-semibold tabular-nums">{row.after}</span>
                      <span className="min-w-16 text-right font-mono text-xs tabular-nums" style={{ color: row.change.startsWith('+') ? (row.positiveIsGood ? 'var(--status-good)' : 'var(--status-critical)') : row.change.startsWith('−') ? (row.positiveIsGood ? 'var(--status-critical)' : 'var(--status-good)') : 'var(--text-muted)' }}>{row.change}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Each row reads earlier → later, then the change. <span style={{ color: 'var(--status-good)' }}>Green</span> marks an improvement, <span style={{ color: 'var(--status-critical)' }}>red</span> a regression. &ldquo;pp&rdquo; is percentage points.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="compare-empty"
                className="flex min-h-36 flex-col items-center justify-center text-center lg:min-h-60"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: 'var(--surface-2)', color: 'var(--accent)' }}>
                  <ArrowsLeftRight size={22} aria-hidden="true" />
                </div>
                <p className="mt-4 text-sm font-medium">A side-by-side view will appear here</p>
                <p className="mt-1 max-w-xs text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>Choose two sessions on the left to compare their recorded outcomes.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
