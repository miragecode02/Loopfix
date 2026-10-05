import type { TaskStatus } from '../utils/taskStatus'

const STYLES: Record<TaskStatus, { bg: string; fg: string; label: string; icon: string }> = {
  resolved: { bg: 'var(--status-good-bg)', fg: 'var(--status-good)', label: 'Resolved', icon: '✓' },
  unresolved: { bg: 'var(--status-critical-bg)', fg: 'var(--status-critical)', label: 'Unresolved', icon: '×' },
  errored: { bg: 'var(--status-warning-bg)', fg: 'var(--status-warning)', label: 'Errored', icon: '!' },
  unknown: { bg: 'var(--surface-2)', fg: 'var(--text-secondary)', label: 'Unknown', icon: '·' },
}

export default function StatusBadge({ status }: { status: TaskStatus }) {
  const s = STYLES[status]
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ background: s.bg, color: s.fg }}
    >
      <span aria-hidden>{s.icon}</span>
      {s.label}
    </span>
  )
}
