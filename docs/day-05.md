# Day 05 - Auth 模块引入与测试对齐记录

## 今日目标

- 引入基础认证与 JWT 能力
- 用户密码存储改为 hash，并同步数据层与测试
- 解决测试中的路径别名与资源未关闭告警

## 关键改动梳理

### 1) 用户密码字段与持久化调整

- **数据模型**：`User` 新增 `passwordHash` 字段，并新增迁移。
- **创建流程**：`UsersService` 使用 `bcrypt` 生成 hash，并将 `passwordHash` 写入仓库。
- **DTO 与仓库契约**：`CreateUserDto` 增加 `password`，`UsersRepository.create` 接口增加 `passwordHash`。

### 2) Auth 模块与 JWT 支持

- **模块与控制器**：新增 `AuthModule`，提供 `register`/`login` 接口。
- **JWT 策略**：新增 `JwtStrategy` 与 `JwtAuthGuard`，用于解析和保护 `/me`。
- **当前用户注入**：新增 `CurrentUser` 装饰器，统一从 `req.user` 读取。
- **Me 接口**：新增 `/me` 读取用户基础信息。

### 3) 测试与运行时对齐

- **校验管道**：e2e 测试中补上 `ValidationPipe`，与 `main.ts` 行为一致。
- **测试入参修正**：`POST /users` e2e 改为带 `password`。
- **返回结构对齐**：`/me` 的测试断言改为 `data.user.email`。

### 4) Jest 路径别名与资源清理

- **路径别名**：Jest 配置补充 `moduleNameMapper`，并在 `tsconfig` 增加 `paths`。
- **Open handles**：`PrismaService` 在 `onModuleDestroy` 增加 `pool.end()` 关闭 pg 连接池，消除 Jest “did not exit” 告警。

## 已落地改动清单

- `apps/api/prisma/schema.prisma`：`User` 增加 `passwordHash`
- `apps/api/prisma/migrations/20260207060332_add_user_password_hash/migration.sql`：新增字段迁移
- `apps/api/src/modules/users/dto/create-user.dto.ts`：新增 `password` 校验
- `apps/api/src/modules/users/users.service.ts`：bcrypt hash + 写入 `passwordHash`
- `apps/api/src/modules/users/repositories/users.repository.ts`：仓库接口扩展
- `apps/api/src/modules/users/repositories/users.prisma.repository.ts`：持久化字段更新
- `apps/api/src/modules/users/users.service.spec.ts`：单测入参补齐
- `apps/api/src/modules/auth/**`：Auth 模块、JWT、DTO、`/me` 端点
- `apps/api/src/common/decorators/current-user.decorator.ts`：当前用户注入
- `apps/api/src/app.module.ts`：引入 `AuthModule`
- `apps/api/src/common/prisma/prisma.service.ts`：`pool.end()` 关闭连接池
- `apps/api/test/users.e2e.spec.ts`：ValidationPipe + 密码入参
- `apps/api/test/auth.e2e.spec.ts`：新增认证 e2e 测试
- `apps/api/tsconfig.json`：`paths` 增加 `src/*` 映射
- `apps/api/test/jest-e2e.json`：`moduleNameMapper` 对齐 `src/*`
- `apps/api/package.json`：新增依赖与 Jest `moduleNameMapper`
- `pnpm-lock.yaml`：依赖锁定更新

## 风险与注意事项

- 迁移为 `passwordHash` 非空字段，旧数据若存在需提前补数据或清空表。
- `DATABASE_URL` 仍为 Prisma 初始化前置条件，测试需保证环境变量可用。

## 经验沉淀

- e2e 测试最好复用生产级别的全局管道与异常过滤，避免运行时差异。
- Prisma + pg 连接池在测试环境需要显式关闭，否则会触发 Jest open handles。
- 运行时与测试的路径别名需同时在 TS 与 Jest 中对齐。
