export { GifPlayer } from './components/GifPlayer'
export type {
  GifPlayerComponent,
  GifPlayerProps,
  GifPlayerRef,
} from './components/GifPlayer'

export { createGifController, clearGifResourceCache, formatGifLoadStats, formatLoadTimeMs, getGifLoadStatsView, getTotalLoadTimeMs } from './utils'
export type { CreateGifOptions, GifController, GifLoadStats, GifLoadStatsLine, GifLoadStatsMode, GifLoadStatsView } from './utils'
