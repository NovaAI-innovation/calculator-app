import type { SVGProps } from 'react'

/**
 * Inline SVG icon set — no icon CDNs, no remote fonts.
 * Each icon honors `currentColor` and inherits size from font-size where possible.
 */

type IconProps = SVGProps<SVGSVGElement> & { title?: string }

function Base({
  children,
  title,
  ...rest
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  )
}

export function BackspaceIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M9 6h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-7-6 7-6Z" />
      <path d="M13.5 9.5l-3 5" />
      <path d="M14 14.5l-3-5" />
    </Base>
  )
}

export function HistoryIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
      <path d="M12 7v5l3 2" />
    </Base>
  )
}

export function TrashIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </Base>
  )
}

export function KeyboardIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <path d="M6 10h.01" />
      <path d="M10 10h.01" />
      <path d="M14 10h.01" />
      <path d="M18 10h.01" />
      <path d="M7 14h10" />
    </Base>
  )
}

export function AlertIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 3l10 18H2L12 3Z" />
      <path d="M12 10v5" />
      <path d="M12 18.5v.5" />
    </Base>
  )
}

export function SpinnerIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 3a9 9 0 1 0 9 9" />
    </Base>
  )
}

export function CalculatorIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="5" y="2.5" width="14" height="19" rx="2" />
      <rect x="8" y="5.5" width="8" height="3" rx="0.5" />
      <path d="M8 12h.01" />
      <path d="M12 12h.01" />
      <path d="M16 12h.01" />
      <path d="M8 16h.01" />
      <path d="M12 16h.01" />
      <path d="M16 16h.01" />
      <path d="M8 19h8" />
    </Base>
  )
}