# Day 04 - Prisma 7 迁移与集成排障记录

## 今日目标

- 解决 Prisma 7 迁移与 `PrismaClient` 初始化问题
- 让 API 服务在本地与测试环境可稳定启动
- 记录 pnpm workspace 下 Prisma Client 生成路径相关问题

## 关键问题与解决过程

### 1) Prisma 7 datasource URL 配置变更

- **现象**：`prisma migrate dev` 报错，提示 `url` 不再允许在 `schema.prisma` 中配置。
- **原因**：Prisma 7 将连接字符串迁移到 `prisma.config.ts`。
- **处理**：从 `schema.prisma` 移除 `datasource db { url = env("DATABASE_URL") }`，改由 `prisma.config.ts` 读取 `DATABASE_URL`。

### 2) `PrismaClient` 无法导出（TS: no exported member）

- **现象**：`import { PrismaClient } from '@prisma/client'` 报错。
- **原因**：pnpm 虚拟仓库结构下，Prisma 生成的 `.prisma` 目录落在 `node_modules/.pnpm/.../node_modules/.prisma`，而 `@prisma/client` 目录里缺少 `.prisma`。
- **处理**：新增 `postinstall` 脚本自动修复 symlink：
  - `@prisma/client/.prisma` -> `../../.prisma`
  - 让 `@prisma/client/default.d.ts` 能正确解析到 `.prisma/client`。

### 3) Prisma 7 Client 初始化需要 `adapter`

- **现象**：启动时报 `PrismaClientInitializationError`，提示需要 `PrismaClientOptions`。
- **原因**：Prisma 7 不再允许空构造，必须传入 `adapter` 或 `accelerateUrl`。
- **处理**：采用 `@prisma/adapter-pg` 与 `pg` Pool：
  - `super({ adapter: new PrismaPg(pool) })`
  - 运行时需 `DATABASE_URL`。

### 4) `.env` 在运行与测试环境未加载

- **现象**：服务与测试中 `DATABASE_URL` 为空。
- **原因**：`prisma.config.ts` 的 `dotenv/config` 只影响 CLI，不影响 Nest 应用。
- **处理**：
  - `src/main.ts` 顶部加入 `import 'dotenv/config';`
  - Jest 增加 `setupFiles`，新增 `test/setup-env.ts` 统一加载 `.env`。

### 5) Nest 依赖注入失败

- **现象**：`UsersPrismaRepository` 无法解析 `PrismaService`。
- **原因**：`UsersModule` 未引入 `PrismaModule`。
- **处理**：在 `UsersModule` 的 `imports` 中加入 `PrismaModule`。

## 实践要点总结

- Prisma 7 的配置路径与初始化方式变化大，需同时调整 schema 与 client 构造。
- pnpm workspace 下生成路径容易“可见但不可用”，建议用 `postinstall` 自动修复。
- 运行时与测试环境必须显式加载 `.env`，避免 CLI 配置影响误判。
- Nest 的 provider 依赖一定要通过 module imports 串联，否则 runtime 才报错。

## 已落地改动清单

- `apps/api/prisma/schema.prisma`：移除 `datasource.url`，恢复默认 generator 输出
- `apps/api/prisma.config.ts`：维持从 `DATABASE_URL` 读取
- `apps/api/src/common/prisma/prisma.service.ts`：使用 `@prisma/adapter-pg` + `pg`
- `apps/api/src/main.ts`：加载 `.env`
- `apps/api/src/modules/users/users.module.ts`：引入 `PrismaModule`
- `apps/api/package.json`：Jest 添加 `setupFiles`
- `apps/api/test/setup-env.ts`：测试时加载 `.env`
- `package.json`：新增 `postinstall` 修复 Prisma Client symlink
- `scripts/fix-prisma-client.mjs`：自动修复 `.prisma` 链接

## 经验沉淀

- Prisma 7 迁移时，优先检查 schema 与 config 的职责边界。
- 一旦遇到 `PrismaClient` 导出异常，优先检查 `@prisma/client/.prisma`。
- 对 workspace 项目，工具生成物路径要提前纳入自动化流程（postinstall）。
