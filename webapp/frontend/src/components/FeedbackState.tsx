import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Action =
  | { label: string; to: string; onClick?: never }
  | { label: string; onClick: () => void; to?: never }

export default function FeedbackState({
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  eyebrow?: string
  title: string
  description?: ReactNode
  action?: Action
  children?: ReactNode
}) {
  return (
    <section
      className="mx-auto flex min-h-[18rem] max-w-2xl flex-col items-start justify-center rounded-2xl border p-6 sm:p-8"
      style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}
      aria-labelledby="feedback-title"
    >
      {eyebrow && (
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
          {eyebrow}
        </div>
      )}
      <h1 id="feedback-title" className="text-xl font-semibold tracking-tight sm:text-2xl">
        {title}
      </h1>
      {description && (
        <div className="mt-2 max-w-prose text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </div>
      )}
      {children && <div className="mt-4 w-full">{children}</div>}
      {action && (
        <div className="mt-6">
          {'to' in action && action.to ? (
            <Link
              to={action.to}
              className="inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              style={{ background: 'var(--text-primary)', color: 'var(--surface-0)' }}
            >
              {action.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              style={{ background: 'var(--text-primary)', color: 'var(--surface-0)' }}
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </section>
  )
}

export function LoadingState({ label = 'Loading your workspace' }: { label?: string }) {
  return (
    <section className="space-y-6" role="status" aria-label={label}>
      <span className="sr-only">{label}…</span>
      <div className="animate-pulse space-y-2">
        <div className="h-7 w-48 rounded-md" style={{ background: 'var(--surface-2)' }} />
        <div className="h-4 w-full max-w-lg rounded-md" style={{ background: 'var(--surface-2)' }} />
      </div>
      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-xl" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }} />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }} />
    </section>
  )
}
