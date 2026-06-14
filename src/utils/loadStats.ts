import type { GifLoadStats } from './types'

export function getTotalLoadTimeMs(stats: GifLoadStats): number {
  if (stats.fromCache) return 0
  if (stats.fromPending) return stats.pendingWaitFetchMs + stats.pendingWaitDecodeMs
  return stats.fetchTimeMs + stats.decodeTimeMs
}

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

export function getGifLoadStatsView(stats: GifLoadStats): GifLoadStatsView {
  if (stats.fromCache) {
    return {
      mode: 'cache',
      lines: [
        { label: 'wait fetch', valueMs: 0 },
        { label: 'wait decode', valueMs: 0 },
      ],
      totalMs: 0,
    }
  }
  if (stats.fromPending) {
    return {
      mode: 'pending',
      lines: [
        { label: 'wait fetch', valueMs: stats.pendingWaitFetchMs },
        { label: 'wait decode', valueMs: stats.pendingWaitDecodeMs },
      ],
      totalMs: stats.pendingWaitFetchMs + stats.pendingWaitDecodeMs,
    }
  }
  return {
    mode: 'fresh',
    lines: [
      { label: 'fetch', valueMs: stats.fetchTimeMs },
      { label: 'decode', valueMs: stats.decodeTimeMs },
    ],
    totalMs: stats.fetchTimeMs + stats.decodeTimeMs,
  }
}

export function formatGifLoadStats(stats: GifLoadStats): string {
  const view = getGifLoadStatsView(stats)
  const rows = view.lines.map((l) => `${l.label} ${l.valueMs.toFixed(1)}ms`).join('\n')
  return `${view.mode}\n${rows}\ntotal ${view.totalMs.toFixed(1)}ms`
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
  return `${tag} · ${formatLoadTimeMs(view.totalMs)}`
}

export function getGifLoadStatsLineLabel(line: GifLoadStatsLine, mode: GifLoadStatsMode): string {
  if (mode === 'fresh') {
    return line.label === 'fetch' ? 'f' : 'd'
  }
  return line.label === 'wait fetch' ? 'wf' : 'wd'
}
