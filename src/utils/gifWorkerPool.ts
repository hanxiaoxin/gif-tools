import GifDecodeWorker from '../workers/gifDecode.worker?worker&inline'
import type { LoadedGif } from './types'
import type { ParsedFrame } from 'gifuct-js'

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

type DecodeResponse = DecodeSuccess | DecodeFailure

interface DecodeResult {
  gif: LoadedGif
  decodeTimeMs: number
  queueWaitMs: number
}

interface DecodeJob {
  buffer: ArrayBuffer
  enqueuedAt: number
  queueWaitMs: number
  resolve: (result: DecodeResult) => void
  reject: (error: Error) => void
}

export const DEFAULT_WORKER_CONCURRENCY =
  typeof navigator !== 'undefined' ? Math.min(navigator.hardwareConcurrency || 4, 4) : 4

const MAX_WORKER_CONCURRENCY = 16

export function clampWorkerConcurrency(size?: number): number {
  if (size === undefined) return DEFAULT_WORKER_CONCURRENCY
  return Math.min(Math.max(Math.floor(size), 1), MAX_WORKER_CONCURRENCY)
}

function toParsedFrame(frame: SerializableFrame): ParsedFrame {
  return {
    dims: frame.dims,
    delay: frame.delay,
    disposalType: frame.disposalType,
    patch: new Uint8ClampedArray(frame.patchBuffer),
    colorTable: [],
    pixels: [],
    transparentIndex: -1,
  }
}

class GifWorkerPool {
  private workers: Worker[] = []
  private idleWorkers: Worker[] = []
  private pendingJobs = new Map<number, DecodeJob>()
  private workerJobs = new Map<Worker, number>()
  private waitQueue: DecodeJob[] = []
  private jobId = 0
  private initialized = false
  private targetSize = DEFAULT_WORKER_CONCURRENCY

  private spawnWorker(): Worker {
    const worker = new GifDecodeWorker()
    worker.onmessage = (event: MessageEvent<DecodeResponse>) => {
      this.handleMessage(worker, event.data)
    }
    worker.onerror = (event) => {
      this.handleWorkerError(worker, event.message || 'Worker error')
    }
    this.workers.push(worker)
    this.idleWorkers.push(worker)
    return worker
  }

  private terminateWorker(worker: Worker) {
    this.idleWorkers = this.idleWorkers.filter((w) => w !== worker)
    this.workerJobs.delete(worker)
    const index = this.workers.indexOf(worker)
    if (index >= 0) this.workers.splice(index, 1)
    worker.terminate()
  }

  private init() {
    if (this.initialized) return
    this.initialized = true
    this.growToTarget()
  }

  private growToTarget() {
    while (this.workers.length < this.targetSize) {
      this.spawnWorker()
    }
  }

  private shrinkIdleToTarget() {
    while (this.workers.length > this.targetSize && this.idleWorkers.length > 0) {
      this.terminateWorker(this.idleWorkers.pop()!)
    }
  }

  setSize(size?: number) {
    this.targetSize = clampWorkerConcurrency(size)
    this.init()
    this.growToTarget()
    this.shrinkIdleToTarget()
  }

  decode(buffer: ArrayBuffer): Promise<DecodeResult> {
    this.init()

    return new Promise((resolve, reject) => {
      const job: DecodeJob = {
        buffer,
        enqueuedAt: performance.now(),
        queueWaitMs: 0,
        resolve,
        reject,
      }
      const worker = this.idleWorkers.pop()
      if (worker) {
        this.runJob(worker, job)
      } else {
        this.waitQueue.push(job)
      }
    })
  }

  private runJob(worker: Worker, job: DecodeJob) {
    job.queueWaitMs = performance.now() - job.enqueuedAt
    const id = ++this.jobId
    this.pendingJobs.set(id, job)
    this.workerJobs.set(worker, id)
    worker.postMessage({ id, type: 'decode', buffer: job.buffer }, [job.buffer])
  }

  private handleMessage(worker: Worker, data: DecodeResponse) {
    const job = this.pendingJobs.get(data.id)
    if (!job) return

    this.pendingJobs.delete(data.id)
    this.workerJobs.delete(worker)
    this.idleWorkers.push(worker)
    this.shrinkIdleToTarget()

    if (data.ok === false) {
      job.reject(new Error(data.error))
    } else {
      job.resolve({
        gif: {
          frames: data.frames.map(toParsedFrame),
          width: data.width,
          height: data.height,
        },
        decodeTimeMs: data.decodeTimeMs,
        queueWaitMs: job.queueWaitMs,
      })
    }

    const next = this.waitQueue.shift()
    if (next) {
      const idle = this.idleWorkers.pop()
      if (idle) this.runJob(idle, next)
    }
  }

  private handleWorkerError(worker: Worker, message: string) {
    const jobId = this.workerJobs.get(worker)
    const job = jobId !== undefined ? this.pendingJobs.get(jobId) : undefined
    if (jobId !== undefined) this.pendingJobs.delete(jobId)
    this.workerJobs.delete(worker)
    this.terminateWorker(worker)

    if (job) {
      job.reject(new Error(message))
    }

    this.growToTarget()

    while (this.waitQueue.length > 0 && this.idleWorkers.length > 0) {
      const nextJob = this.waitQueue.shift()!
      const idle = this.idleWorkers.pop()!
      this.runJob(idle, nextJob)
    }
  }
}

const pool = new GifWorkerPool()

export function setWorkerPoolSize(size?: number): void {
  pool.setSize(size)
}

export function decodeGifInWorker(
  buffer: ArrayBuffer,
  concurrency?: number,
): Promise<DecodeResult> {
  if (concurrency !== undefined) {
    pool.setSize(concurrency)
  }
  return pool.decode(buffer)
}
