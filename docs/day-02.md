# Day 02 - 2026-02-02

## 主题

- Node.js 事件循环：同步、微任务、timers、setImmediate

## 环境

- Node.js: v25.2.1
- 目录：`apps/api/scripts/event-loop`

## 实验 01：基础执行顺序

### 文件

- `01-order-basic.mjs`

### 运行命令与输出

```bash
node apps/api/scripts/event-loop/01-order-basic.mjs
```

输出：

```
A: sync start
F: sync end
C: promise.then (microtask)
B: process.nextTick
E: setImmediate
D: setTimeout 0
```

### 结论

- 同步代码先执行：`A` -> `F`
- 在当前环境（Node v25.2.1 + ESM）中，**Promise 微任务先于 `process.nextTick`** 执行
- `setImmediate` 与 `setTimeout(0)` 的先后顺序不保证；本次运行中 `setImmediate` 早于 `setTimeout(0)`

## 实验 02：I/O 回调中的 setImmediate 与 setTimeout

### 文件

- `02-io-immediate-vs-timeout.mjs`

### 运行命令与输出

```bash
node apps/api/scripts/event-loop/02-io-immediate-vs-timeout.mjs
```

输出：

```
I/O callback
setImmediate in I/O
setTimeout 0 in I/O
```

### 结论

- I/O 回调发生在 poll 阶段
- 在 I/O 回调中注册：`setImmediate` 进入 check 阶段，通常在同一轮先执行
- `setTimeout(0)` 进入 timers 阶段，往往在下一轮执行
- 因此在 I/O 回调里，`setImmediate` **更容易先于** `setTimeout(0)`

## 实验 03：process.nextTick 饥饿问题

### 文件

- `03-nexttick-starvation.mjs`

### 运行命令与输出

```bash
node apps/api/scripts/event-loop/03-nexttick-starvation.mjs
```

输出：

```
nextTick spin: 0.094ms
setTimeout fired (if you see this late, nextTick starved the loop)
```

### 结论

- `process.nextTick` 递归调度会持续占用 nextTick 队列
- timers 阶段要等 nextTick 队列完全清空才能执行
- 因此 `setTimeout(0)` 会被推迟，形成“饥饿”现象
- 如果任务很大，建议用 `setImmediate` / `setTimeout` 分批，让出事件循环

## 实验 04：同步阻塞导致定时器延迟

### 文件

- `04-blocking-demo.mjs`

### 运行命令与输出（节选）

```bash
node apps/api/scripts/event-loop/04-blocking-demo.mjs
```

输出（节选）：

```
start busy 2000ms...
busy done
tick 1769953085333
tick 1769953085434
tick 1769953085535
```

### 结论

- `busy(2000)` 使用 while 循环占满主线程，事件循环无法运行
- `setInterval(100ms)` 的回调只能在阻塞结束后集中执行
- 这说明同步 CPU 任务会让定时器与 I/O **整体延迟**
- `setInterval` 会让进程常驻，需 `clearInterval` 或手动终止

## 实验 05：任务切片避免阻塞

### 文件

- `05-slicing.mjs`

### 运行命令与输出（节选）

```bash
node apps/api/scripts/event-loop/05-slicing.mjs
```

输出（节选）：

```
tick 1769953354324
done 5000000
tick 1769953354425
tick 1769953354526
```

### 结论

- 将大任务分片，每次最多占用约 10ms
- 用 `setImmediate` 把下一段任务放到 check 阶段执行
- 这样定时器仍能持续触发，避免长时间阻塞事件循环

## 知识点：为什么“看似异步”的代码仍会卡死服务

### 现象

- 代码使用了 `async/await`、Promise 或定时器，但服务仍出现卡顿或不响应

### 常见原因

- CPU 密集型同步计算（大循环、序列化、压缩/加密等）仍在主线程执行
- 微任务饥饿：大量 `process.nextTick` / 深 Promise 链占用事件循环
- 同步 I/O 或同步第三方库阻塞主线程
- 频繁同步日志或大对象 `JSON.stringify` 造成阻塞
- “假异步”封装：`new Promise(resolve => resolve(heavyWork()))` 仍是同步执行

### 建议

- 任务切片：`setImmediate` / `setTimeout` 分批让出事件循环
- CPU 密集任务用 Worker Threads 或子进程
- 控制 nextTick/Promise 链深度，适度让出事件循环

## 知识点：poll 阶段是什么

### 定义

- poll 是事件循环的一个阶段，主要负责处理 I/O 回调（网络、文件读写完成后的回调）
- 当没有更高优先级任务可执行时，poll 阶段可能短暂等待新的 I/O

### 位置

- 事件循环顺序（简化）：`timers` → `pending callbacks` → `idle/prepare` → `poll` → `check` → `close callbacks`

### 关联理解

- I/O 回调在 poll 阶段触发
- 在 I/O 回调里注册 `setImmediate`，会进入 check 阶段，通常同一轮很快执行
- `setTimeout(0)` 需要回到下一轮 timers 阶段

## 知识点：nextTick 为什么危险、setImmediate 在 I/O 回调里为何常常更早

### nextTick 的风险

- `process.nextTick` 优先级高于 Promise 微任务和各事件循环阶段
- 大量/递归 `nextTick` 会持续占用队列，导致 timers/I/O 长时间得不到执行
- 结果是“看似异步”，但实际阻塞主线程，造成卡顿或饥饿

### I/O 回调中的 setImmediate 更早的原因

- I/O 回调发生在 poll 阶段
- 在 poll 回调里注册 `setImmediate` 会进入 check 阶段，通常同一轮就执行
- `setTimeout(0)` 则要回到下一轮 timers 阶段

## 备注

- 微任务与宏任务的实际顺序以**当前 Node 版本 + 执行上下文**为准
- 若需稳定顺序，可将 `setImmediate` / `setTimeout` 放入 I/O 回调或显式控制执行时机
