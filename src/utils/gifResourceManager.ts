import { decompressFrames, parseGIF } from 'gifuct-js'
import { getResourceFetchMs } from './fetchTiming'
import { decodeGifInWorker } from './gifWorkerPool'
import type { LoadedGif, GifLoadStats } from './types'

interface CacheEntry {
  data: LoadedGif
  refCount: number
}

interface LoadGifResourceOptions {
  skipPending?: boolean
  useWorker?: boolean
  workerConcurrency?: number
}

interface FetchResult {
  gif: LoadedGif
  networkTimeMs: number
  queueWaitMs: number
  decodeTimeMs: number
  wallMs: number
}

interface InFlightLoad {
  promise: Promise<FetchResult>
}

interface LoadGifResult {
  gif: LoadedGif
  stats: GifLoadStats
}

const cache = new Map<string, CacheEntry>()
const pending = new Map<string, InFlightLoad>()
const loadGeneration = new Map<string, number>()

function resourceKey(src: string): string {
  return src
}

function cacheHitStats(): GifLoadStats {
  return {
    networkTimeMs: 0,
    queueWaitMs: 0,
    decodeTimeMs: 0,
    totalMs: 0,
    fromCache: true,
    fromPending: false,
  }
}

function buildStats(
  networkTimeMs: number,
  queueWaitMs: number,
  decodeTimeMs: number,
  wallMs: number,
  options: { fromCache?: boolean; fromPending?: boolean },
): GifLoadStats {
  return {
    networkTimeMs,
    queueWaitMs,
    decodeTimeMs,
    totalMs: wallMs,
    fromCache: options.fromCache ?? false,
    fromPending: options.fromPending ?? false,
  }
}

async function decodeGifBuffer(
  buffer: ArrayBuffer,
  useWorker?: boolean,
  workerConcurrency?: number,
): Promise<{ gif: LoadedGif; decodeTimeMs: number; queueWaitMs: number }> {
  if (useWorker) {
    return decodeGifInWorker(buffer, workerConcurrency)
  }

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
    decodeTimeMs,
    queueWaitMs: 0,
  }
}

async function fetchGifData(
  src: string,
  options?: Pick<LoadGifResourceOptions, 'useWorker' | 'workerConcurrency'>,
): Promise<FetchResult> {
  const loadStart = performance.now()
  const response = await fetch(src, { mode: 'cors', credentials: 'omit' })
  if (!response.ok) {
    throw new Error(`Failed to load gif: ${response.status}`)
  }

  const buffer = await response.arrayBuffer()
  const networkTimeMs = getResourceFetchMs(response, performance.now() - loadStart)
  const { gif, decodeTimeMs, queueWaitMs } = await decodeGifBuffer(
    buffer,
    options?.useWorker,
    options?.workerConcurrency,
  )
  const wallMs = performance.now() - loadStart

  return {
    gif,
    networkTimeMs,
    queueWaitMs,
    decodeTimeMs,
    wallMs,
  }
}

export async function loadGifResource(
  src: string,
  options?: LoadGifResourceOptions,
): Promise<LoadGifResult> {
  const key = resourceKey(src)
  const cached = cache.get(key)
  if (cached) {
    return { gif: cached.data, stats: cacheHitStats() }
  }

  if (!options?.skipPending && pending.has(key)) {
    const inFlight = pending.get(key)!
    const waitStart = performance.now()
    const { gif } = await inFlight.promise
    const wallMs = performance.now() - waitStart

    let entry = cache.get(key)
    if (!entry) {
      cache.set(key, { data: gif, refCount: 0 })
      entry = cache.get(key)!
    }
    return {
      gif: entry.data,
      stats: buildStats(0, wallMs, 0, wallMs, { fromPending: true }),
    }
  }

  const generation = (loadGeneration.get(key) ?? 0) + 1
  loadGeneration.set(key, generation)

  const inFlight: InFlightLoad = { promise: undefined! }
  inFlight.promise = fetchGifData(src, {
    useWorker: options?.useWorker,
    workerConcurrency: options?.workerConcurrency,
  })
    .then((result) => {
      if (loadGeneration.get(key) !== generation) {
        return result
      }
      pending.delete(key)
      cache.set(key, { data: result.gif, refCount: 0 })
      return result
    })
    .catch((error) => {
      if (loadGeneration.get(key) === generation) {
        pending.delete(key)
      }
      throw error
    })

  pending.set(key, inFlight)

  const { gif, networkTimeMs, queueWaitMs, decodeTimeMs, wallMs } = await inFlight.promise
  return { gif, stats: buildStats(networkTimeMs, queueWaitMs, decodeTimeMs, wallMs, {}) }
}

export function acquireGifResource(src: string, _useWorker?: boolean): void {
  const entry = cache.get(resourceKey(src))
  if (!entry) return
  entry.refCount += 1
}

export function releaseGifResource(src: string, _useWorker?: boolean): void {
  const key = resourceKey(src)
  const entry = cache.get(key)
  if (!entry) return

  entry.refCount -= 1
  if (entry.refCount <= 0) {
    cache.delete(key)
  }
}

export function clearGifResourceCache(): void {
  cache.clear()
  pending.clear()
  loadGeneration.clear()
}
