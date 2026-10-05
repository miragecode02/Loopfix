import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from '@phosphor-icons/react'
import { motion } from 'framer-motion'

export default function CopyButton({ value, label, compact = false }: { value: string; label: string; compact?: boolean }) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle')
  const timeoutRef = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timeoutRef.current), [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setState('copied')
    } catch {
      setState('error')
    }
    window.clearTimeout(timeoutRef.current)
    timeoutRef.current = window.setTimeout(() => setState('idle'), 1800)
  }

  const statusLabel = state === 'copied' ? 'Copied' : state === 'error' ? 'Copy failed' : label
  return (
    <motion.button
      type="button"
      onClick={copy}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 24 }}
      aria-label={state === 'idle' ? label : statusLabel}
      title={state === 'error' ? 'Clipboard access was blocked' : statusLabel}
      className={compact ? 'icon-button' : 'action-button action-button-secondary'}
    >
      {state === 'copied' ? <Check size={compact ? 17 : 16} weight="bold" aria-hidden="true" /> : <Copy size={compact ? 17 : 16} aria-hidden="true" />}
      {!compact && <span>{statusLabel}</span>}
      {compact && <span className="sr-only" aria-live="polite">{statusLabel}</span>}
    </motion.button>
  )
}
