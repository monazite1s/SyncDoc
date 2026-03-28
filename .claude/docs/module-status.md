# 模块状态追踪

> 最后更新: 2026-03-29

## 后端模块

### Auth (认证) — 90%

- [x] 用户注册 (邮箱+用户名查重, bcrypt)
- [x] 用户登录 (JWT 签发)
- [x] 登出 (Session 失效)
- [x] Token 刷新 (refresh token rotation)
- [x] 用户信息查询
- [x] HttpOnly cookie 设置
- [x] JWT Strategy (cookie + header 双模式)
- [x] 全局 JWT 守卫
- [ ] 登录/注册 API 接入前端表单 (前端仅有 UI placeholder)

### Collaboration (协同) — 85%

- [x] Hocuspocus WebSocket 服务器
- [x] 文档状态持久化 (Yjs binary → PostgreSQL)
- [x] 编辑历史记录
- [x] 用户权限验证
- [x] JWT 认证集成
- [ ] Redis 集成 (配置存在但 @hocuspocus/extension-redis 未实际启用)
- [ ] 多实例水平扩展

### Documents (文档) — 10%

- [x] Prisma 模型定义
- [ ] CRUD API
- [ ] 协作者管理
- [ ] 权限检查

### Versions (版本) — 5%

- [x] Prisma 模型定义 (DocumentVersion, DocumentEdit)
- [ ] 版本快照创建
- [ ] 版本列表查询
- [ ] 版本回滚
- [ ] diff 对比

## 前端模块

### 主题系统 — 95%

- [x] CSS 变量 (中性灰调 + Claude 橙)
- [x] Tailwind 语义化 token
- [x] 字体引入 (Inter + JetBrains Mono)
- [x] ThemeProvider (next-themes)
- [x] 所有页面主题化
- [ ] 主题切换按钮 (UI 存在但未实现)

### 认证流程 — 70%

- [x] Auth store (zustand persist)
- [x] API client (withCredentials, 401 自动刷新)
- [x] Middleware (cookie 检测, 路由保护)
- [x] AuthGuard (客户端守卫 + 骨架屏)
- [ ] 登录表单 onSubmit
- [ ] 注册表单 onSubmit
- [ ] Logout 按钮绑定

### 编辑器 — 20%

- [x] Tiptap 依赖安装
- [x] 协同编辑扩展配置
- [ ] 编辑器页面
- [ ] 工具栏
- [ ] 实时协同 UI

### 文档管理 — 15%

- [x] 文档列表页面 UI (placeholder)
- [ ] 文档 CRUD 交互
- [ ] 协作者管理 UI
- [ ] 分享功能

### 错误处理 — 80%

- [x] error.tsx / not-found.tsx / global-error.tsx
- [x] loading.tsx 骨架屏
- [x] API client 错误拦截
- [ ] 表单级错误展示

## 共享包

### @collab/types — 80%

- [x] User, Document, Auth 类型定义
- [x] 枚举 (UserStatus, DocumentStatus, CollaboratorRole)
- [x] API 响应类型
- [x] 前端接入
- [ ] 后端 DTO 迁移使用共享类型
