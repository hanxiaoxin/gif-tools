import { decompressFrames, parseGIF } from 'gifuct-js'
import type { LoadedGif, GifLoadStats } from './types'

interface CacheEntry {
  data: LoadedGif
  refCount: number
  fetchTimeMs: number
  decodeTimeMs: number
}

interface LoadGifResourceOptions {
  skipPending?: boolean
}

interface FetchResult {
  gif: LoadedGif
  fetchTimeMs: number
  decodeTimeMs: number
}

interface InFlightLoad {
  promise: Promise<FetchResult>
  fetchDoneAt: number | null
}

interface LoadGifResult {
  gif: LoadedGif
  stats: GifLoadStats
}

const cache = new Map<string, CacheEntry>()
const pending = new Map<string, InFlightLoad>()
const loadGeneration = new Map<string, number>()

function calcPendingWait(
  waitStart: number,
  waitEnd: number,
  fetchDoneAt: number | null,
): Pick<GifLoadStats, 'pendingWaitFetchMs' | 'pendingWaitDecodeMs'> {
  if (fetchDoneAt === null || waitStart >= fetchDoneAt) {
    return {
      pendingWaitFetchMs: 0,
      pendingWaitDecodeMs: waitEnd - waitStart,
    }
  }
  return {
    pendingWaitFetchMs: fetchDoneAt - waitStart,
    pendingWaitDecodeMs: waitEnd - fetchDoneAt,
  }
}

function cacheHitStats(): GifLoadStats {
  return {
    fetchTimeMs: 0,
    decodeTimeMs: 0,
    pendingWaitFetchMs: 0,
    pendingWaitDecodeMs: 0,
    fromCache: true,
    fromPending: false,
  }
}

function freshStats(fetchTimeMs: number, decodeTimeMs: number): GifLoadStats {
  return {
    fetchTimeMs,
    decodeTimeMs,
    pendingWaitFetchMs: 0,
    pendingWaitDecodeMs: 0,
    fromCache: false,
    fromPending: false,
  }
}

async function fetchGifData(
  src: string,
  inFlight?: InFlightLoad,
): Promise<FetchResult> {
  const fetchStart = performance.now()
  const response = await fetch(src, { mode: 'cors', credentials: 'omit' })
  if (!response.ok) {
    throw new Error(`Failed to load gif: ${response.status}`)
  }

  const buffer = await response.arrayBuffer()
  const fetchTimeMs = performance.now() - fetchStart
  if (inFlight) inFlight.fetchDoneAt = performance.now()

  const decodeStart = performance.now()
  const parsed = parseGIF(buffer)
  const frames = decompressFrames(parsed, true)
  const decodeTimeMs = performance.now() - decodeStart
  if (!frames.length) {
    throw new Error('GIF has no frames')
  }

  return {
    gif: {
      frames,
      width: parsed.lsd.width,
      height: parsed.lsd.height,
    },
    fetchTimeMs,
    decodeTimeMs,
  }
}

export async function loadGifResource(
  src: string,
  options?: LoadGifResourceOptions,
): Promise<LoadGifResult> {
  const cached = cache.get(src)
  if (cached) {
    return { gif: cached.data, stats: cacheHitStats() }
  }

  if (!options?.skipPending && pending.has(src)) {
    const inFlight = pending.get(src)!
    const waitStart = performance.now()
    const { gif, fetchTimeMs, decodeTimeMs } = await inFlight.promise
    const waitEnd = performance.now()
    const { pendingWaitFetchMs, pendingWaitDecodeMs } = calcPendingWait(
      waitStart,
      waitEnd,
      inFlight.fetchDoneAt,
    )
    let entry = cache.get(src)
    if (!entry) {
      cache.set(src, { data: gif, refCount: 0, fetchTimeMs, decodeTimeMs })
      entry = cache.get(src)!
    }
    return {
      gif: entry.data,
      stats: {
        fetchTimeMs: 0,
        decodeTimeMs: 0,
        pendingWaitFetchMs,
        pendingWaitDecodeMs,
        fromCache: false,
        fromPending: true,
      },
    }
  }

  const generation = (loadGeneration.get(src) ?? 0) + 1
  loadGeneration.set(src, generation)

  const inFlight: InFlightLoad = { fetchDoneAt: null, promise: undefined! }
  inFlight.promise = fetchGifData(src, inFlight)
    .then(({ gif, fetchTimeMs, decodeTimeMs }) => {
      if (loadGeneration.get(src) !== generation) {
        return { gif, fetchTimeMs, decodeTimeMs }
      }
      pending.delete(src)
      cache.set(src, { data: gif, refCount: 0, fetchTimeMs, decodeTimeMs })
      return { gif, fetchTimeMs, decodeTimeMs }
    })
    .catch((error) => {
      if (loadGeneration.get(src) === generation) {
        pending.delete(src)
      }
      throw error
    })

  pending.set(src, inFlight)

  const { gif, fetchTimeMs, decodeTimeMs } = await inFlight.promise
  return { gif, stats: freshStats(fetchTimeMs, decodeTimeMs) }
}

export function acquireGifResource(src: string): void {
  const entry = cache.get(src)
  if (!entry) return
  entry.refCount += 1
}

export function releaseGifResource(src: string): void {
  const entry = cache.get(src)
  if (!entry) return

  entry.refCount -= 1
  if (entry.refCount <= 0) {
    cache.delete(src)
  }
}

export function clearGifResourceCache(): void {
  cache.clear()
  pending.clear()
  loadGeneration.clear()
}
