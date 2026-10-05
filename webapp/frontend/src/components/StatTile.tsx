import type { ReactNode } from 'react'
import InfoTip from './InfoTip'

export default function StatTile({
  label,
  value,
  sub,
  accent,
  tip,
}: {
  label: string
  value: string
  sub?: string
  accent?: string
  tip?: ReactNode
}) {
  return (
    <div className="metric-cell">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
        {label}
        {tip && <InfoTip label={label}>{tip}</InfoTip>}
      </div>
      <div
        className="mt-2 min-w-0 break-words font-mono text-2xl font-semibold leading-tight tabular-nums sm:text-3xl"
        style={{ color: accent ?? 'var(--text-primary)' }}
      >
        {value}
      </div>
      {sub && (
        <div className="mt-1 break-words text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {sub}
        </div>
      )}
    </div>
  )
}
