import { useEffect, useRef, useState } from 'react'
import { SpinnerIcon, TrashIcon } from './icons'
import type { CalculationRecord } from '../types'

interface HistoryPanelProps {
  items: CalculationRecord[]
  total: number
  loading: boolean
  error: string | null
  onRetry: () => void
  onRestore: (expression: string) => void
  onDeleteOne: (id: number) => void
  onClearAll: () => void
  clearing: boolean
  deletingId: number | null
}

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat(undefined, DATE_FORMAT).format(date)
}

export function HistoryPanel(props: HistoryPanelProps) {
  const {
    items,
    total,
    loading,
    error,
    onRetry,
    onRestore,
    onDeleteOne,
    onClearAll,
    clearing,
    deletingId,
  } = props

  const [confirmingClear, setConfirmingClear] = useState(false)
  const confirmTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (confirmTimer.current !== null) {
        window.clearTimeout(confirmTimer.current)
      }
    }
  }, [])

  const handleClearClick = () => {
    if (!confirmingClear) {
      setConfirmingClear(true)
      // Auto-cancel the confirm state after a short window.
      confirmTimer.current = window.setTimeout(() => setConfirmingClear(false), 4000)
      return
    }
    if (confirmTimer.current !== null) {
      window.clearTimeout(confirmTimer.current)
      confirmTimer.current = null
    }
    setConfirmingClear(false)
    onClearAll()
  }

  return (
    <aside
      aria-label="Calculation history"
      className="panel flex h-full min-h-0 flex-col overflow-hidden"
    >
      <header className="flex items-center justify-between gap-3 border-b border-[color:var(--color-border-subtle)] px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-[color:var(--color-text-primary)]">
            History
          </h2>
          <p className="mt-0.5 text-xs text-[color:var(--color-text-muted)]">
            {loading
              ? 'Loading…'
              : `${total.toLocaleString()} calculation${total === 1 ? '' : 's'}`}
          </p>
        </div>
        <button
          type="button"
          onClick={handleClearClick}
          disabled={clearing || items.length === 0}
          aria-label={
            confirmingClear ? 'Confirm clear all history' : 'Clear all history'
          }
          className={`focus-ring inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border px-2.5 py-1.5 text-xs font-medium transition-colors ${
            confirmingClear
              ? 'border-[color:var(--color-danger)] text-[color:var(--color-danger)]'
              : 'border-[color:var(--color-border-subtle)] text-[color:var(--color-text-secondary)] hover:border-[color:var(--color-border-strong)] hover:text-[color:var(--color-text-primary)]'
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {clearing ? (
            <SpinnerIcon className="size-3.5 motion-safe:animate-spin" />
          ) : (
            <TrashIcon className="size-3.5" />
          )}
          {confirmingClear ? 'Tap again to confirm' : 'Clear all'}
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <HistorySkeleton />
        ) : error ? (
          <HistoryError message={error} onRetry={onRetry} />
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <ul role="list" className="divide-y divide-[color:var(--color-border-subtle)]">
            {items.map((item) => {
              const isDeleting = deletingId === item.id
              return (
                <li
                  key={item.id}
                  className="group relative flex items-center gap-3 px-5 py-3"
                >
                  <button
                    type="button"
                    onClick={() => onRestore(item.expression)}
                    className="focus-ring flex min-w-0 flex-1 flex-col items-start rounded-[var(--radius-sm)] px-1 py-0.5 text-left transition-colors hover:bg-[color:var(--color-surface-2)]"
                    aria-label={`Restore expression ${item.expression}`}
                  >
                    <span className="truncate font-mono text-sm text-[color:var(--color-text-secondary)]">
                      {item.expression}
                    </span>
                    <span className="mt-0.5 flex w-full items-baseline justify-between gap-3">
                      <span className="text-xs text-[color:var(--color-text-muted)]">
                        {formatTimestamp(item.created_at)}
                      </span>
                      <span className="truncate text-base font-semibold tabular-nums text-[color:var(--color-text-primary)]">
                        = {item.result}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteOne(item.id)}
                    disabled={isDeleting}
                    aria-label={`Delete calculation ${item.expression} equals ${item.result}`}
                    aria-busy={isDeleting || undefined}
                    className="focus-ring inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-transparent text-[color:var(--color-text-muted)] transition-colors hover:border-[color:var(--color-border-subtle)] hover:text-[color:var(--color-danger)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDeleting ? (
                      <SpinnerIcon className="size-4 motion-safe:animate-spin" />
                    ) : (
                      <TrashIcon className="size-4" />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </aside>
  )
}

function HistorySkeleton() {
  return (
    <ul role="list" className="divide-y divide-[color:var(--color-border-subtle)]">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="px-5 py-3">
          <div className="skeleton h-3 w-2/3" />
          <div className="mt-2 flex justify-between">
            <div className="skeleton h-2.5 w-16" />
            <div className="skeleton h-3.5 w-20" />
          </div>
        </li>
      ))}
    </ul>
  )
}

function HistoryError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <p className="text-sm text-[color:var(--color-danger)]">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="focus-ring rounded-[var(--radius-sm)] border border-[color:var(--color-border-subtle)] px-3 py-1.5 text-xs font-medium text-[color:var(--color-text-primary)] hover:border-[color:var(--color-border-strong)]"
      >
        Retry
      </button>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 px-6 py-10 text-center">
      <p className="text-sm font-medium text-[color:var(--color-text-secondary)]">
        No calculations yet
      </p>
      <p className="max-w-[24ch] text-xs text-[color:var(--color-text-muted)]">
        Type an expression above and press Enter to get started.
      </p>
    </div>
  )
}