# Day 03 - 2026-02-03

## 目标

- 建立 Users 模块的基础结构
- 提供用户创建与查询接口
- 统一错误响应格式
- 覆盖单元测试与 e2e 测试

## 完成内容

- 新增 Users 模块：`UsersController` + `UsersService` + `UsersModule`
- DTO：`CreateUserDto`（`class-validator` 校验）与 `UserDTO`
- Repository 抽象：`UsersRepository` 接口与 `UsersMemoryRepository` 内存实现
- 业务校验：邮箱重复时抛出 `ConflictException`
- 全局管道：`ValidationPipe`（`transform` / `whitelist` / `forbidNonWhitelisted`）
- 全局异常过滤器：统一错误格式 `{ error: { status, code, path, timestamp } }`
- e2e：`POST /users` 创建用户、重复邮箱返回 409
- 单测：`UsersService` 的重复邮箱冲突逻辑

## 接口摘要

- `POST /users` → `{ data: { id, email, nickname, createdAt } }`
- `GET /users/:id` → `{ data: { id, email, nickname, createdAt } }`

## 关键文件

- `apps/api/src/modules/users/users.module.ts`
- `apps/api/src/modules/users/users.controller.ts`
- `apps/api/src/modules/users/users.service.ts`
- `apps/api/src/modules/users/repositories/users.repository.ts`
- `apps/api/src/modules/users/repositories/users.memory.repository.ts`
- `apps/api/src/modules/users/dto/create-user.dto.ts`
- `apps/api/src/modules/users/dto/user.dto.ts`
- `apps/api/src/common/filters/http-exception.filter.ts`
- `apps/api/src/main.ts`
- `apps/api/test/users.e2e.spec.ts`
- `apps/api/src/modules/users/users.service.spec.ts`

## 运行记录

```bash
pnpm --filter api dev
```

```bash
pnpm --filter api test
```
