# Day 09 - Articles 列表查询与数据返回策略复盘

## 今日目标

- 基于当前工作区已完成的 Articles 改动，沉淀列表查询能力的设计意图
- 解释 `include/select` 在当前实现中如何避免 N+1 与字段泄露
- 说明现有返回结构如何为后续 `follow/feed` 能力预留演进空间
- 回顾本轮 e2e 用例实际覆盖到的行为边界

## 当前实现快照

- 入口：`GET /articles`
- 控制器可接收 query：`page`、`pageSize`、`author`、`q`
- Service 透传分页与过滤条件到 Repository
- Repository 使用 Prisma 组装 `where`，并以一次 `count` + 一次 `findMany` 返回 `items + total`
- `author` 关系字段统一使用 `include + select`，只返回 `id/email/nickname`

---

## 1) 列表支持哪些 query

当前 `GET /articles` 支持 4 类查询参数：

- `page`：页码，最小值兜底为 `1`
- `pageSize`：每页条数，最小值兜底为 `1`，最大值限制为 `50`
- `author`：作者邮箱过滤（控制器层变量名 `authorEmail`）
- `q`：关键字搜索（对 `title/body` 做不区分大小写的 `contains` 匹配）

对应行为可概括为：

- 无筛选：按 `createdAt desc` 返回分页列表
- `author` 筛选：只返回该作者文章
- `q` 检索：命中 `title` 或 `body` 的文章会被返回
- `author + q` 组合：在作者范围内做关键字搜索（同一个 `where` 内组合条件）

这套 query 集合是“最小可用”的列表能力：先解决分页、作者过滤、模糊搜索三件核心事，再把响应结构稳定下来，便于后续叠加 feed 维度。

---

## 2) 为什么要用 include/select 防 N+1

### 先看问题本质

列表页通常会展示“文章 + 作者摘要信息”。如果先查文章列表，再对每条文章单独查一次作者，就会变成：

- 1 次查文章
- N 次查作者

这就是典型 N+1，数据量一大时查询次数和延迟都会明显上升。

### 当前实现怎么做

Repository 在 `findMany` 时直接：

- `include: { author: { select: { id, email, nickname } } }`

效果是：

- 一次 `findMany` 就把文章及作者必要字段一并取回
- 不需要额外循环请求作者，避免 N+1 查询风暴

### 为什么还要 `select`

`include` 解决“要不要一起取”，`select` 解决“取哪些字段”。

在 `User` 模型里存在 `passwordHash` 等敏感字段，列表返回如果不做字段白名单，后续代码改动或 DTO 映射疏漏时容易出现信息泄露风险。当前固定 `id/email/nickname`，等于把 API 输出面收窄并显式化。

---

## 3) 返回结构如何为 follow/feed 做铺垫

当前列表响应结构：

- 外层：`{ data: { items, page, pageSize, total } }`
- 每个 item：`ArticleViewDTO`，内含 `author: { id, email, nickname }`

这套结构对后续 `follow/feed` 的价值主要有三点：

- 分页壳已固定：feed 仍可复用 `items/page/pageSize/total` 协议，前端无需重写分页读取逻辑
- 作者摘要已内嵌：未来 feed 常见的“是否关注作者”“作者展示卡片”都有天然锚点（`author.id`）
- DTO 扩展成本低：可在不破坏主结构的前提下，为 item 增加衍生字段（如 `favorited`、`followingAuthor`、`source`）

一个可演进方向是：

- `GET /articles` 继续承载通用列表（公开流）
- 新增 `GET /articles/feed` 承载关注流
- 两者共享大部分 DTO 与分页协议，只在查询条件和个别衍生字段上分叉

这样可以把“查询逻辑复杂度”留在服务端，同时保持前端消费接口的一致性。

---

## 4) e2e 覆盖点

当前 `apps/api/test/articles.e2e.spec.ts` 这条用例聚焦在“列表聚合能力”本身，覆盖点包括：

- 分页：`page=1&pageSize=2`，断言返回条数与 `total`
- 作者过滤：`author=<email>`，断言只返回目标作者文章
- 关键字检索：`q=hello`，断言命中标题或正文的文章可被查到
- 关联作者信息：断言每条 item 含 `author.email/nickname`

同时这条用例也隐式验证了两件事：

- 列表查询不是裸 `Article` 返回，而是包含作者摘要的视图对象
- 通过 `afterEach` 删除测试用户，依赖外键 `onDelete: Cascade` 自动清理其文章，避免测试残留污染后续执行

---

## 拓展工作记录（建议）

- 查询语义增强
  - 给 `q` 增加最小长度校验，避免全表模糊扫描
  - 支持排序参数白名单（如 `createdAt`、`updatedAt`）
- 查询性能
  - 评估 `title/body` 搜索策略（全文索引或专门搜索方案）
  - 保持单次 `findMany` 携带作者摘要，持续避免 N+1
- DTO 演进
  - 为 feed 预留字段：`followingAuthor`、`isMine`、`visibility`
  - 明确“领域对象 vs 接口视图对象”的边界，避免后续在 Controller 层拼字段
- e2e 完整性
  - 增加 `author + q` 组合筛选断言
  - 增加 `page/pageSize` 越界参数兜底断言（负数、超大值、非数字）
  - 增加“无结果”场景断言（`items=[]` 且 `total=0`）

## 今日结论

当前 Articles 列表能力已经具备面向业务迭代的基础形态：查询参数够用、查询模式避免 N+1、返回协议可复用到 feed、e2e 覆盖了主路径。下一步重点应转向“组合筛选完备性 + 大数据量下的检索性能 + feed 语义化字段”的增量演进。
