import { lazy, Suspense, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { ArrowClockwise, ListBullets, MagnifyingGlass, Moon, SquaresFour, Sun } from '@phosphor-icons/react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import CommandPalette from './components/CommandPalette'
import FeedbackState from './components/FeedbackState'
import { LoadingState } from './components/FeedbackState'
import type { LoadingVariant } from './components/FeedbackState'
import WorkspaceErrorBoundary from './components/WorkspaceErrorBoundary'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const RunDetail = lazy(() => import('./pages/RunDetail'))
const RunsPage = lazy(() => import('./pages/RunsPage'))
const TaskDetail = lazy(() => import('./pages/TaskDetail'))

type Theme = 'light' | 'dark'

const NAV_ITEMS = [
  { to: '/', label: 'Overview', end: true, icon: SquaresFour },
  { to: '/runs', label: 'Run history', end: false, icon: ListBullets },
] as const

function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = window.localStorage.getItem('loopfix-theme')
      if (saved === 'light' || saved === 'dark') return saved
    } catch {
      // Fall back to the system preference when browser storage is unavailable.
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      window.localStorage.setItem('loopfix-theme', theme)
    } catch {
      // The current session theme still works without persistent storage.
    }
  }, [theme])

  return [theme, setTheme] as const
}

function titleForPath(pathname: string) {
  if (pathname === '/') return 'Overview'
  if (pathname === '/runs') return 'Run history'
  if (/^\/runs\/\d+/.test(pathname)) return `Run ${pathname.split('/').at(-1)}`
  if (pathname.startsWith('/tasks/')) return 'Task inspection'
  return 'Workspace'
}

function loadingVariantForPath(pathname: string): LoadingVariant {
  if (pathname === '/runs') return 'runs'
  if (/^\/runs\/\d+/.test(pathname)) return 'runDetail'
  if (pathname.startsWith('/tasks/')) return 'taskDetail'
  return 'overview'
}

function SideNav() {
  return (
    <nav className="space-y-1" aria-label="Workspace">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        return (
          <NavLink key={item.to} to={item.to} end={item.end} className="block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rail-accent)]">
            {({ isActive }) => (
              <span className={`flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${isActive ? 'rail-active' : 'rail-link'}`}>
                <Icon size={19} weight={isActive ? 'fill' : 'regular'} aria-hidden="true" />
                {item.label}
              </span>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}

function IconAction({
  label,
  onClick,
  children,
  shortcut,
}: {
  label: string
  onClick: () => void
  children: ReactNode
  shortcut?: string
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={label}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 420, damping: 24 }}
      className="icon-button"
    >
      {children}
    </motion.button>
  )
}

function NotFound() {
  return (
    <FeedbackState
      eyebrow="Page not found"
      title="That Loopfix page doesn’t exist."
      description="The link may be old, or this record may have been removed from the local database."
      action={{ label: 'Back to overview', to: '/' }}
    />
  )
}

export default function App() {
  const [theme, setTheme] = useTheme()
  const [refreshKey, setRefreshKey] = useState(0)
  const [searchOpen, setSearchOpen] = useState(false)
  const location = useLocation()
  const pageTitle = titleForPath(location.pathname)

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  return (
    <MotionConfig reducedMotion="user">
      <div className="workspace-shell">
        <a href="#main-content" className="sr-only z-50 rounded-md px-3 py-2 focus:not-sr-only focus:fixed focus:left-4 focus:top-4" style={{ background: 'var(--surface-1)', color: 'var(--text-primary)' }}>
          Skip to content
        </a>

        <aside className="workspace-rail">
          <Link to="/" className="flex items-center gap-3 rounded-lg px-2 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rail-accent)]">
            <span className="brand-mark" aria-hidden="true">L</span>
            <span>
              <span className="block text-sm font-semibold tracking-tight">Loopfix</span>
              <span className="block text-[11px]" style={{ color: 'var(--rail-muted)' }}>Benchmark lab</span>
            </span>
          </Link>

          <div className="mt-10 px-3 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--rail-muted)' }}>Workspace</div>
          <div className="mt-2"><SideNav /></div>

          <div className="mt-auto rounded-xl border p-4" style={{ background: 'var(--rail-inset)', borderColor: 'var(--rail-border)' }}>
            <div className="flex items-center gap-2 text-xs font-medium">
              <span className="dataset-mark" aria-hidden="true" /> Local SQLite store
            </div>
            <p className="mt-2 text-[11px] leading-relaxed" style={{ color: 'var(--rail-muted)' }}>SQLite benchmark records · read-only access</p>
          </div>
          <div className="mt-4 flex items-center justify-between px-2 text-[10px]" style={{ color: 'var(--rail-muted)' }}>
            <span>LOCAL / READ ONLY</span><span>SQLite</span>
          </div>
        </aside>

        <div className="workspace-main">
          <header className="workspace-topbar">
            <div className="flex min-w-0 items-center gap-3">
              <Link to="/" className="mobile-brand lg:hidden" aria-label="Loopfix overview"><span className="brand-mark">L</span></Link>
              <div className="hidden h-4 w-px lg:block" style={{ background: 'var(--border)' }} />
              <div className="min-w-0">
                <div className="hidden text-[10px] font-semibold uppercase tracking-[0.13em] sm:block" style={{ color: 'var(--text-muted)' }}>Loopfix / local workspace</div>
                <div className="truncate text-sm font-semibold">{pageTitle}</div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <motion.button
                type="button"
                onClick={() => setSearchOpen(true)}
                whileTap={{ scale: 0.985 }}
                transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                className="search-trigger"
                aria-label="Search runs and tasks"
              >
                <MagnifyingGlass size={17} aria-hidden="true" />
                <span className="hidden md:inline">Search runs & tasks</span>
                <kbd className="hidden md:inline-flex">Ctrl K</kbd>
              </motion.button>
              <IconAction label="Refresh current view" onClick={() => setRefreshKey((key) => key + 1)}>
                <ArrowClockwise size={18} aria-hidden="true" />
              </IconAction>
              <IconAction label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
                {theme === 'light' ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
              </IconAction>
            </div>
          </header>

          <nav className="mobile-nav lg:hidden" aria-label="Main navigation">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              return <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `mobile-nav-item ${isActive ? 'is-active' : ''}`}><Icon size={17} aria-hidden="true" />{item.label}</NavLink>
            })}
          </nav>

          <main id="main-content" className="workspace-content">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                layout
              >
                <WorkspaceErrorBoundary key={location.pathname}>
                  <Suspense fallback={<LoadingState label={`Loading ${pageTitle.toLowerCase()}`} variant={loadingVariantForPath(location.pathname)} />}>
                    <Routes location={location}>
                      <Route path="/" element={<Dashboard refreshKey={refreshKey} />} />
                      <Route path="/runs" element={<RunsPage refreshKey={refreshKey} />} />
                      <Route path="/runs/:runId" element={<RunDetail refreshKey={refreshKey} />} />
                      <Route path="/tasks/:logId" element={<TaskDetail refreshKey={refreshKey} />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </WorkspaceErrorBoundary>
              </motion.div>
            </AnimatePresence>
          </main>
          <footer className="workspace-footer"><span>Loopfix benchmark lab</span><span>Local data · read-only</span></footer>
        </div>

        <CommandPalette key={refreshKey} open={searchOpen} onClose={() => setSearchOpen(false)} />
      </div>
    </MotionConfig>
  )
}
