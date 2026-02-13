# Day 06 - Refresh Token 轮换与登出支持

## 今日目标

- 增加 Refresh Token 持久化与轮换能力
- 补齐 `/auth/refresh` 与 `/auth/logout` 接口
- 完善相关 e2e 测试与测试数据清理策略

## 关键改动梳理

### 1) Refresh Token 数据模型

- **Schema**：新增 `RefreshToken` 模型，关联 `User` 并加入过期/撤销字段。
- **约束与索引**：`tokenHash` 唯一约束，`userId`/`expiresAt` 索引。
- **迁移**：新增迁移脚本用于落地表结构。

### 2) Auth 业务逻辑扩展

- **注册/登录**：生成 refresh token，存储其 hash，并返回明文 refresh token。
- **刷新**：校验 tokenHash、过期/撤销状态，撤销旧 token，生成并保存新 token。
- **登出**：根据 refresh token 撤销记录，避免泄漏信息。

### 3) 控制器与 DTO

- **接口**：`/auth/register` 与 `/auth/login` 返回 `refreshToken`。
- **新增端点**：`/auth/refresh` 与 `/auth/logout`。
- **DTO**：新增 `RefreshDto` 与 `LogoutDto`。

### 4) 测试对齐

- **e2e**：新增 refresh 流程测试用例。
- **清理策略**：仅清理测试邮箱对应的数据，避免全表删除。

## 已落地改动清单

- `apps/api/prisma/schema.prisma`：新增 `RefreshToken` 模型与关系
- `apps/api/prisma/migrations/20260213003228_add_refresh_tokens/`：refresh token 迁移
- `apps/api/src/modules/auth/auth.service.ts`：refresh token 生成、轮换与登出逻辑
- `apps/api/src/modules/auth/auth.controller.ts`：新增 refresh/logout 端点，返回 refreshToken
- `apps/api/src/modules/auth/dto/refresh.dto.ts`：刷新 token 入参校验
- `apps/api/src/modules/auth/dto/logout.dto.ts`：登出 token 入参校验
- `apps/api/test/refresh.e2e-spec.ts`：刷新流程 e2e 测试
- `apps/api/test/auth.e2e.spec.ts`：按测试邮箱清理用户数据

## 风险与注意事项

- `REFRESH_EXPIRES_DAYS` 未设置时默认 7 天，需确保测试环境可预测。
- refresh token 采用 hash 存储，数据库中无法直接还原明文 token。

## 经验沉淀

- refresh token 轮换需要同时撤销旧 token 与写入新 token，避免重放。
- 测试清理策略优先收敛到单一数据范围，降低对其他测试的影响。
