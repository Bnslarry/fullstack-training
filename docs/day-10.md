# Day 10 - Tags 关系建模与查询语义落档

## 今日目标

- 结合当前工作区改动，沉淀 Articles + Tags 的实现决策
- 解释为何采用显式 `ArticleTag` 中间表
- 明确 tag 名规范化规则与更新语义
- 记录按 tag 查询的 Prisma 过滤方式与 e2e 覆盖点

## 变更范围（工作区快照）

- 数据模型：
  - `apps/api/prisma/schema.prisma`
  - 新增 `Tag`、`ArticleTag`，并在 `Article` 增加 `tags` 关系
- 应用装配：
  - `apps/api/src/app.module.ts` 挂载 `TagsModule`
  - `apps/api/src/modules/tags/*` 新增 `GET /tags`
- 文章模块：
  - `apps/api/src/modules/articles/articles.controller.ts`
  - `apps/api/src/modules/articles/articles.service.ts`
  - `apps/api/src/modules/articles/repositories/articles.prisma.repository.ts`
  - `apps/api/src/modules/articles/dto/*` 增加 `tagList` 入参
- e2e：
  - `apps/api/test/tags.e2e.spec.ts`

---

## 1) 为什么用显式 ArticleTag

当前实现使用显式中间表 `ArticleTag`（而不是 Prisma 隐式多对多）主要出于以下考虑：

- 可控性更高：`ArticleTag` 有独立主键约束 `@@id([articleId, tagId])`，同时可单独建索引（如 `@@index([tagId])`）以优化 tag 反向查询。
- 语义更清晰：关系本身可表达业务行为（例如“某文章何时绑定某标签”），当前已在中间表保留 `createdAt`。
- 便于演进：后续若要在关系上挂载字段（如来源、权重、人工/自动标注），显式表可以平滑扩展，不必重构关系形态。
- 清理策略明确：外键均为 `onDelete: Cascade`，删除文章或标签时关系数据可自动一致。

简而言之：当前需求虽不复杂，但显式中间表更符合“可演进、可优化、可观察”的长期方案。

---

## 2) tag 名规范化策略

规范化发生在 `ArticlesService.create()`，规则如下：

- 对每个 tag 执行 `trim()`：去掉首尾空白
- 执行 `toLowerCase()`：统一小写
- 过滤空字符串：`filter(Boolean)`
- 去重：`Array.from(new Set(...))`

因此输入如：

- `["JavaScript", " node ", "javascript", ""]`

最终会规范为：

- `["javascript", "node"]`

这套策略的目的：

- 避免同义标签因大小写/空白差异重复存储
- 保持查询口径统一，减少前后端对齐成本
- 降低 `Tag.name` 唯一索引冲突与脏数据概率

---

## 3) 更新语义：覆盖式 / 不传不改

`PATCH /articles/:slug` 在标签上的语义是：

- **传了 `tagList`**：按“覆盖式更新”处理  
  先删掉该文章全部旧关系，再按新的 `tagList` 重建关系
- **没传 `tagList`**：标签不改动  
  仅更新正文相关字段（`title/description/body`）

仓储实现里通过 `Array.isArray(tagList)` 判断是否“显式传入”，因此可以稳定区分“清空/替换”与“保持原样”。

这个语义对调用方是直观的：

- 想替换标签 -> 传新数组
- 想清空标签 -> 传空数组 `[]`
- 不想动标签 -> 不传该字段

---

## 4) 查询过滤方式：Prisma where.tags.some

`GET /articles` 新增 `tag` 查询参数，控制器会先做 `trim().toLowerCase()`，再传入仓储查询。

仓储层核心过滤条件：

- `where.tags = { some: { tag: { name: tag } } }`

含义是：只返回“至少有一个关联标签名等于 `tag`”的文章。  
结合分页查询（`count + findMany`）后，最终响应可同时返回：

- `items`：命中文章列表（每项含 `tagList`）
- `total`：命中总数（用于分页 UI）

---

## e2e 对齐记录

`apps/api/test/tags.e2e.spec.ts` 已覆盖并验证以下行为：

- 注册用户并获取 `accessToken` 后再创建文章
- 创建文章传 `tagList: ["JavaScript", " node "]`，断言返回 `["javascript", "node"]`
- 更新文章传 `tagList: ["db"]`，断言旧标签不再出现（覆盖式更新）
- `GET /articles?tag=db` 断言 `total = 1` 且仅返回命中文章
- `GET /tags` 返回已出现标签集合，至少包含测试中新建标签

测试清库顺序也已统一为：

1. `articleTag`
2. `article`
3. `tag`
4. `refreshToken`
5. `user`

---

## 今日结论

本轮改动将 Tags 能力从“字段层”升级到“关系层”：

- 建模上采用显式 `ArticleTag`，为后续扩展与性能优化留足空间
- 输入口径上通过 lower/trim/去重稳定 `tagList` 语义
- 更新行为上明确“覆盖式 / 不传不改”
- 查询实现上使用 `where.tags.some` 精确表达“按标签筛文章”

配合 e2e 用例，当前标签链路（创建、更新、过滤、聚合列表）已具备可回归、可演进的基础。
