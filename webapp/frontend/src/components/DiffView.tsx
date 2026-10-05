import { useMemo, useState } from 'react'
import { ArrowsOutLineHorizontal, TextAlignLeft } from '@phosphor-icons/react'
import CopyButton from './CopyButton'

function lineStyle(line: string) {
  if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('diff --git')) return { color: 'var(--text-muted)' }
  if (line.startsWith('+')) return { background: 'var(--diff-add-bg)', color: 'var(--diff-add-fg)' }
  if (line.startsWith('-')) return { background: 'var(--diff-del-bg)', color: 'var(--diff-del-fg)' }
  if (line.startsWith('@@')) return { color: 'var(--accent)', fontWeight: 600 }
  return { color: 'var(--text-secondary)' }
}

export default function DiffView({ diff }: { diff: string }) {
  const [wrap, setWrap] = useState(false)
  const lines = useMemo(() => diff.split('\n'), [diff])
  const additions = lines.filter((line) => line.startsWith('+') && !line.startsWith('+++')).length
  const deletions = lines.filter((line) => line.startsWith('-') && !line.startsWith('---')).length
  const files = lines.filter((line) => line.startsWith('diff --git ')).length

  if (!diff.trim()) {
    return (
      <div className="rounded-xl border p-6" style={{ borderColor: 'var(--border)' }}>
        <div className="text-sm font-medium">No repository changes recorded</div>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>The agent may have diagnosed the issue without editing files.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border)' }}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-3 py-2.5 sm:px-4" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="font-semibold">Patch summary</span>
          {files > 0 && <span style={{ color: 'var(--text-muted)' }}>{files} {files === 1 ? 'file' : 'files'}</span>}
          <span className="font-mono" style={{ color: 'var(--status-good)' }}>+{additions}</span>
          <span className="font-mono" style={{ color: 'var(--status-critical)' }}>−{deletions}</span>
          <span style={{ color: 'var(--text-muted)' }}>{lines.length} lines</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" className="icon-button" aria-pressed={wrap} aria-label={wrap ? 'Disable line wrapping' : 'Wrap long lines'} title={wrap ? 'Disable line wrapping' : 'Wrap long lines'} onClick={() => setWrap((value) => !value)}>
            {wrap ? <ArrowsOutLineHorizontal size={16} aria-hidden="true" /> : <TextAlignLeft size={16} aria-hidden="true" />}
          </button>
          <CopyButton compact value={diff} label="Copy patch" />
        </div>
      </div>
      <pre className={`${wrap ? 'overflow-x-hidden whitespace-pre-wrap break-all' : 'overflow-x-auto whitespace-pre'} max-h-[70vh] p-3 text-[11px] leading-[1.65] sm:p-4`} style={{ background: 'var(--surface-2)' }}>
        {lines.map((line, index) => (
          <div key={index} className="min-w-0" style={lineStyle(line)}>
            <span className="mr-4 inline-block w-8 select-none text-right tabular-nums" style={{ color: 'var(--text-muted)', opacity: 0.72 }}>{index + 1}</span>
            {line || ' '}
          </div>
        ))}
      </pre>
    </div>
  )
}
