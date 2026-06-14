import { useEffect, useState, type RefObject } from 'react'
import type { GifLoadStats } from '../utils'
import {
  formatGifLoadStatsCompact,
  formatLoadTimeMs,
  getDebugDensity,
  getGifLoadStatsLineLabel,
  getGifLoadStatsView,
  type GifLoadStatsLine,
  type GifLoadStatsView,
} from '../utils/loadStats'

const MODE_LABEL: Record<string, string> = {
  fresh: 'FRESH',
  pending: 'PND',
  cache: 'CACHE',
}

function useElementSize(ref: RefObject<HTMLElement | null>, active: boolean) {
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el || !active) return

    const update = () => {
      setSize({ width: el.clientWidth, height: el.clientHeight })
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref, active])

  return size
}

function DebugRow({ label, valueMs }: GifLoadStatsLine) {
  return (
    <div className="gif-player__debug-row">
      <span className="gif-player__debug-label">{label}</span>
      <span className="gif-player__debug-value">{formatLoadTimeMs(valueMs)}</span>
    </div>
  )
}

function FullDebugPanel({
  view,
  width,
  expanded,
  onToggle,
}: {
  view: GifLoadStatsView
  width: number
  expanded: boolean
  onToggle?: () => void
}) {
  return (
    <div
      className={[
        'gif-player__debug',
        'gif-player__debug--full',
        expanded && 'gif-player__debug--expanded',
        onToggle && 'gif-player__debug--collapsible',
      ]
        .filter(Boolean)
        .join(' ')}
      data-mode={view.mode}
      style={{
        maxWidth:
          !expanded && width > 0 ? Math.min(152, Math.round(width * 0.52)) : undefined,
      }}
      role={onToggle ? 'button' : undefined}
      tabIndex={onToggle ? 0 : undefined}
      title={onToggle ? (expanded ? '点击收起' : '点击展开详情') : undefined}
      onClick={onToggle}
      onKeyDown={
        onToggle
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onToggle()
              }
            }
          : undefined
      }
    >
      <span className="gif-player__debug-badge">{MODE_LABEL[view.mode]}</span>
      <div className="gif-player__debug-body">
        {view.lines.map((line) => (
          <DebugRow
            key={line.label}
            label={getGifLoadStatsLineLabel(line, view.mode)}
            valueMs={line.valueMs}
          />
        ))}
      </div>
      <div className="gif-player__debug-total">
        <span className="gif-player__debug-label">Σ</span>
        <span className="gif-player__debug-value">{formatLoadTimeMs(view.totalMs)}</span>
      </div>
    </div>
  )
}

export function GifLoadStatsDebug({
  stats,
  canvasRef,
  visible,
}: {
  stats: GifLoadStats
  canvasRef: RefObject<HTMLCanvasElement | null>
  visible: boolean
}) {
  const { width, height } = useElementSize(canvasRef, visible)
  const view = getGifLoadStatsView(stats)
  const density = getDebugDensity(width, height)
  const [expanded, setExpanded] = useState(false)
  const collapsible = density !== 'full'

  useEffect(() => {
    setExpanded(false)
  }, [stats])

  useEffect(() => {
    if (!collapsible) setExpanded(false)
  }, [collapsible])

  const toggle = () => {
    if (!collapsible) return
    setExpanded((v) => !v)
  }

  if (collapsible && expanded) {
    return (
      <FullDebugPanel view={view} width={width} expanded onToggle={toggle} />
    )
  }

  if (density === 'compact') {
    return (
      <div
        className="gif-player__debug gif-player__debug--compact gif-player__debug--collapsible"
        data-mode={view.mode}
        role="button"
        tabIndex={0}
        title="点击展开详情"
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggle()
          }
        }}
      >
        {formatGifLoadStatsCompact(stats)}
      </div>
    )
  }

  if (density === 'medium') {
    return (
      <div
        className="gif-player__debug gif-player__debug--medium gif-player__debug--collapsible"
        data-mode={view.mode}
        role="button"
        tabIndex={0}
        title="点击展开详情"
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggle()
          }
        }}
      >
        <div className="gif-player__debug-head">
          <span className="gif-player__debug-badge">{MODE_LABEL[view.mode]}</span>
          <span className="gif-player__debug-value gif-player__debug-value--total">
            {formatLoadTimeMs(view.totalMs)}
          </span>
        </div>
      </div>
    )
  }

  return <FullDebugPanel view={view} width={width} expanded={false} />
}
