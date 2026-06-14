import type { ParsedFrame } from 'gifuct-js'

export interface LoadedGif {
  frames: ParsedFrame[]
  width: number
  height: number
}

export interface GifLoadStats {
  /** 浏览器侧实际网络/缓存读取耗时（Resource Timing） */
  networkTimeMs: number
  /** Worker 池排队，或 pending 跟随方等待进行中的加载 */
  queueWaitMs: number
  /** 本次实际 decode 耗时 */
  decodeTimeMs: number
  /** 墙钟总耗时（含主线程争用等未分项统计的等待） */
  totalMs: number
  fromCache: boolean
  fromPending: boolean
}

export interface CreateGifOptions {
  loopCount?: number
  onEnd?: () => void
  onPlay?: () => void
  onPause?: () => void
  onLoaded?: (stats: GifLoadStats) => void
  skipPending?: boolean
  useWorker?: boolean
  /** Worker 池并发数，仅 useWorker=true 时生效，默认 min(hardwareConcurrency, 4) */
  workerConcurrency?: number
}

export interface GifController {
  play: () => void
  pause: () => void
  reset: () => void
  destroy: (options?: { clearCanvas?: boolean }) => void
  isPlaying: () => boolean
  getCompletedLoops: () => number
}
