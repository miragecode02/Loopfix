export default function StatTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: string
}) {
  return (
    <div className="metric-cell">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
        {label}
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
