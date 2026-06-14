import type { ParsedFrame } from 'gifuct-js'
import { loadGifResource } from './gifResourceManager'
import type { CreateGifOptions, GifController, GifLoadStats } from './types'

function initGifController(
  canvas: HTMLCanvasElement,
  frames: ParsedFrame[],
  width: number,
  height: number,
  options: CreateGifOptions = {},
): GifController {
  const rawCtx = canvas.getContext('2d')
  if (!rawCtx) {
    throw new Error('Canvas 2d context unavailable')
  }
  const ctx: CanvasRenderingContext2D = rawCtx

  canvas.width = width
  canvas.height = height

  const patchCanvas = document.createElement('canvas')
  const patchCtx = patchCanvas.getContext('2d')!

  let playing = false
  let frameIndex = 0
  let completedLoops = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  let patchImageData: ImageData | null = null

  function clearTimer() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  function drawPatch(frame: ParsedFrame) {
    const { dims } = frame

    if (
      !patchImageData ||
      patchImageData.width !== dims.width ||
      patchImageData.height !== dims.height
    ) {
      patchCanvas.width = dims.width
      patchCanvas.height = dims.height
      patchImageData = patchCtx.createImageData(dims.width, dims.height)
    }

    patchImageData.data.set(frame.patch)
    patchCtx.putImageData(patchImageData, 0, 0)
    ctx.drawImage(patchCanvas, dims.left, dims.top)
  }

  function drawFrame(index: number) {
    const frame = frames[index]
    if (frame.disposalType === 2) {
      ctx.clearRect(0, 0, width, height)
    }
    drawPatch(frame)
  }

  function hasReachedLoopLimit() {
    const { loopCount } = options
    return loopCount !== undefined && completedLoops >= loopCount
  }

  function scheduleNextFrame() {
    clearTimer()
    const frame = frames[frameIndex]
    const delay = Math.max(frame.delay, 0)

    timer = setTimeout(() => {
      frameIndex += 1

      if (frameIndex >= frames.length) {
        completedLoops += 1

        if (hasReachedLoopLimit()) {
          frameIndex = frames.length - 1
          drawFrame(frameIndex)
          playing = false
          clearTimer()
          options.onEnd?.()
          return
        }

        frameIndex = 0
        ctx.clearRect(0, 0, width, height)
      }

      drawFrame(frameIndex)

      if (playing) {
        scheduleNextFrame()
      }
    }, delay)
  }

  function play() {
    if (playing) return

    if (hasReachedLoopLimit()) {
      reset()
    }

    playing = true
    options.onPlay?.()
    scheduleNextFrame()
  }

  function pause() {
    if (!playing) return
    playing = false
    clearTimer()
    options.onPause?.()
  }

  function reset() {
    pause()
    frameIndex = 0
    completedLoops = 0
    ctx.clearRect(0, 0, width, height)
    drawFrame(0)
  }

  function destroy(options?: { clearCanvas?: boolean }) {
    pause()
    patchImageData = null
    patchCanvas.width = 0
    patchCanvas.height = 0
    if (options?.clearCanvas !== false) {
      canvas.width = 0
      canvas.height = 0
    }
  }

  drawFrame(0)

  return {
    play,
    pause,
    reset,
    destroy,
    isPlaying: () => playing,
    getCompletedLoops: () => completedLoops,
  }
}

export async function createGifController(
  canvas: HTMLCanvasElement,
  src: string,
  options: CreateGifOptions = {},
): Promise<{ controller: GifController; stats: GifLoadStats }> {
  const { skipPending, onLoaded, ...controllerOptions } = options
  const { gif, stats } = await loadGifResource(src, { skipPending })
  onLoaded?.(stats)
  const controller = initGifController(
    canvas,
    gif.frames,
    gif.width,
    gif.height,
    controllerOptions,
  )

  return { controller, stats }
}
