import { forwardRef } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'

interface DisplayProps {
  expression: string
  onChange: (next: string) => void
  onSubmit: () => void
  onEscape: () => void
  result: string | null
  hasResult: boolean
  error: string | null
  pending: boolean
}

/**
 * The expression lives in an editable text input. Once we have one, a
 * visually dominant result readout appears beneath it.
 */
export const Display = forwardRef<HTMLInputElement, DisplayProps>(function Display(
  { expression, onChange, onSubmit, onEscape, result, hasResult, error, pending },
  ref,
) {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Inside the expression input, only Enter / Escape are intercepted —
    // everything else (digits, Backspace, arrows) flows natively.
    if (event.key === 'Enter') {
      event.preventDefault()
      onSubmit()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onEscape()
    }
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value)
  }

  return (
    <section
      aria-label="Expression"
      className="rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-2)] px-5 pt-4 pb-5"
    >
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor="expression"
          className="text-xs font-medium tracking-wide uppercase text-[color:var(--color-text-muted)]"
        >
          Expression
        </label>
        {pending ? (
          <span
            className="inline-flex items-center gap-1.5 text-xs text-[color:var(--color-text-secondary)]"
            aria-live="polite"
          >
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-[color:var(--color-accent)] motion-safe:animate-pulse"
            />
            calculating
          </span>
        ) : null}
      </div>

      <input
        ref={ref}
        id="expression"
        type="text"
        inputMode="text"
        autoComplete="off"
        spellCheck={false}
        value={expression}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        aria-label="Calculator expression"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? 'expression-error' : undefined}
        placeholder="Type an expression, e.g. (12 + 8) × 3"
        className="focus-ring mt-2 block w-full bg-transparent text-2xl font-medium tracking-tight text-[color:var(--color-text-primary)] placeholder:text-[color:var(--color-text-muted)] outline-none tabular-nums"
      />

      {error ? (
        <p
          id="expression-error"
          role="alert"
          className="mt-2 whitespace-pre-line text-sm leading-snug text-[color:var(--color-danger)]"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex items-end justify-between gap-4 border-t border-[color:var(--color-border-subtle)] pt-4">
        <span className="text-xs font-medium tracking-wide uppercase text-[color:var(--color-text-muted)]">
          Result
        </span>
        <span
          aria-live="polite"
          aria-atomic
          className="max-w-full truncate text-right text-4xl font-semibold leading-none text-[color:var(--color-text-primary)] tabular-nums"
        >
          {hasResult && result !== null ? result : <span className="text-[color:var(--color-text-muted)]">·</span>}
        </span>
      </div>
    </section>
  )
})