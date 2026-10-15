import type {
  ApiError,
  ApiDetail,
  CalculationRecord,
  HistoryResponse,
  ValidationIssue,
} from './types'

/**
 * Thin fetch wrapper around the frozen REST contract.
 *   POST   /api/calculations
 *   GET    /api/history?limit=&offset=
 *   DELETE /api/history/{id}     -> 204 NO BODY
 *   DELETE /api/history          -> 204 NO BODY
 *   GET    /api/health
 */

const BASE = '/api'

/**
 * Convert the user-facing glyphs (× ÷ −) into wire operators (* / -)
 * before sending. We trim nothing else; the server validates expressions.
 */
export function normalizeExpression(raw: string): string {
  return raw.replace(/\u00d7/g, '*').replace(/\u00f7/g, '/').replace(/\u2212/g, '-')
}

async function parseDetail(res: Response): Promise<ApiDetail> {
  // 204 / empty bodies must not be JSON-parsed.
  if (res.status === 204) return null
  const text = await res.text()
  if (!text) return null
  try {
    const parsed = JSON.parse(text) as unknown
    if (parsed && typeof parsed === 'object' && 'detail' in parsed) {
      return (parsed as { detail: unknown }).detail as ApiDetail
    }
    return null
  } catch {
    return null
  }
}

function isValidationArray(value: unknown): value is ValidationIssue[] {
  return Array.isArray(value)
}

export function formatApiError(detail: ApiDetail): string {
  if (detail == null) return 'Something went wrong.'
  if (typeof detail === 'string') return detail
  if (isValidationArray(detail)) {
    if (detail.length === 0) return 'Invalid request.'
    return detail
      .map((issue) => {
        const where = issue.loc && issue.loc.length > 0 ? issue.loc.join('.') : 'request'
        return `${where}: ${issue.msg}`
      })
      .join('\n')
  }
  return 'Something went wrong.'
}

export class ApiCallError extends Error {
  readonly status: number
  readonly detail: ApiDetail

  constructor(apiError: ApiError) {
    super(formatApiError(apiError.detail))
    this.name = 'ApiCallError'
    this.status = apiError.status
    this.detail = apiError.detail
  }
}

function makeError(status: number, detail: ApiDetail): ApiCallError {
  return new ApiCallError({ status, detail })
}

interface RequestOptions {
  signal?: AbortSignal
}

export async function evaluateExpression(
  expression: string,
  options: RequestOptions = {},
): Promise<CalculationRecord> {
  const res = await fetch(`${BASE}/calculations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expression: normalizeExpression(expression) }),
    signal: options.signal,
  })
  if (!res.ok) {
    throw makeError(res.status, await parseDetail(res))
  }
  return (await res.json()) as CalculationRecord
}

export async function fetchHistory(
  limit: number,
  offset: number,
  options: RequestOptions = {},
): Promise<HistoryResponse> {
  const url = new URL(`${BASE}/history`, window.location.origin)
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('offset', String(offset))
  const res = await fetch(url.toString(), { signal: options.signal })
  if (!res.ok) {
    throw makeError(res.status, await parseDetail(res))
  }
  return (await res.json()) as HistoryResponse
}

export async function deleteHistoryEntry(
  id: number,
  options: RequestOptions = {},
): Promise<void> {
  const res = await fetch(`${BASE}/history/${id}`, {
    method: 'DELETE',
    signal: options.signal,
  })
  if (!res.ok && res.status !== 204) {
    throw makeError(res.status, await parseDetail(res))
  }
}

export async function clearHistory(options: RequestOptions = {}): Promise<void> {
  const res = await fetch(`${BASE}/history`, {
    method: 'DELETE',
    signal: options.signal,
  })
  if (!res.ok && res.status !== 204) {
    throw makeError(res.status, await parseDetail(res))
  }
}

export async function checkHealth(options: RequestOptions = {}): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/health`, { signal: options.signal })
    if (!res.ok) return false
    const data = (await res.json()) as { status?: string }
    return data.status === 'ok'
  } catch {
    return false
  }
}