import type { ReactNode } from 'react'
import { Info } from '@phosphor-icons/react'

/**
 * A small, keyboard-accessible "what does this mean?" tooltip. The popup
 * shows on hover and on keyboard focus (focus-within), so the explanation
 * is reachable without a mouse. Purely CSS-driven visibility - see the
 * `.infotip*` rules in index.css.
 */
export default function InfoTip({
  label,
  children,
  align = 'start',
}: {
  label: string
  children: ReactNode
  align?: 'start' | 'end'
}) {
  return (
    <span className="infotip">
      <button type="button" className="infotip-trigger" aria-label={`What is ${label}?`}>
        <Info size={13} weight="bold" aria-hidden="true" />
      </button>
      <span role="tooltip" className={`infotip-pop infotip-pop-${align}`}>
        <span className="infotip-title">{label}</span>
        {children}
      </span>
    </span>
  )
}
