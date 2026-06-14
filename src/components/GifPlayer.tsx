import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type ForwardRefExoticComponent,
  type RefAttributes,
} from 'react'
import { createGifController } from '../utils'
import { acquireGifResource, releaseGifResource } from '../utils/gifResourceManager'
import type { GifController, GifLoadStats } from '../utils'
import { GifLoadStatsDebug } from './GifLoadStatsDebug'
import './GifPlayer.css'

export interface GifPlayerRef {
  play: () => void
  pause: () => void
  toggle: () => void
  reset: () => void
  reload: () => void
  isPlaying: () => boolean
}

export interface GifPlayerProps {
  src: string
  width?: number | string
  height?: number | string
  className?: string
  style?: CSSProperties
  autoPlay?: boolean
  showControls?: boolean
  debug?: boolean
  useWorker?: boolean
  workerConcurrency?: number
  loopCount?: number
  onPlay?: () => void
  onPause?: () => void
  onEnd?: () => void
  onLoaded?: (stats: GifLoadStats) => void
  onError?: (error: Error) => void
}

export type GifPlayerComponent = ForwardRefExoticComponent<
  GifPlayerProps & RefAttributes<GifPlayerRef>
>

export const GifPlayer: GifPlayerComponent = forwardRef<GifPlayerRef, GifPlayerProps>(
  (
    {
      src,
      autoPlay = true,
      showControls = false,
      debug = false,
      useWorker = false,
      workerConcurrency,
      loopCount,
      className,
      style,
      width,
      height,
      onPlay,
      onPause,
      onEnd,
      onLoaded,
      onError,
    },
    ref,
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const controllerRef = useRef<GifController | null>(null)
    const onPlayRef = useRef(onPlay)
    const onPauseRef = useRef(onPause)
    const onEndRef = useRef(onEnd)
    const onLoadedRef = useRef(onLoaded)
    const onErrorRef = useRef(onError)
    const [playing, setPlaying] = useState(autoPlay)
    const [ready, setReady] = useState(false)
    const [loadStats, setLoadStats] = useState<GifLoadStats | null>(null)
    const [reloadKey, setReloadKey] = useState(0)
    const skipPendingRef = useRef(false)
    const loadIdRef = useRef(0)

    onPlayRef.current = onPlay
    onPauseRef.current = onPause
    onEndRef.current = onEnd
    onLoadedRef.current = onLoaded
    onErrorRef.current = onError

    const play = useCallback(() => {
      controllerRef.current?.play()
      setPlaying(true)
    }, [])

    const pause = useCallback(() => {
      controllerRef.current?.pause()
      setPlaying(false)
    }, [])

    const toggle = useCallback(() => {
      if (controllerRef.current?.isPlaying()) pause()
      else play()
    }, [pause, play])

    const reset = useCallback(() => {
      controllerRef.current?.reset()
      setPlaying(false)
    }, [])

    const reload = useCallback(() => {
      skipPendingRef.current = true
      setReloadKey((k) => k + 1)
    }, [])

    const loadMedia = useCallback(() => {
      if (!src) return () => {}

      const loadId = ++loadIdRef.current
      let cancelled = false
      const canvas = canvasRef.current
      if (!canvas) return () => {}

      const skipPending = skipPendingRef.current
      skipPendingRef.current = false

      setReady(false)
      setPlaying(false)
      setLoadStats(null)
      controllerRef.current?.destroy()
      controllerRef.current = null

      createGifController(canvas, src, {
        skipPending,
        useWorker,
        workerConcurrency,
        loopCount,
        onPlay: () => {
          if (loadId === loadIdRef.current) setPlaying(true)
          onPlayRef.current?.()
        },
        onPause: () => {
          if (loadId === loadIdRef.current) setPlaying(false)
          onPauseRef.current?.()
        },
        onEnd: () => {
          if (loadId === loadIdRef.current) setPlaying(false)
          onEndRef.current?.()
        },
      })
        .then(({ controller, stats }) => {
          onLoadedRef.current?.(stats)

          if (cancelled || loadId !== loadIdRef.current) {
            controller.destroy({ clearCanvas: false })
            return
          }

          acquireGifResource(src, useWorker)
          controllerRef.current = controller
          const baseDestroy = controller.destroy.bind(controller)
          controller.destroy = (options) => {
            baseDestroy(options)
            releaseGifResource(src, useWorker)
          }

          setReady(true)
          setLoadStats(stats)

          if (autoPlay) {
            controller.play()
            setPlaying(true)
          }
        })
        .catch((error: unknown) => {
          if (loadId === loadIdRef.current) setLoadStats(null)
          onErrorRef.current?.(
            error instanceof Error ? error : new Error(String(error)),
          )
        })

      return () => {
        cancelled = true
        if (loadId === loadIdRef.current) {
          controllerRef.current?.destroy()
          controllerRef.current = null
        }
      }
    }, [src, loopCount, autoPlay, useWorker, workerConcurrency])

    useImperativeHandle(
      ref,
      () => ({
        play,
        pause,
        toggle,
        reset,
        reload,
        isPlaying: () => controllerRef.current?.isPlaying() ?? false,
      }),
      [play, pause, toggle, reset, reload],
    )

    useEffect(() => {
      const cleanup = loadMedia()
      return cleanup
    }, [loadMedia, reloadKey])

    const rootClass = [
      'gif-player',
      showControls && 'gif-player--show-controls',
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div className={rootClass} style={style}>
        <canvas
          ref={canvasRef}
          className="gif-player__media"
          role="img"
          style={{
            ...(width !== undefined ? { width } : {}),
            ...(height !== undefined ? { height } : {}),
            ...(ready ? {} : { visibility: 'hidden' }),
          }}
        />

        {debug && loadStats !== null && ready && (
          <GifLoadStatsDebug stats={loadStats} canvasRef={canvasRef} visible={ready} />
        )}

        {showControls && ready && (
          <div className="gif-player__controls">
            <button
              type="button"
              className="gif-player__btn"
              onClick={toggle}
            >
              {playing ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>
    )
  },
)

GifPlayer.displayName = 'GifPlayer'
