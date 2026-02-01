# Day 01 - 2026-02-01

## 目标

- 搭建 monorepo 结构
- 初始化前端与后端项目
- 打通前后端的基础联调

## 完成内容

- 建立 pnpm workspace：`apps/*` + `packages/*`
- `apps/api`：NestJS API，新增 `/health` 接口返回 `{ status, timestamp }`
- `apps/web`：Next.js 页面引入 `HealthPanel`，请求 `http://localhost:3001/health`
- `packages/shared`：共享 `HealthResponse` 类型
- 前端测试：`HealthPanel` 初始渲染展示 `loading`

## 关键文件

- `apps/api/src/main.ts`
- `apps/api/src/app.controller.ts`
- `apps/web/components/HealthPanel.tsx`
- `apps/web/components/HealthPanel.test.tsx`
- `packages/shared/src/index.ts`

## 运行记录

```bash
pnpm dev
```

- Web：`http://localhost:3000`
- API：`http://localhost:3001/health`
