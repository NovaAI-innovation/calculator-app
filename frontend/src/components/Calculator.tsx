import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Display } from './Display'
import { Keypad } from './Keypad'
import { HistoryPanel } from './HistoryPanel'
import {
  ApiCallError,
  clearHistory,
  deleteHistoryEntry,
  evaluateExpression,
  fetchHistory,
  formatApiError,
} from '../api'
import type { CalculationRecord } from '../types'
import { HISTORY_PAGE_SIZE } from '../types'

const DIGIT_CHARS = new Set(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'])
const OPERATOR_CHARS = new Set(['+', '-', '*', '/', '.', '(', ')'])

interface HistoryState {
  items: CalculationRecord[]
  total: number
  loading: boolean
  error: string | null
}

export function Calculator() {
  const [expression, setExpression] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [hasResult, setHasResult] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [history, setHistory] = useState<HistoryState>({
    items: [],
    total: 0,
    loading: true,
    error: null,
  })
  const [clearing, setClearing] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const inputRef = useRef<HTMLInputElement | null>(null)
  const evaluateSeq = useRef(0)
  const historyAbort = useRef<AbortController | null>(null)
  const evaluateAbort = useRef<AbortController | null>(null)

  const focusExpression = useCallback(() => {
    const el = inputRef.current
    if (el) el.focus()
  }, [])

  // ---- History loading ------------------------------------------------------

  const loadHistory = useCallback(async () => {
    historyAbort.current?.abort()
    const controller = new AbortController()
    historyAbort.current = controller
    setHistory((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const data = await fetchHistory(HISTORY_PAGE_SIZE, 0, { signal: controller.signal })
      if (controller.signal.aborted) return
      setHistory({
        items: data.items,
        total: data.total,
        loading: false,
        error: null,
      })
    } catch (err) {
      if (controller.signal.aborted) return
      setHistory({
        items: [],
        total: 0,
        loading: false,
        error: err instanceof ApiCallError ? formatApiError(err.detail) : 'Could not load history.',
      })
    }
  }, [])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  // ---- Helpers --------------------------------------------------------------

  const handleChangeExpression = useCallback((next: string) => {
    setExpression(next)
    if (submitError) setSubmitError(null)
  }, [submitError])

  const handleClear = useCallback(() => {
    setExpression('')
    setResult(null)
    setHasResult(false)
    setSubmitError(null)
  }, [])

  const handleBackspace = useCallback(() => {
    setExpression((prev) => prev.slice(0, -1))
    setSubmitError(null)
  }, [])

  const appendToken = useCallback(
    (token: string) => {
      setSubmitError(null)
      setExpression((prev) => {
        if (!hasResult || result === null) {
          return prev + token
        }
        // Continue-from-result vs start-new-expression logic:
        if (DIGIT_CHARS.has(token) || token === '.') {
          return token === '.' ? `0${token}` : token
        }
        if (OPERATOR_CHARS.has(token)) {
          return `${result}${token}`
        }
        return prev + token
      })
      // Result is consumed once the user extends the expression.
      if (hasResult) {
        setHasResult(false)
        setResult(null)
      }
    },
    [hasResult, result],
  )

  // ---- Submission -----------------------------------------------------------

  const submit = useCallback(async () => {
    const trimmed = expression.trim()
    if (!trimmed || pending) return

    evaluateAbort.current?.abort()
    const controller = new AbortController()
    evaluateAbort.current = controller
    const seq = ++evaluateSeq.current

    setPending(true)
    setSubmitError(null)
    try {
      const record = await evaluateExpression(trimmed, { signal: controller.signal })
      if (seq !== evaluateSeq.current) return
      setResult(record.result)
      setHasResult(true)
      setHistory((prev) => ({
        items: [record, ...prev.items].slice(0, HISTORY_PAGE_SIZE),
        total: prev.total + 1,
        loading: false,
        error: null,
      }))
    } catch (err) {
      if (controller.signal.aborted || seq !== evaluateSeq.current) return
      if (err instanceof ApiCallError) {
        setSubmitError(formatApiError(err.detail))
      } else {
        setSubmitError('Could not reach the server.')
      }
    } finally {
      if (seq === evaluateSeq.current) setPending(false)
    }
  }, [expression, pending])

  // ---- Keypad wiring ---------------------------------------------------------

  const handleKeypadKey = useCallback(
    (value: string) => {
      switch (value) {
        case 'CLEAR':
          handleClear()
          break
        case 'BACK':
          handleBackspace()
          break
        case 'EQUALS':
          void submit()
          break
        default:
          appendToken(value)
      }
      focusExpression()
    },
    [appendToken, focusExpression, handleBackspace, handleClear, submit],
  )

  // ---- History wiring -------------------------------------------------------

  const handleHistoryRestore = useCallback((next: string) => {
    setExpression(next)
    setResult(null)
    setHasResult(false)
    setSubmitError(null)
    focusExpression()
  }, [focusExpression])

  const handleDeleteOne = useCallback(async (id: number) => {
    if (deletingId !== null) return
    setDeletingId(id)
    try {
      await deleteHistoryEntry(id)
      setHistory((prev) => {
        const items = prev.items.filter((it) => it.id !== id)
        return {
          ...prev,
          items,
          total: Math.max(0, prev.total - 1),
        }
      })
    } catch {
      // Surface a lightweight error via the panel's own error channel.
      setHistory((prev) => ({
        ...prev,
        error: 'Could not delete that entry. Please try again.',
      }))
    } finally {
      setDeletingId(null)
    }
  }, [deletingId])

  const handleClearAll = useCallback(async () => {
    setClearing(true)
    try {
      await clearHistory()
      setHistory((prev) => ({
        ...prev,
        items: [],
        total: 0,
        error: null,
      }))
    } catch {
      setHistory((prev) => ({
        ...prev,
        error: 'Could not clear history. Please try again.',
      }))
    } finally {
      setClearing(false)
    }
  }, [])

  // ---- Global keyboard ------------------------------------------------------
  // Inside focus on the expression input we only intercept Enter/Escape;
  // everything else (digits, Backspace, +, -, *, /, (, )) flows natively.
  // Outside that focus the global handler drives the expression.

  useEffect(() => {
    const handler = (event: globalThis.KeyboardEvent) => {
      if (event.defaultPrevented) return
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const target = event.target as HTMLElement | null
      const isInput =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target?.isContentEditable ?? false)
      if (isInput) return

      if (event.key === 'Enter' || event.key === '=') {
        event.preventDefault()
        void submit()
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        handleClear()
        return
      }
      if (event.key === 'Backspace') {
        event.preventDefault()
        handleBackspace()
        return
      }

      const key = event.key
      if (DIGIT_CHARS.has(key) || OPERATOR_CHARS.has(key)) {
        event.preventDefault()
        appendToken(key)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [appendToken, handleBackspace, handleClear, submit])

  const shortcutHints = useMemo(
    () => [
      { keys: ['0–9'], desc: 'enter digits' },
      { keys: ['+', '−', '×', '÷'], desc: 'operators' },
      { keys: ['Enter'], desc: 'evaluate' },
      { keys: ['Esc'], desc: 'clear' },
      { keys: ['⌫'], desc: 'delete' },
    ],
    [],
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <section className="panel flex min-h-0 flex-col gap-4 p-5">
          <Display
            ref={inputRef}
            expression={expression}
            onChange={handleChangeExpression}
            onSubmit={() => {
              void submit()
            }}
            onEscape={handleClear}
            result={result}
            hasResult={hasResult}
            error={submitError}
            pending={pending}
          />
          <Keypad onKey={handleKeypadKey} disabled={pending} />
          <ShortcutHints hints={shortcutHints} />
        </section>

        <section className="min-h-0 min-w-0 lg:order-2 order-1">
          <HistoryPanel
            items={history.items}
            total={history.total}
            loading={history.loading}
            error={history.error}
            onRetry={() => {
              void loadHistory()
            }}
            onRestore={handleHistoryRestore}
            onDeleteOne={(id) => {
              void handleDeleteOne(id)
            }}
            onClearAll={() => {
              void handleClearAll()
            }}
            clearing={clearing}
            deletingId={deletingId}
          />
        </section>
      </div>
    </div>
  )
}

function ShortcutHints({
  hints,
}: {
  hints: Array<{ keys: string[]; desc: string }>
}) {
  return (
    <ul
      aria-label="Keyboard shortcuts"
      className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[color:var(--color-border-subtle)] pt-3 text-xs text-[color:var(--color-text-muted)]"
    >
      {hints.map((h) => (
        <li key={h.desc} className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1">
            {h.keys.map((k, idx) => (
              <kbd
                key={`${h.desc}-${k}-${idx}`}
                className="inline-flex min-w-[1.4rem] items-center justify-center rounded-[var(--radius-xs)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-2)] px-1.5 py-0.5 font-mono text-[10px] leading-none text-[color:var(--color-text-secondary)]"
              >
                {k}
              </kbd>
            ))}
          </span>
          <span>{h.desc}</span>
        </li>
      ))}
    </ul>
  )
}

// (no test re-exports)