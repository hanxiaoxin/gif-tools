export function getResourceFetchMs(response: Response, fallbackMs: number): number {
  if (typeof performance === 'undefined') return fallbackMs

  const entries = performance.getEntriesByName(response.url)
  const entry = entries[entries.length - 1] as PerformanceResourceTiming | undefined
  if (!entry) return fallbackMs

  if (entry.duration > 0) return entry.duration
  if (entry.responseEnd > entry.startTime) return entry.responseEnd - entry.startTime
  return fallbackMs
}
