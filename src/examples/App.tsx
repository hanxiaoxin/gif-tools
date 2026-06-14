import { useRef, useState } from 'react'
import { GifPlayer, clearGifResourceCache, type GifLoadStats, type GifPlayerRef } from '../index'
import './App.css'

const GIF_SRCS = [
  'https://static.hanlinbo.cn/gif/onecat1.gif',
  'https://static.hanlinbo.cn/gif/onecat2.gif',
]
const BAD_SRC = 'https://static.hanlinbo.cn/gif/not-exist.gif'
const CACHE_DEMO_SRC = GIF_SRCS[0]
const GITHUB_REPO = 'https://github.com/hanxiaoxin/gif-tools'

const FULL_CONFIG_TAGS = [
  'src',
  'width',
  'height',
  'className',
  'style',
  'autoPlay',
  'showControls',
  'loopCount',
  'debug',
  'onLoaded',
  'onPlay',
  'onPause',
  'onEnd',
  'onError',
  'ref',
  'reload',
]

const GRID_DEMOS: {
  title: string
  noWrapper?: boolean
  props: {
    autoPlay?: boolean
    loopCount?: number
    showControls?: boolean
    debug?: boolean
  }
}[] = [
  { title: 'autoPlay=false', props: { autoPlay: false, showControls: true, debug: true } },
  { title: 'loopCount=1', props: { loopCount: 1, showControls: true, debug: true } },
  { title: '无限循环', props: { showControls: true, debug: true } },
  { title: 'width 字符串', noWrapper: true, props: { showControls: true, debug: true } },
]

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
      [`${new Date().toLocaleTimeString()} ${label} [${tag}] total ${stats.totalMs.toFixed(1)}ms`, ...prev].slice(0, 10),
    )
  }

  return (
    <div className="demo-page">
      <header className="demo-header">
        <div className="demo-header__content">
          <p className="demo-header__eyebrow">@libshub/gif-tools</p>
          <div className="demo-header__title-row">
            <h1 className="demo-header__title">GifPlayer 演示</h1>
            <span className="demo-header__version">v{__APP_VERSION__}</span>
          </div>
          <p className="demo-header__subtitle">
            Canvas GIF 播放组件 · 参数配置、Ref 控制与缓存行为示例
          </p>
        </div>
        <a
          className="demo-header__github"
          href={GITHUB_REPO}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub 仓库"
          title="GitHub 仓库"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"
            />
          </svg>
        </a>
      </header>

      <main className="demo-main">
        <section className="demo-card">
          <div className="demo-card__head">
            <span className="demo-card__index">01</span>
            <div>
              <h2 className="demo-card__title">完整配置</h2>
              <p className="demo-card__desc">
                覆盖常用 Props 与 Ref 方法，右侧 debug 叠加层可查看加载耗时。
              </p>
            </div>
          </div>

          <div className="demo-tags">
            {FULL_CONFIG_TAGS.map((tag) => (
              <span key={tag} className="demo-tag">
                {tag}
              </span>
            ))}
          </div>

          <div className="demo-actions">
            <span className="demo-actions__label">Ref 控制</span>
            <div className="demo-actions__buttons">
              <button type="button" onClick={() => playerRef.current?.play()}>
                play()
              </button>
              <button type="button" onClick={() => playerRef.current?.pause()}>
                pause()
              </button>
              <button type="button" onClick={() => playerRef.current?.toggle()}>
                toggle()
              </button>
              <button type="button" onClick={() => playerRef.current?.reset()}>
                reset()
              </button>
              <button
                type="button"
                onClick={() =>
                  log(`isPlaying: ${playerRef.current?.isPlaying() ?? false}`)
                }
              >
                isPlaying()
              </button>
              <button type="button" onClick={() => playerRef.current?.reload()}>
                reload()
              </button>
              <button
                type="button"
                className="demo-actions__btn--accent"
                onClick={() => {
                  setUseBadSrc((v) => !v)
                  setEvents([])
                }}
              >
                切换 src（{useBadSrc ? '正常' : '错误'}）
              </button>
            </div>
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
              onLoaded={(stats) => log(`onLoaded: total ${stats.totalMs.toFixed(1)}ms`)}
              onPlay={() => log('onPlay')}
              onPause={() => log('onPause')}
              onEnd={() => log('onEnd')}
              onError={(e) => log(`onError: ${e.message}`)}
            />
          </div>
        </section>

        <section className="demo-card">
          <div className="demo-card__head">
            <span className="demo-card__index">02</span>
            <div>
              <h2 className="demo-card__title">缓存演示</h2>
              <p className="demo-card__desc">
                播放器 A 预加载相同 src；挂载 B 后应命中 cache。fresh 显示 fetch + decode，pending 显示 wait 阶段。
              </p>
            </div>
          </div>

          <div className="demo-actions">
            <span className="demo-actions__label">操作</span>
            <div className="demo-actions__buttons">
              <button type="button" onClick={() => setShowCachePlayer(true)}>
                挂载播放器 B
              </button>
              <button
                type="button"
                className="demo-actions__btn--accent"
                onClick={() => {
                  setShowCachePlayer(false)
                  clearGifResourceCache()
                  setCacheEvents([])
                }}
              >
                卸载 B 并清空 cache
              </button>
            </div>
          </div>

          <div className="demo-cache-row">
            <div className="demo-cache-item">
              <div className="demo-cache-item__head">
                <span className="demo-cache-item__badge">A</span>
                <h3 className="demo-cache-item__title">预加载</h3>
              </div>
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

            {showCachePlayer ? (
              <div className="demo-cache-item">
                <div className="demo-cache-item__head">
                  <span className="demo-cache-item__badge demo-cache-item__badge--b">B</span>
                  <h3 className="demo-cache-item__title">同 src 挂载</h3>
                </div>
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
            ) : (
              <div className="demo-cache-placeholder">
                <p>点击「挂载播放器 B」查看 cache 命中效果</p>
              </div>
            )}
          </div>

          <div className="demo-log-panel">
            <div className="demo-log-panel__head">
              <span className="demo-log-panel__title">加载日志</span>
              <span className="demo-log-panel__hint">onLoaded</span>
            </div>
            <ul className="demo-log demo-log--cache">
              {cacheEvents.length === 0 && (
                <li className="demo-log-empty">等待 onLoaded…</li>
              )}
              {cacheEvents.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="demo-card">
          <div className="demo-card__head">
            <span className="demo-card__index">03</span>
            <div>
              <h2 className="demo-card__title">常见场景</h2>
              <p className="demo-card__desc">不同参数组合下的播放行为对比。</p>
            </div>
          </div>

          <div className="demo-grid">
            {GRID_DEMOS.map(({ title, noWrapper, props }) => (
              <article key={title} className="demo-grid-card">
                <div className="demo-grid-card__head">
                  <code className="demo-grid-card__label">{title}</code>
                </div>
                <div className={noWrapper ? 'demo-grid-card__player' : 'demo-player-sm'}>
                  <GifPlayer src={GIF_SRCS[1]} width="100%" {...props} />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="demo-card">
          <div className="demo-card__head">
            <span className="demo-card__index">04</span>
            <div>
              <h2 className="demo-card__title">事件日志</h2>
              <p className="demo-card__desc">完整配置区块触发的生命周期与 Ref 回调。</p>
            </div>
          </div>

          <div className="demo-log-panel">
            <div className="demo-log-panel__head">
              <span className="demo-log-panel__title">最近 10 条</span>
              <span className="demo-log-panel__hint">实时</span>
            </div>
            <ul className="demo-log demo-log--events">
              {events.length === 0 && <li className="demo-log-empty">暂无事件</li>}
              {events.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </div>
  )
}
