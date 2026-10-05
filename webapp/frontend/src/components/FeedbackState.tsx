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

export type LoadingVariant = 'overview' | 'runDetail' | 'taskDetail' | 'runs'

/** A single animated placeholder block tinted to sit on a card surface. */
function Line({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md ${className}`} style={{ background: 'var(--surface-2)' }} />
}

/** The bordered 4-cell metric strip, matching the real one on every page that has it. */
function MetricStripSkeleton() {
  return (
    <div className="metric-strip">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="metric-cell">
          <Line className="h-2.5 w-24" />
          <Line className="mt-3 h-7 w-20" />
          <Line className="mt-2 h-3 w-28" />
        </div>
      ))}
    </div>
  )
}

function HeaderSkeleton({ titleWidth = 'w-64' }: { titleWidth?: string }) {
  return (
    <div className="space-y-3">
      <Line className="h-3 w-28" />
      <Line className={`h-8 ${titleWidth}`} />
      <Line className="h-4 w-full max-w-md" />
    </div>
  )
}

/**
 * Skeleton loaders shaped to the page they stand in for, so the layout
 * doesn't jump when real data arrives. Pick the variant that matches the
 * route; `overview` is the default.
 */
export function LoadingState({
  label = 'Loading your workspace',
  variant = 'overview',
}: {
  label?: string
  variant?: LoadingVariant
}) {
  return (
    <section className="space-y-8" role="status" aria-label={label}>
      <span className="sr-only">{label}…</span>

      {variant === 'overview' && (
        <>
          <HeaderSkeleton titleWidth="w-80" />
          <MetricStripSkeleton />
          <div className="benchmark-panel h-72 animate-pulse" />
        </>
      )}

      {variant === 'runDetail' && (
        <>
          <HeaderSkeleton titleWidth="w-40" />
          <MetricStripSkeleton />
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-xl" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }} />
            ))}
          </div>
        </>
      )}

      {variant === 'taskDetail' && (
        <>
          <HeaderSkeleton titleWidth="w-72" />
          <MetricStripSkeleton />
          <div className="overflow-hidden rounded-2xl border" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
            <div className="flex gap-2 border-b p-3" style={{ borderColor: 'var(--border)' }}>
              {['w-16', 'w-20', 'w-16'].map((width) => <Line key={width} className={`h-8 ${width}`} />)}
            </div>
            <div className="space-y-3 p-5">
              <Line className="h-3 w-24" />
              <Line className="h-4 w-full max-w-xl" />
              <Line className="h-4 w-full max-w-lg" />
              <Line className="h-4 w-full max-w-md" />
            </div>
          </div>
        </>
      )}

      {variant === 'runs' && (
        <>
          <HeaderSkeleton titleWidth="w-48" />
          <div className="benchmark-panel h-60 animate-pulse" />
          <div className="overflow-hidden rounded-xl border" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className={`flex items-center gap-4 p-4 ${index > 0 ? 'border-t' : ''}`} style={{ borderColor: 'var(--border)' }}>
                <Line className="h-4 w-10" />
                <Line className="h-4 w-32" />
                <Line className="ml-auto h-4 w-24" />
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
