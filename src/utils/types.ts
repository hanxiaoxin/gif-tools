import type { ParsedFrame } from 'gifuct-js'

export interface LoadedGif {
  frames: ParsedFrame[]
  width: number
  height: number
}

export interface GifLoadStats {
  /** 本次实际 fetch 耗时，仅 fresh 发起方有值 */
  fetchTimeMs: number
  /** 本次实际 decode 耗时，仅 fresh 发起方有值 */
  decodeTimeMs: number
  /** 等待进行中的 fetch 阶段，仅 pending */
  pendingWaitFetchMs: number
  /** 等待进行中的 decode 阶段，仅 pending */
  pendingWaitDecodeMs: number
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
}

export interface GifController {
  play: () => void
  pause: () => void
  reset: () => void
  destroy: (options?: { clearCanvas?: boolean }) => void
  isPlaying: () => boolean
  getCompletedLoops: () => number
}
