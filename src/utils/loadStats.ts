import type { GifLoadStats } from './types'

export type GifLoadStatsMode = 'fresh' | 'pending' | 'cache'

export interface GifLoadStatsLine {
  label: string
  valueMs: number
}

export interface GifLoadStatsView {
  mode: GifLoadStatsMode
  lines: GifLoadStatsLine[]
  totalMs: number
}

const STAT_LINES = [
  { key: 'networkTimeMs' as const, label: 'network' },
  { key: 'queueWaitMs' as const, label: 'queue' },
  { key: 'decodeTimeMs' as const, label: 'decode' },
]

export function getGifLoadStatsView(stats: GifLoadStats): GifLoadStatsView {
  const mode: GifLoadStatsMode = stats.fromCache
    ? 'cache'
    : stats.fromPending
      ? 'pending'
      : 'fresh'

  return {
    mode,
    lines: STAT_LINES.map(({ key, label }) => ({
      label,
      valueMs: stats[key],
    })),
    totalMs: stats.totalMs,
  }
}

export function formatLoadTimeMs(ms: number): string {
  return `${ms.toFixed(1)}ms`
}

export function getDebugDensity(
  width: number,
  height: number,
): 'compact' | 'medium' | 'full' {
  const min = Math.min(width, height)
  if (min < 130) return 'compact'
  if (min < 220) return 'medium'
  return 'full'
}

const MODE_SHORT: Record<GifLoadStatsMode, string> = {
  fresh: 'F',
  pending: 'P',
  cache: 'C',
}

export function formatGifLoadStatsCompact(stats: GifLoadStats): string {
  const view = getGifLoadStatsView(stats)
  const tag = MODE_SHORT[view.mode]
  if (view.mode === 'cache') return `${tag} · 0`
  return `${tag} · ${formatLoadTimeMs(stats.totalMs)}`
}
