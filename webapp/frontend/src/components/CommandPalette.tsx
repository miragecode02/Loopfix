import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowElbowDownLeft, MagnifyingGlass, Terminal, Wrench, X } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { api, type RunDetail, type RunSummary, type TaskResult } from '../api'

type SearchEntry = {
  id: string
  title: string
  detail: string
  to: string
  kind: 'run' | 'task'
}

type IndexedRun = { run: RunSummary; tasks: TaskResult[] }

function makeEntries(index: IndexedRun[]) {
  return index.flatMap(({ run, tasks }) => {
    const runEntry: SearchEntry = {
      id: `run-${run.id}`,
      title: `Run #${run.id}`,
      detail: `${run.resolved_count}/${run.task_count} resolved · ${run.model ?? 'Model not recorded'}`,
      to: `/runs/${run.id}`,
      kind: 'run',
    }
    return [runEntry, ...tasks.map((task) => ({
      id: `task-${task.id}`,
      title: task.task_name,
      detail: `Run #${run.id} · ${task.error ? 'Errored' : task.resolved ? 'Resolved' : 'Unresolved'}`,
      to: task.log_id ? `/tasks/${encodeURIComponent(task.log_id)}` : `/runs/${run.id}`,
      kind: 'task' as const,
    }))]
  })
}

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [indexedRuns, setIndexedRuns] = useState<IndexedRun[] | null>(null)
  const [indexError, setIndexError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || indexedRuns || indexError) return
    let active = true
    api.listRuns()
      .then(async (runs) => {
        const details = await Promise.all(runs.slice(0, 12).map(async (run) => {
          try {
            const detail: RunDetail = await api.getRun(run.id)
            return { run, tasks: detail.tasks }
          } catch {
            return { run, tasks: [] }
          }
        }))
        if (active) setIndexedRuns(details)
      })
      .catch((reason: unknown) => {
        if (active) setIndexError(reason instanceof Error ? reason.message : String(reason))
      })
    return () => { active = false }
  }, [indexError, indexedRuns, open])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.body.style.overflow = 'hidden'
    inputRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      returnFocusRef.current?.focus()
    }
  }, [open])

  const entries = useMemo(() => indexedRuns ? makeEntries(indexedRuns) : [], [indexedRuns])
  const filteredEntries = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return entries.slice(0, 10)
    return entries.filter((entry) => `${entry.title} ${entry.detail}`.toLowerCase().includes(needle)).slice(0, 12)
  }, [entries, query])

  function close() {
    setQuery('')
    setActiveIndex(0)
    onClose()
  }

  function selectActive() {
    const entry = filteredEntries[activeIndex]
    if (!entry) return
    navigate(entry.to)
    close()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/35 px-3 pt-[12vh] backdrop-blur-[2px] sm:px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}
        >
          <motion.section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="command-title"
            className="w-full max-w-2xl overflow-hidden rounded-2xl border shadow-2xl"
            style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.99 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') close()
              if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex((index) => Math.min(index + 1, filteredEntries.length - 1)) }
              if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)) }
              if (event.key === 'Enter') { event.preventDefault(); selectActive() }
              if (event.key === 'Tab') {
                const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('input,button,a[href]')
                if (!focusable?.length) return
                const first = focusable[0]
                const last = focusable[focusable.length - 1]
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
              }
            }}
          >
            <h2 id="command-title" className="sr-only">Search runs and tasks</h2>
            <div className="flex items-center gap-3 px-4 sm:px-5">
              <MagnifyingGlass size={20} weight="regular" style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
              <input
                ref={inputRef}
                type="search"
                role="combobox"
                aria-expanded="true"
                aria-controls="command-results"
                aria-activedescendant={filteredEntries[activeIndex] ? `command-result-${filteredEntries[activeIndex].id}` : undefined}
                autoComplete="off"
                value={query}
                onChange={(event) => { setQuery(event.target.value); setActiveIndex(0) }}
                placeholder="Search run numbers, tasks, or models…"
                className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[var(--text-muted)]"
                style={{ color: 'var(--text-primary)' }}
              />
              <button type="button" onClick={close} className="icon-button" aria-label="Close search">
                <X size={18} weight="regular" aria-hidden="true" />
              </button>
            </div>
            <div className="border-t px-2 py-2" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
                <span>{query ? 'Matches' : 'Recent runs and tasks'}</span>
                <span>Local index · latest 12 runs</span>
              </div>
              <div id="command-results" role="listbox" aria-label="Search results" className="max-h-[min(55vh,28rem)] overflow-y-auto">
                {!indexedRuns && !indexError && <div className="px-3 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Indexing recent run details…</div>}
                {indexError && <div className="px-3 py-8 text-center text-sm" style={{ color: 'var(--status-critical)' }}><p>Couldn’t load search results: {indexError}</p><button type="button" className="text-link mt-2" onClick={() => { setIndexError(null); setIndexedRuns(null) }}>Retry indexing</button></div>}
                {indexedRuns && filteredEntries.length === 0 && <div className="px-3 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No matching runs or tasks.</div>}
                {filteredEntries.map((entry, index) => {
                  const Icon = entry.kind === 'run' ? Terminal : Wrench
                  return (
                    <Link
                      key={entry.id}
                      id={`command-result-${entry.id}`}
                      to={entry.to}
                      role="option"
                      aria-selected={activeIndex === index}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={close}
                      className={`flex min-h-14 items-center gap-3 rounded-lg px-3 py-2 transition-colors ${activeIndex === index ? 'bg-[var(--surface-2)]' : ''}`}
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--accent)' }}>
                        <Icon size={17} weight="regular" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{entry.title}</span>
                        <span className="mt-0.5 block truncate text-xs" style={{ color: 'var(--text-muted)' }}>{entry.detail}</span>
                      </span>
                      <ArrowElbowDownLeft size={16} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
                    </Link>
                  )
                })}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t px-4 py-3 text-xs sm:px-5" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              <span><kbd>↑</kbd> <kbd>↓</kbd> to navigate</span><span><kbd>↵</kbd> to open</span><span><kbd>Esc</kbd> to close</span>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
