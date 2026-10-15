import { BackspaceIcon } from './icons'

type Variant = 'digit' | 'operator' | 'control' | 'equals'

interface KeyDef {
  label: string
  value: string
  variant: Variant
  ariaLabel?: string
  span?: number
}

const KEYS: KeyDef[] = [
  { label: 'C', value: 'CLEAR', variant: 'control', ariaLabel: 'Clear expression' },
  { label: '(', value: '(', variant: 'operator', ariaLabel: 'Open parenthesis' },
  { label: ')', value: ')', variant: 'operator', ariaLabel: 'Close parenthesis' },
  { label: '⌫', value: 'BACK', variant: 'control', ariaLabel: 'Backspace' },

  { label: '7', value: '7', variant: 'digit' },
  { label: '8', value: '8', variant: 'digit' },
  { label: '9', value: '9', variant: 'digit' },
  { label: '÷', value: '/', variant: 'operator', ariaLabel: 'Divide' },

  { label: '4', value: '4', variant: 'digit' },
  { label: '5', value: '5', variant: 'digit' },
  { label: '6', value: '6', variant: 'digit' },
  { label: '×', value: '*', variant: 'operator', ariaLabel: 'Multiply' },

  { label: '1', value: '1', variant: 'digit' },
  { label: '2', value: '2', variant: 'digit' },
  { label: '3', value: '3', variant: 'digit' },
  { label: '−', value: '-', variant: 'operator', ariaLabel: 'Subtract' },

  { label: '0', value: '0', variant: 'digit', span: 2 },
  { label: '.', value: '.', variant: 'digit', ariaLabel: 'Decimal point' },
  { label: '+', value: '+', variant: 'operator', ariaLabel: 'Add' },

  { label: '=', value: 'EQUALS', variant: 'equals', ariaLabel: 'Evaluate expression', span: 4 },
]

interface KeypadProps {
  onKey: (value: string) => void
  disabled?: boolean
}

export function Keypad({ onKey, disabled = false }: KeypadProps) {
  return (
    <div
      role="group"
      aria-label="Calculator keypad"
      className="grid grid-cols-4 gap-2"
    >
      {KEYS.map((k) => (
        <KeyButton
          key={`${k.label}-${k.value}`}
          label={k.label}
          ariaLabel={k.ariaLabel}
          variant={k.variant}
          span={k.span}
          disabled={disabled}
          onClick={() => onKey(k.value)}
        />
      ))}
    </div>
  )
}

interface KeyButtonProps {
  label: string
  ariaLabel?: string
  variant: Variant
  span?: number
  disabled?: boolean
  onClick: () => void
}

function KeyButton({ label, ariaLabel, variant, span = 1, disabled, onClick }: KeyButtonProps) {
  const colSpan = span > 1 ? `col-span-${span}` : ''
  const glyph = label === '⌫' ? <BackspaceIcon className="size-5" /> : label
  return (
    <button
      type="button"
      className={`key focus-ring ${colSpan}`}
      data-variant={variant}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel ?? label}
    >
      {glyph}
    </button>
  )
}