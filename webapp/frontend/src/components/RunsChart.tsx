import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { RunSummary } from '../api'

const SEGMENTS = [
  { key: 'resolved_count', label: 'Resolved', color: 'var(--status-good)' },
  { key: 'unresolved_count', label: 'Unresolved', color: 'var(--status-critical)' },
  { key: 'errored_count', label: 'Errored', color: 'var(--status-warning)' },
] as const

type SegmentKey = (typeof SEGMENTS)[number]['key']

const BAR_W = 44
const CHART_H = 228
const PAD_L = 36
const PAD_B = 34
const MAX_CHART_WIDTH = 760

function totalForRun(run: RunSummary, visible: Set<SegmentKey>) {
  return SEGMENTS.reduce((total, segment) => total + (visible.has(segment.key) ? run[segment.key] : 0), 0)
}

export default function RunsChart({ runs }: { runs: RunSummary[] }) {
  const navigate = useNavigate()
  const chartViewportRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [visible, setVisible] = useState<Set<SegmentKey>>(() => new Set(SEGMENTS.map((segment) => segment.key)))
  const [hover, setHover] = useState<{ runId: number; seg: SegmentKey; value: number; x: number; y: number } | null>(null)

  useEffect(() => {
    const viewport = chartViewportRef.current
    if (!viewport || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => setContainerWidth(Math.floor(entry.contentRect.width)))
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [])

  const ordered = useMemo(() => [...runs].sort((a, b) => a.id - b.id), [runs])
  const activeSegments = SEGMENTS.filter((segment) => visible.has(segment.key))
  const maxTotal = Math.max(...ordered.map((run) => totalForRun(run, visible)), 1)
  const naturalWidth = PAD_L + ordered.length * (BAR_W + 26) + 32
  const width = naturalWidth > MAX_CHART_WIDTH ? naturalWidth : containerWidth ? Math.min(containerWidth, MAX_CHART_WIDTH) : naturalWidth
  const barWidth = Math.min(BAR_W, (width - PAD_L - 48 - 14 * Math.max(ordered.length - 1, 0)) / ordered.length)
  const barStep = ordered.length > 1 ? (width - PAD_L - 24 - barWidth) / (ordered.length - 1) : 0
  const yScale = (value: number) => (value / maxTotal) * (CHART_H - PAD_B)

  function toggleSegment(key: SegmentKey) {
    setVisible((previous) => {
      if (previous.has(key) && previous.size === 1) return previous
      const next = new Set(previous)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (runs.length === 0) {
    return <div className="benchmark-panel px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No runs fall within this time window. Choose another period to see outcomes.</div>
  }

  return (
    <section className="benchmark-panel min-w-0 overflow-hidden" aria-labelledby="outcome-chart-title">
      <div className="flex flex-col gap-4 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5" style={{ borderColor: 'var(--border)' }}>
        <div>
          <h2 id="outcome-chart-title" className="text-sm font-semibold">Outcome distribution</h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Select a run to inspect tasks. Toggle an outcome to isolate it.</p>
        </div>
        <div className="flex flex-wrap gap-1.5" aria-label="Toggle chart outcomes">
          {SEGMENTS.map((segment) => {
            const selected = visible.has(segment.key)
            const onlySelected = selected && visible.size === 1
            return (
              <motion.button
                key={segment.key}
                type="button"
                aria-pressed={selected}
                aria-label={`${selected ? 'Hide' : 'Show'} ${segment.label} outcomes`}
                disabled={onlySelected}
                onClick={() => toggleSegment(segment.key)}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 400, damping: 26 }}
                className="outcome-toggle"
                style={{ opacity: selected ? 1 : 0.52, cursor: onlySelected ? 'not-allowed' : 'pointer' }}
              >
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: segment.color }} aria-hidden="true" />
                {segment.label}
              </motion.button>
            )
          })}
        </div>
      </div>

      <div ref={chartViewportRef} className="max-w-full overflow-x-auto px-2 py-4 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--accent)] sm:px-4" role="region" aria-label="Interactive task outcome chart. Use the arrow keys to choose a run." tabIndex={0}>
        <svg width="100%" height={CHART_H} viewBox={`0 0 ${width} ${CHART_H}`} role="group" aria-label="Task outcomes per benchmark run" style={{ minWidth: `${width}px`, display: 'block' }}>
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
            const value = Math.round(maxTotal * fraction)
            const y = CHART_H - PAD_B - yScale(value)
            return <g key={fraction}><line x1={PAD_L} x2={width - 8} y1={y} y2={y} stroke="var(--grid)" strokeWidth={1} shapeRendering="crispEdges" /><text x={PAD_L - 9} y={y + 4} textAnchor="end" fontSize={10} fill="var(--text-muted)">{value}</text></g>
          })}

          {ordered.map((run, index) => {
            const x = ordered.length > 1 ? PAD_L + 10 + index * barStep : (width - barWidth) / 2
            let yCursor = CHART_H - PAD_B
            const outcomes = activeSegments.map((segment) => ({ segment, value: run[segment.key] })).filter(({ value }) => value > 0)
            return (
              <g
                key={run.id}
                role="link"
                tabIndex={0}
                aria-label={`Open run ${run.id}: ${run.resolved_count} of ${run.task_count} tasks resolved`}
                onClick={() => navigate(`/runs/${run.id}`)}
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(`/runs/${run.id}`) } }}
                className="chart-run"
              >
                {outcomes.map(({ segment, value }) => {
                  const height = Math.max(yScale(value), 1)
                  const y = yCursor - height
                  yCursor = y
                  return (
                    <rect
                      key={segment.key}
                      x={x}
                      y={y}
                      width={barWidth}
                      height={height}
                      rx={3}
                      fill={segment.color}
                      onMouseEnter={(event) => setHover({ runId: run.id, seg: segment.key, value, x: event.clientX, y: event.clientY })}
                      onMouseLeave={() => setHover(null)}
                      style={{ cursor: 'pointer' }}
                    />
                  )
                })}
                <text x={x + barWidth / 2} y={CHART_H - 10} textAnchor="middle" fontSize={10} fill="var(--text-muted)">#{run.id}</text>
                <text x={x + barWidth / 2} y={Math.max(14, CHART_H - PAD_B - yScale(totalForRun(run, visible)) - 7)} textAnchor="middle" fontSize={10} fontWeight={600} fill="var(--text-secondary)">{run.resolved_count}/{run.task_count}</text>
              </g>
            )
          })}
        </svg>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-[11px]" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
        <span>{ordered.length} {ordered.length === 1 ? 'session' : 'sessions'} · newest on right</span>
        <span>Click a column to inspect that run</span>
      </div>

      {hover && (
        <div className="pointer-events-none fixed z-40 rounded-lg border px-3 py-2 text-xs shadow-lg" style={{ left: Math.min(hover.x + 12, window.innerWidth - 180), top: Math.min(hover.y + 12, window.innerHeight - 70), background: 'var(--surface-1)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
          <div className="font-semibold">Run #{hover.runId}</div>
          <div className="mt-0.5" style={{ color: 'var(--text-secondary)' }}>{SEGMENTS.find((segment) => segment.key === hover.seg)?.label}: {hover.value}</div>
        </div>
      )}
    </section>
  )
}
