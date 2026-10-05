import CopyButton from './CopyButton'

const LABELS = ['STATUS', 'ROOT CAUSE', 'CHANGES MADE', 'TEST RESULTS', 'CONFIDENCE', 'NOT CHECKED'] as const

function parseReport(report: string): Partial<Record<(typeof LABELS)[number], string>> {
  const pattern = new RegExp(`^(${LABELS.join('|')}):\\s*`, 'gm')
  const matches = [...report.matchAll(pattern)]
  const out: Partial<Record<(typeof LABELS)[number], string>> = {}
  matches.forEach((m, i) => {
    const label = m[1] as (typeof LABELS)[number]
    const start = m.index! + m[0].length
    const end = i + 1 < matches.length ? matches[i + 1].index! : report.length
    out[label] = report.slice(start, end).trim()
  })
  return out
}

export default function ReportCard({ report }: { report: string | null }) {
  if (!report) {
    return (
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        No final report was produced (the agent likely errored before finishing).
      </p>
    )
  }
  const sections = parseReport(report)
  if (Object.keys(sections).length === 0) {
    // fell back to the raw report - the model didn't follow the template
    return (
      <div>
        <div className="mb-3 flex items-center justify-between gap-3"><span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Raw report</span><CopyButton compact value={report} label="Copy report" /></div>
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg p-3 text-sm" style={{ background: 'var(--surface-2)' }}>{report}</pre>
      </div>
    )
  }
  const status = sections.STATUS?.toLowerCase()
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
        <div><h2 className="text-sm font-semibold">Agent report</h2><p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Final assessment generated for this task.</p></div>
        <CopyButton compact value={report} label="Copy report" />
      </div>
      <div className="space-y-5">
        {LABELS.map((label) => {
          const value = sections[label]
          if (!value) return null
          const isStatus = label === 'STATUS'
          return (
            <div key={label}>
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>{label}</div>
              {isStatus ? (
                <span className="inline-block rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide" style={{ background: status === 'resolved' ? 'var(--status-good-bg)' : 'var(--status-critical-bg)', color: status === 'resolved' ? 'var(--status-good)' : 'var(--status-critical)' }}>{value}</span>
              ) : (
                <p className="max-w-4xl break-words whitespace-pre-wrap text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{value}</p>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
