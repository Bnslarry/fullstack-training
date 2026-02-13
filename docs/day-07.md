# Day 07 - Cookie Auth 实战复盘

## 今日目标

- 前后端对齐基于 Cookie 的 refresh 流程
- 补齐并稳定 refresh/logout 的 e2e 测试
- 新增 Web 登录页，使用 `credentials: "include"` 调用 API
- 总结安全与工程实践：HttpOnly、SameSite、CORS、supertest agent

## 本次代码改动概览

- `apps/api/src/modules/auth/auth.controller.ts`
  - `register`/`login` 设置 `refresh_token` Cookie（`httpOnly + sameSite=lax + path=/auth`）
  - `refresh` 从 `req.cookies.refresh_token` 读取并轮换 Cookie
  - `logout` 清理 Cookie 并撤销 token
- `apps/api/src/main.ts`
  - 启用 `cookie-parser`
  - 启用 `CORS credentials`（`origin=http://localhost:3000`, `credentials=true`）
- `apps/api/test/refresh.e2e.spec.ts`
  - 测试从 body token 改为基于 Cookie 的 refresh 流程
  - 用 `set('Cookie', ...)` 显式验证旧 Cookie 失效与新 Cookie 生效
- `apps/api/test/cookie-refresh.e2e.spec.ts`
  - 用 `supertest.agent` 维持会话 cookie jar
  - 增加 refresh 后 Cookie 变化断言
- `apps/api/test/helpers/cookie.ts`
  - 抽离 `readCookiePair`，统一解析 `set-cookie`
- `apps/web/app/login/page.tsx`
  - 新增 client component 登录页
  - `fetch('/auth/login')` 强制 `credentials: "include"`
  - 登录成功后将 `accessToken` 存在 React state（内存态）

## 测试结果

- 通过：
  - `pnpm --filter api test refresh.e2e.spec.ts cookie-refresh.e2e.spec.ts`
  - `pnpm --filter api test auth.e2e.spec.ts users.e2e.spec.ts refresh.e2e.spec.ts cookie-refresh.e2e.spec.ts`
- 通过：
  - `pnpm --filter web typecheck`

## 问题回答

### 1) refresh token 为何放 HttpOnly Cookie（XSS 风险降低）

- `HttpOnly` 的核心价值：前端 JS 不能读取 Cookie 内容，即使页面被注入恶意脚本，也更难直接窃取 refresh token。
- refresh token 生命周期长、权限高（可换新 access token），比 access token 更需要防“被读走”。
- 当前方案把 refresh token 留在 Cookie，access token 返回给前端用于短期调用，是常见的“长短 token 分工”。
- 这不是“绝对安全”：XSS 仍可发起带 Cookie 的请求（会话骑劫风险仍在），但能显著降低“token 被直接 exfiltrate”的风险。

### 2) SameSite 为什么选 lax（权衡点）

- `SameSite=Strict`：最保守，但用户从外站跳转进入站点时，部分场景可能不带 Cookie，体验可能受影响。
- `SameSite=None`：跨站也带 Cookie，但必须 `Secure`（HTTPS），并且 CSRF 风险面更大。
- `SameSite=Lax`：在安全与可用性间折中。
  - 常规跨站子请求不会自动带上 Cookie（有助于降低 CSRF）
  - 同站点内正常导航和多数本地开发场景仍可用
- 你当前项目的本地开发（`localhost:3000` -> `localhost:3001`）下，`lax` 是较稳妥默认值。

### 3) CORS + credentials 的注意事项

- 前端必须显式：`fetch(..., { credentials: "include" })`，否则浏览器不会带 Cookie。
- 后端必须显式：`app.enableCors({ origin: "http://localhost:3000", credentials: true })`。
- `Access-Control-Allow-Origin` 不能是 `*`，必须是具体源；否则浏览器会拦截带凭证请求。
- 这三者必须同时成立：浏览器请求配置、服务端 CORS、Cookie 属性（`SameSite/Secure/Path`）一致，缺一都会出现“接口看似通，凭证却不生效”。

### 4) e2e 为什么用 supertest agent

- `request.agent()` 会维护一个 cookie jar，自动保存响应里的 `set-cookie`，并在后续请求自动带上。
- 这非常适合验证登录 -> refresh -> logout 的连续会话流程，写法更贴近真实浏览器行为。
- 对比普通 `request()`：每次请求无状态，若要测 Cookie 链路需手动提取并设置 `Cookie` header，样板代码更多。
- 当前仓库里两个测试都演示了：
  - `cookie-refresh.e2e.spec.ts` 用 agent（自动会话）
  - `refresh.e2e.spec.ts` 手动 `set('Cookie', ...)`（显式验证轮换细节）

## 踩坑与沉淀

- 401 的关键原因不是账号，而是测试 app 没挂 `cookie-parser`，导致 `req.cookies` 为空。
- refresh 控制器现在走 Cookie 输入，旧测试里 body 传 `refreshToken` 会失败，测试与接口契约必须同步。
- 并行 e2e 下固定邮箱会互相污染；改为每用例唯一邮箱（`${Date.now()}@bb.com`）并在 `afterEach` 清理更稳。
