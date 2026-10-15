import { Calculator } from './components/Calculator'
import { CalculatorIcon } from './components/icons'

export default function App() {
  return (
    <div className="flex h-full min-h-screen flex-col bg-[color:var(--color-surface-0)] text-[color:var(--color-text-primary)]">
      <header className="border-b border-[color:var(--color-border-subtle)]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-[color:var(--color-surface-2)] text-[color:var(--color-accent)] ring-1 ring-[color:var(--color-border-subtle)]"
            >
              <CalculatorIcon className="size-4" />
            </span>
            <div className="leading-tight">
              <h1 className="text-sm font-semibold tracking-tight">
                Calculator
              </h1>
              <p className="text-xs text-[color:var(--color-text-muted)]">
                A small, keyboard-friendly calculator with history.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-6">
        <Calculator />
      </main>

      <footer className="border-t border-[color:var(--color-border-subtle)]">
        <div className="mx-auto w-full max-w-6xl px-5 py-3 text-xs text-[color:var(--color-text-muted)]">
          Tip: focus anywhere on the page and type a calculation. Enter evaluates, Esc clears.
        </div>
      </footer>
    </div>
  )
}