# @libshub/gif-tools

基于 Canvas 的 React GIF 播放组件，使用 [gifuct-js](https://github.com/matt-way/gifuct-js) 解码，支持播放控制、循环次数、资源缓存与加载性能统计。

## 演示

[![GifPlayer 演示](https://static.hanlinbo.cn/%E5%9B%BE%E7%89%87/github/gif-tools-demo.png)](http://www.hanxiaoxin.cn/gif-tools/)

在线体验：[http://www.hanxiaoxin.cn/gif-tools/](http://www.hanxiaoxin.cn/gif-tools/)

## 安装

```bash
npm install @libshub/gif-tools
```

需要 React 17+：

```bash
npm install react react-dom
```

## 快速开始

```tsx
import { GifPlayer } from '@libshub/gif-tools'
import '@libshub/gif-tools/style.css'

function App() {
  return (
    <GifPlayer
      src="https://example.com/demo.gif"
      autoPlay
      showControls
    />
  )
}
```

## GifPlayer

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `src` | `string` | — | GIF 地址（必填） |
| `width` | `number \| string` | — | 画布宽度 |
| `height` | `number \| string` | — | 画布高度 |
| `className` | `string` | — | 根节点 class |
| `style` | `CSSProperties` | — | 根节点样式 |
| `autoPlay` | `boolean` | `true` | 加载完成后自动播放 |
| `showControls` | `boolean` | `false` | 显示播放/暂停按钮 |
| `debug` | `boolean` | `false` | 在画面上叠加加载耗时调试信息 |
| `loopCount` | `number` | — | 循环次数，不传则按 GIF 自身循环或无限循环 |
| `onLoaded` | `(stats: GifLoadStats) => void` | — | 加载完成 |
| `onPlay` | `() => void` | — | 开始播放 |
| `onPause` | `() => void` | — | 暂停 |
| `onEnd` | `() => void` | — | 达到循环上限后结束 |
| `onError` | `(error: Error) => void` | — | 加载或解码失败 |

### Ref 方法

通过 `ref` 可命令式控制播放器：

```tsx
import { useRef } from 'react'
import { GifPlayer, type GifPlayerRef } from '@libshub/gif-tools'

const ref = useRef<GifPlayerRef>(null)

ref.current?.play()      // 播放
ref.current?.pause()     // 暂停
ref.current?.toggle()    // 切换播放/暂停
ref.current?.reset()     // 回到第一帧并暂停
ref.current?.reload()    // 重新加载（跳过 pending 复用，强制 fresh）
ref.current?.isPlaying() // 是否正在播放
```

### 完整示例

```tsx
import { useRef } from 'react'
import {
  GifPlayer,
  formatGifLoadStats,
  type GifPlayerRef,
} from '@libshub/gif-tools'
import '@libshub/gif-tools/style.css'

export default function Demo() {
  const playerRef = useRef<GifPlayerRef>(null)

  return (
    <>
      <button onClick={() => playerRef.current?.toggle()}>播放/暂停</button>

      <GifPlayer
        ref={playerRef}
        src="https://example.com/demo.gif"
        width="100%"
        height="auto"
        className="my-gif"
        style={{ borderRadius: 8 }}
        autoPlay
        showControls
        loopCount={2}
        debug
        onLoaded={(stats) => console.log(formatGifLoadStats(stats))}
        onPlay={() => console.log('play')}
        onPause={() => console.log('pause')}
        onEnd={() => console.log('end')}
        onError={(e) => console.error(e)}
      />
    </>
  )
}
```

## 资源缓存

相同 `src` 的 GIF 在全局共享解码结果，多个 `GifPlayer` 实例不会重复 fetch / decode。

```tsx
import { clearGifResourceCache } from '@libshub/gif-tools'

// 清空全部缓存
clearGifResourceCache()
```

`onLoaded` 回调中的 `GifLoadStats` 可区分三种加载模式：

- **fresh**：首次加载，包含 `fetchTimeMs` 与 `decodeTimeMs`
- **pending**：复用进行中的请求，包含 `pendingWaitFetchMs` 与 `pendingWaitDecodeMs`
- **cache**：命中缓存，耗时均为 0

```tsx
import { formatGifLoadStats, getGifLoadStatsView } from '@libshub/gif-tools'

onLoaded={(stats) => {
  console.log(formatGifLoadStats(stats))
  // fresh
  // fetch 120.5ms
  // decode 45.2ms
  // total 165.7ms

  const view = getGifLoadStatsView(stats)
  console.log(view.mode) // 'fresh' | 'pending' | 'cache'
}}
```

## 底层 API

不依赖 React 时，可直接在 Canvas 上创建控制器：

```ts
import { createGifController } from '@libshub/gif-tools'

const canvas = document.querySelector('canvas')!
const { controller, stats } = await createGifController(canvas, src, {
  loopCount: 3,
  onPlay: () => {},
  onPause: () => {},
  onEnd: () => {},
})

controller.play()
controller.pause()
controller.reset()
controller.isPlaying()
controller.getCompletedLoops()
controller.destroy()
```

## 导出一览

**组件**

- `GifPlayer`

**类型**

- `GifPlayerProps`、`GifPlayerRef`、`GifPlayerComponent`
- `GifLoadStats`、`GifController`、`CreateGifOptions`
- `GifLoadStatsView`、`GifLoadStatsLine`、`GifLoadStatsMode`

**工具函数**

- `createGifController` — 在 Canvas 上创建 GIF 控制器
- `clearGifResourceCache` — 清空 GIF 资源缓存
- `formatGifLoadStats` — 格式化加载统计（多行）
- `formatLoadTimeMs` — 格式化毫秒数
- `getGifLoadStatsView` — 获取结构化加载统计视图
- `getTotalLoadTimeMs` — 获取总加载耗时
