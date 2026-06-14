import { useRef, useState } from 'react'
import { GifPlayer, clearGifResourceCache, formatGifLoadStats, type GifLoadStats, type GifPlayerRef } from '../index'
import './App.css'

const GIF_SRCS = [
  'https://static.hanlinbo.cn/gif/onecat1.gif',
  'https://static.hanlinbo.cn/gif/onecat2.gif'
]
const BAD_SRC = 'https://static.hanlinbo.cn/gif/not-exist.gif'
const CACHE_DEMO_SRC = GIF_SRCS[0]

export default function App() {
  const playerRef = useRef<GifPlayerRef>(null)
  const [events, setEvents] = useState<string[]>([])
  const [cacheEvents, setCacheEvents] = useState<string[]>([])
  const [showCachePlayer, setShowCachePlayer] = useState(false)
  const [useBadSrc, setUseBadSrc] = useState(false)

  const log = (msg: string) => {
    setEvents((prev) =>
      [`${new Date().toLocaleTimeString()} ${msg}`, ...prev].slice(0, 10),
    )
  }

  const logCache = (label: string, stats: GifLoadStats) => {
    const tag = stats.fromCache ? 'cache' : stats.fromPending ? 'pending' : 'fresh'
    setCacheEvents((prev) =>
      [`${new Date().toLocaleTimeString()} ${label} [${tag}] ${formatGifLoadStats(stats)}`, ...prev].slice(0, 10),
    )
  }
  return (
    <div className="demo-root">
      <h2 className="demo-title">GifPlayer 参数演示</h2>

      <section className="demo-section">
        <h3 className="demo-section-title">完整配置</h3>
        <p className="demo-desc">
          src · width · height · className · style · autoPlay · showControls ·
          loopCount · debug · onLoaded · onPlay · onPause · onEnd · onError · ref（含 reload）
        </p>

        <div className="demo-actions">
          <button type="button" onClick={() => playerRef.current?.play()}>
            ref.play()
          </button>
          <button type="button" onClick={() => playerRef.current?.pause()}>
            ref.pause()
          </button>
          <button type="button" onClick={() => playerRef.current?.toggle()}>
            ref.toggle()
          </button>
          <button type="button" onClick={() => playerRef.current?.reset()}>
            ref.reset()
          </button>
          <button
            type="button"
            onClick={() =>
              log(`isPlaying: ${playerRef.current?.isPlaying() ?? false}`)
            }
          >
            ref.isPlaying()
          </button>
          <button type="button" onClick={() => playerRef.current?.reload()}>
            ref.reload()
          </button>
          <button
            type="button"
            onClick={() => {
              setUseBadSrc((v) => !v)
              setEvents([])
            }}
          >
            切换 src（{useBadSrc ? '正常' : '错误'}）
          </button>
        </div>

        <div className="demo-player-main">
          <GifPlayer
            ref={playerRef}
            src={useBadSrc ? BAD_SRC : GIF_SRCS[0]}
            width="100%"
            height="auto"
            className="demo-gif"
            style={{ border: '2px solid #4a90e2', borderRadius: 8 }}
            autoPlay
            showControls
            debug={true}
            loopCount={2}
            onLoaded={(stats) => log(`onLoaded: ${formatGifLoadStats(stats)}`)}
            onPlay={() => log('onPlay')}
            onPause={() => log('onPause')}
            onEnd={() => log('onEnd')}
            onError={(e) => log(`onError: ${e.message}`)}
          />
        </div>
      </section>

      <section className="demo-section">
        <h3 className="demo-section-title">缓存演示</h3>
        <p className="demo-desc">
          播放器 A 预加载相同 src；点击按钮后挂载播放器 B，应显示 cache（wait fetch 0 + wait decode 0）。
          fresh 显示 fetch + decode；pending 显示 wait fetch + wait decode。
        </p>

        <div className="demo-actions">
          <button type="button" onClick={() => setShowCachePlayer(true)}>
            挂载播放器 B
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCachePlayer(false)
              clearGifResourceCache()
              setCacheEvents([])
            }}
          >
            卸载 B 并清空 cache
          </button>
        </div>

        <div className="demo-cache-row">
          <div className="demo-cache-item">
            <h4>播放器 A（预加载）</h4>
            <div className="demo-player-sm">
              <GifPlayer
                src={CACHE_DEMO_SRC}
                width="100%"
                showControls
                debug
                onLoaded={(stats) => logCache('播放器 A', stats)}
              />
            </div>
          </div>

          {showCachePlayer && (
            <div className="demo-cache-item">
              <h4>播放器 B（同 src）</h4>
              <div className="demo-player-sm">
                <GifPlayer
                  src={CACHE_DEMO_SRC}
                  width="100%"
                  showControls
                  debug
                  onLoaded={(stats) => logCache('播放器 B', stats)}
                />
              </div>
            </div>
          )}
        </div>

        <ul className="demo-log demo-log--cache">
          {cacheEvents.length === 0 && (
            <li className="demo-log-empty">等待 onLoaded…</li>
          )}
          {cacheEvents.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      </section>

      <div className="demo-grid">
        <section>
          <h4>autoPlay=false</h4>
          <div className="demo-player-sm">
            <GifPlayer src={GIF_SRCS[1]} width="100%" autoPlay={false} showControls debug={true} />
          </div>
        </section>

        <section>
          <h4>loopCount=1</h4>
          <div className="demo-player-sm">
            <GifPlayer src={GIF_SRCS[1]} width="100%" loopCount={1} showControls debug={true} />
          </div>
        </section>

        <section>
          <h4>无限循环</h4>
          <div className="demo-player-sm">
            <GifPlayer src={GIF_SRCS[1]} width="100%" showControls debug={true} />
          </div>
        </section>

        <section>
          <h4>width 字符串</h4>
          <GifPlayer src={GIF_SRCS[1]} width="100%" showControls debug={true} />
        </section>
      </div>

      <section className="demo-section">
        <h3 className="demo-section-title">事件日志</h3>
        <ul className="demo-log demo-log--events">
          {events.length === 0 && <li className="demo-log-empty">暂无事件</li>}
          {events.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}
