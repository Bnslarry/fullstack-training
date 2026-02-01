# Fullstack Training

这是一个 30 天前端/全栈学习与实践的记录仓库。项目采用 pnpm monorepo，包含 Next.js 前端、NestJS API，以及共享类型包，用于打通前后端的基础能力。

## 目录结构

- `apps/web`：Next.js 16 + React 19 前端应用
- `apps/api`：NestJS 11 后端 API
- `packages/shared`：共享类型与基础工具（当前包含 `HealthResponse`）
- `docs`：每日学习与实践记录

## 快速开始

```bash
pnpm install
pnpm dev
```

- Web：`http://localhost:3000`
- API：`http://localhost:3001/health`

## 常用脚本

```bash
pnpm dev        # 并行启动所有子项目
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

也可以进入子项目单独执行，例如：

```bash
pnpm -C apps/web dev
pnpm -C apps/api dev
```

## 进度

- Day 01 (2026-02-01)：初始化 monorepo，建立前后端与共享类型，打通健康检查。详见 `docs/day-01.md`。

## 备注

- `apps/*` 下的 README 目前仍为脚手架默认说明，后续会逐步替换为项目内容。
