/**
 * Shared types matching the frozen API contract.
 * record.result is a decimal STRING (e.g. "84", "-2.5", "0") — never
 * treat "0" as "no result".
 */
export interface CalculationRecord {
  id: number
  expression: string
  result: string
  created_at: string
}

export interface HistoryResponse {
  items: CalculationRecord[]
  total: number
}

/**
 * FastAPI-style validation error (pydantic v2). The /calculations endpoint
 * returns one of these per-field in the "detail" array on a 422.
 */
export interface ValidationIssue {
  type?: string
  loc?: Array<string | number>
  msg: string
  input?: unknown
}

export type ApiDetail = string | ValidationIssue[] | null | undefined

export interface ApiError {
  status: number
  detail: ApiDetail
}

export const HISTORY_PAGE_SIZE = 50