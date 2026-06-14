import { decompressFrames, parseGIF, type ParsedFrame } from 'gifuct-js'

interface DecodeRequest {
  id: number
  type: 'decode'
  buffer: ArrayBuffer
}

interface SerializableFrame {
  dims: ParsedFrame['dims']
  delay: number
  disposalType: number
  patchBuffer: ArrayBuffer
}

interface DecodeSuccess {
  id: number
  type: 'decode'
  ok: true
  width: number
  height: number
  frames: SerializableFrame[]
  decodeTimeMs: number
}

interface DecodeFailure {
  id: number
  type: 'decode'
  ok: false
  error: string
}

function serializeFrame(frame: ParsedFrame): SerializableFrame {
  const patchBuffer = new ArrayBuffer(frame.patch.byteLength)
  new Uint8ClampedArray(patchBuffer).set(frame.patch)
  return {
    dims: frame.dims,
    delay: frame.delay,
    disposalType: frame.disposalType,
    patchBuffer,
  }
}

self.onmessage = (event: MessageEvent<DecodeRequest>) => {
  const { id, type, buffer } = event.data
  if (type !== 'decode') return

  try {
    const decodeStart = performance.now()
    const parsed = parseGIF(buffer)
    const frames = decompressFrames(parsed, true)
    const decodeTimeMs = performance.now() - decodeStart

    if (!frames.length) {
      const response: DecodeFailure = {
        id,
        type: 'decode',
        ok: false,
        error: 'GIF has no frames',
      }
      self.postMessage(response)
      return
    }

    const serialized = frames.map(serializeFrame)
    const transferables = serialized.map((f) => f.patchBuffer)

    const response: DecodeSuccess = {
      id,
      type: 'decode',
      ok: true,
      width: parsed.lsd.width,
      height: parsed.lsd.height,
      frames: serialized,
      decodeTimeMs,
    }
    self.postMessage(response, { transfer: transferables })
  } catch (error) {
    const response: DecodeFailure = {
      id,
      type: 'decode',
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
    self.postMessage(response)
  }
}
