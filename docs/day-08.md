# Day 09 - Articles 模块落地与 e2e 稳定性修复

## 今日目标

- 在 API 中新增 Articles 领域能力（创建、查询、更新、删除、分页列表）
- 完成 Prisma 数据模型与迁移，建立 `User -> Article` 关系
- 补齐 Articles 的 e2e 用例并对齐接口响应契约
- 处理近期测试不稳定问题（并行执行下的测试数据污染）

## 关键改动梳理

### 1) 数据层：新增 Article 模型与迁移

- `apps/api/prisma/schema.prisma`
  - `User` 增加 `articles` 关系字段
  - 新增 `Article` 模型：`slug/title/description/body/authorId/createdAt/updatedAt`
  - 增加索引：`authorId`、`createdAt`，并对 `slug` 加唯一约束
- `apps/api/prisma/migrations/20260213090553_add_articles/migration.sql`
  - 新建 `Article` 表
  - 创建唯一索引与普通索引
  - 增加 `Article_authorId_fkey` 外键约束（`ON DELETE CASCADE`）

### 2) 业务层：新增 Articles 模块

- `apps/api/src/modules/articles/articles.module.ts`
  - 注册 `ArticlesController`、`ArticlesService`
  - 通过 `ARTICLES_REPOSITORY` 注入 `ArticlesPrismaRepository`
- `apps/api/src/modules/articles/articles.controller.ts`
  - 新增接口：
    - `POST /articles`（需登录）
    - `GET /articles`（分页）
    - `GET /articles/:slug`
    - `PATCH /articles/:slug`（需登录）
    - `DELETE /articles/:slug`（需登录）
- `apps/api/src/modules/articles/articles.service.ts`
  - 实现 slug 生成与冲突兜底
  - 作者权限校验（非作者更新/删除返回 `403 NOT_AUTHOR`）
  - 找不到文章统一抛 `ARTICLE_NOT_FOUND`
- `apps/api/src/modules/articles/repositories/*`
  - 定义 `ArticlesRepository` 接口与 `ArticleDTO`
  - Prisma 仓储实现 CRUD + 分页查询
  - 将仓储内部 `toDTO` 参数补齐为明确结构类型，避免 `any` 带来的类型噪音
- `apps/api/src/modules/articles/dto/*`
  - 新增 `CreateArticleDto` / `UpdateArticleDto`，接入 class-validator

### 3) 应用装配

- `apps/api/src/app.module.ts`
  - 注入 `ArticlesModule`，完成主模块挂载

### 4) 测试与契约对齐

- `apps/api/test/articles.e2e.spec.ts`
  - 新增端到端流程：create -> get -> update -> delete
  - 验证作者权限（非作者更新应为 403）
  - 修正响应取值路径：`data.slug` / `data.body`（与控制器返回结构一致）
- `apps/api/test/auth.e2e.spec.ts`
- `apps/api/test/users.e2e.spec.ts`
  - 将测试邮箱后缀按 spec 隔离，降低并行执行时跨文件碰撞概率：
    - `@auth.e2e.test`
    - `@users.e2e.test`
- `apps/api/test/articles.e2e.spec.ts`
  - 使用 `@articles.e2e.test` 后缀，与其他 spec 隔离

## 配置调整

- `apps/api/eslint.config.mjs`
  - 放宽部分 `no-unsafe-*` 规则，减少 Prisma/测试场景下的高噪音告警

## 问题与处理记录

### 1) IDE 出现大量 `PrismaService.article` 类型报错

- 现象：编辑器提示 `PrismaService` 不存在 `article` 属性，并连带出现 `unsafe` 报错
- 原因：常见于 Prisma Client 生成状态与 TS/ESLint 语言服务缓存不同步
- 处理：
  - 执行 `prisma generate`
  - 重启 TS Server / ESLint Server 并 reload 窗口
  - 同时将仓储内部 `toDTO` 从 `any` 改为显式结构类型，降低连锁类型告警

### 2) Articles e2e 报 `Cannot read properties of undefined (reading 'slug')`

- 原因：测试读取 `created.body.data.article.slug`，但控制器返回结构为 `{ data: article }`
- 处理：测试改为读取 `created.body.data.slug`，更新断言同理改为 `updated.body.data.body`

### 3) auth/users 测试偶发 500（外键相关）

- 现象：并行执行下出现 refresh token 写入/清理链路异常
- 高风险诱因：多个 spec 使用同构邮箱策略，存在同毫秒邮箱碰撞与跨 spec 互相清理风险
- 处理：按 spec 分配不同邮箱后缀，降低并行污染概率

### 4) 每个 spec 使用不同邮箱后缀（处理方案补充）

- 目标：让每个 spec 的测试数据命名空间隔离，避免并行时误删彼此数据
- 实施原则：
  - 邮箱格式统一为 `${Date.now()}@<spec-suffix>`
  - `<spec-suffix>` 与 spec 文件一一对应，保持长期固定
  - `afterEach` 只清理当前 spec 对应后缀产生的数据
- 当前已落地后缀：
  - `auth.e2e.spec.ts` -> `@auth.com`
  - `users.e2e.spec.ts` -> `@users.com`
  - `articles.e2e.spec.ts` -> `@articles.com`
  - `refresh.e2e.spec.ts` -> `@refresh.com`（当前为 `@refresh.com`，建议统一命名规则）
  - `cookie-refresh.e2e.spec.ts` -> `@cookie.com`（当前为 `@cookie.com`，建议统一命名规则）

## 今日产出清单

- 新增文件：
  - `apps/api/prisma/migrations/20260213090553_add_articles/migration.sql`
  - `apps/api/src/modules/articles/articles.module.ts`
  - `apps/api/src/modules/articles/articles.controller.ts`
  - `apps/api/src/modules/articles/articles.service.ts`
  - `apps/api/src/modules/articles/dto/create-article.dto.ts`
  - `apps/api/src/modules/articles/dto/update-article.dto.ts`
  - `apps/api/src/modules/articles/repositories/articles.repository.ts`
  - `apps/api/src/modules/articles/repositories/articles.prisma.repository.ts`
  - `apps/api/test/articles.e2e.spec.ts`
- 修改文件：
  - `apps/api/src/app.module.ts`
  - `apps/api/prisma/schema.prisma`
  - `apps/api/eslint.config.mjs`
  - `apps/api/test/auth.e2e.spec.ts`
  - `apps/api/test/users.e2e.spec.ts`
  - `apps/api/test/refresh.e2e.spec.ts`
  - `apps/api/test/cookie-refresh.e2e.spec.ts`
