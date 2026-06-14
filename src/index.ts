export { GifPlayer } from './components/GifPlayer'
export type {
  GifPlayerComponent,
  GifPlayerProps,
  GifPlayerRef,
} from './components/GifPlayer'

export {
  clearGifResourceCache,
  createGifController,
  setWorkerPoolSize,
} from './utils'
export type { CreateGifOptions, GifController, GifLoadStats } from './utils'
