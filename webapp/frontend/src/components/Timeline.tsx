import { useMemo, useState } from 'react'
import { CaretDown, CaretRight, MagnifyingGlass } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'framer-motion'
import type { ToolCall } from '../api'
import CopyButton from './CopyButton'
import ToolIcon from './ToolIcon'

function formatValue(value: unknown) {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2) ?? String(value)
  } catch {
    return String(value)
  }
}

function isRunTestsOutput(output: unknown): output is { passed: boolean; output?: string } {
  return typeof output === 'object' && output !== null && 'passed' in output && typeof output.passed === 'boolean'
}

function CallEntry({ call, index, open, onToggle }: { call: ToolCall; index: number; open: boolean; onToggle: () => void }) {
  const runTests = call.tool === 'run_tests' && isRunTestsOutput(call.output) ? call.output : null
  const inputText = formatValue(call.input)
  const outputText = formatValue(call.output)
  const testPassed = runTests?.passed

  return (
    <motion.li layout className="relative min-w-0 pb-5 pl-10" transition={{ type: 'spring', stiffness: 320, damping: 28 }}>
      <span className="absolute left-0 top-0.5 flex h-7 w-7 items-center justify-center rounded-full border" style={{ background: testPassed === undefined ? 'var(--surface-2)' : testPassed ? 'var(--status-good-bg)' : 'var(--status-critical-bg)', borderColor: 'var(--border)' }} aria-hidden="true">
        <ToolIcon tool={call.tool} />
      </span>
      <div className="min-w-0 overflow-hidden rounded-xl border" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
        <button type="button" aria-expanded={open} onClick={onToggle} className="flex min-h-14 w-full min-w-0 items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-2)] sm:px-4">
          <span className="min-w-0">
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <code className="break-all text-xs font-semibold sm:text-sm">{call.tool}</code>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>STEP {index + 1}{call.iteration != null ? ` · ITERATION ${call.iteration}` : ''}</span>
              {runTests && <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: runTests.passed ? 'var(--status-good-bg)' : 'var(--status-critical-bg)', color: runTests.passed ? 'var(--status-good)' : 'var(--status-critical)' }}>{runTests.passed ? 'PASSED' : 'FAILED'}</span>}
            </span>
            {call.reason && <span className="mt-1 block truncate text-xs" style={{ color: 'var(--text-secondary)' }}>{call.reason}</span>}
          </span>
          {open ? <CaretDown size={17} aria-hidden="true" /> : <CaretRight size={17} aria-hidden="true" />}
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="tool-detail"
              layout
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="overflow-hidden border-t"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="grid gap-4 p-3 sm:grid-cols-2 sm:p-4">
                {[
                  { label: 'Input', value: inputText },
                  { label: 'Output', value: outputText },
                ].map((item) => (
                  <section key={item.label} className="min-w-0">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>{item.label}</h3>
                      <CopyButton compact value={item.value} label={`Copy ${item.label.toLowerCase()}`} />
                    </div>
                    <pre className="max-h-72 min-h-12 overflow-auto rounded-lg p-3 text-[11px] leading-relaxed" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>{item.value || 'No data recorded.'}</pre>
                  </section>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.li>
  )
}

export default function Timeline({ calls }: { calls: ToolCall[] }) {
  const [query, setQuery] = useState('')
  const [openSteps, setOpenSteps] = useState<Set<number>>(() => new Set())

  const visibleCalls = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return calls.map((call, index) => ({ call, index })).filter(({ call }) => {
      if (!needle) return true
      return `${call.tool} ${call.reason ?? ''} ${formatValue(call.input)} ${formatValue(call.output)}`.toLowerCase().includes(needle)
    })
  }, [calls, query])

  function toggleStep(index: number) {
    setOpenSteps((previous) => {
      const next = new Set(previous)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  if (calls.length === 0) {
    return <div className="rounded-xl border p-6 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>No tool calls were recorded for this task.</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full max-w-sm">
          <label htmlFor="timeline-search" className="filter-label">Find an action</label>
          <div className="relative">
            <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
            <input id="timeline-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tool, reason, input, or output" className="search-control pl-9" />
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span aria-live="polite">{visibleCalls.length} of {calls.length} steps</span>
          <button type="button" className="text-link" onClick={() => setOpenSteps(new Set(visibleCalls.map(({ index }) => index)))} disabled={visibleCalls.length === 0}>Expand visible</button>
          <button type="button" className="text-link" onClick={() => setOpenSteps(new Set())}>Collapse all</button>
        </div>
      </div>

      {visibleCalls.length === 0 ? (
        <div className="rounded-xl border p-6 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>No timeline steps match “{query}”.</div>
      ) : (
        <div className="relative">
          <div className="absolute bottom-5 left-[13px] top-0.5 w-px" style={{ background: 'var(--grid)' }} aria-hidden="true" />
          <ol className="relative m-0 list-none p-0">
            <AnimatePresence initial={false} mode="popLayout">
              {visibleCalls.map(({ call, index }) => <CallEntry key={`${call.iteration ?? 0}-${index}`} call={call} index={index} open={openSteps.has(index)} onToggle={() => toggleStep(index)} />)}
            </AnimatePresence>
          </ol>
        </div>
      )}
    </div>
  )
}
