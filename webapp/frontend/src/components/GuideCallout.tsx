import { useState } from 'react'
import { BookOpen, X } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'framer-motion'

const STORAGE_KEY = 'loopfix-guide-dismissed'

/**
 * A one-time "how to read this workspace" explainer for first-time
 * visitors. Dismissible, and the dismissal is remembered locally so it
 * doesn't nag on every visit. A "Show guide" affordance is left behind so
 * it can always be brought back.
 */
export default function GuideCallout() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      return false
    }
  })

  function setPersisted(next: boolean) {
    setDismissed(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
    } catch {
      // Dismissal still works for this session without persistent storage.
    }
  }

  if (dismissed) {
    return (
      <button type="button" onClick={() => setPersisted(false)} className="guide-reopen">
        <BookOpen size={14} aria-hidden="true" /> How to read this workspace
      </button>
    )
  }

  return (
    <AnimatePresence initial={false}>
      <motion.aside
        key="guide"
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        className="guide-callout"
        aria-label="How to read this workspace"
      >
        <div className="guide-callout-inner">
          <div className="guide-icon" aria-hidden="true"><BookOpen size={18} /></div>
          <div className="min-w-0">
            <h2 className="guide-title">How to read this workspace</h2>
            <p className="guide-body">
              Loopfix runs an AI agent against a benchmark of broken Python repositories and checks whether its
              fix makes the tests pass again. Each <strong>session</strong> is one full benchmark run over every task.
            </p>
            <ul className="guide-list">
              <li><span className="guide-dot guide-dot-good" aria-hidden="true" /><strong>Resolved</strong> — the agent's patch made the tests pass.</li>
              <li><span className="guide-dot guide-dot-bad" aria-hidden="true" /><strong>Unresolved</strong> — the agent finished, but its patch didn't fix the tests.</li>
              <li><span className="guide-dot guide-dot-warn" aria-hidden="true" /><strong>Errored</strong> — the run crashed before finishing (usually a model rate limit), so it isn't counted against the agent's fix quality.</li>
            </ul>
            <p className="guide-body">
              Open any run to see every tool call the agent made and the exact patch it wrote.
            </p>
          </div>
          <button type="button" onClick={() => setPersisted(true)} className="guide-close" aria-label="Dismiss guide">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </motion.aside>
    </AnimatePresence>
  )
}
