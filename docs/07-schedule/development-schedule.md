# 开发排期

## 概述

本文档描述协同文档编辑系统的开发排期和里程碑规划。

## 阶段划分

| 阶段             | 周期   | 核心任务                     | 交付物             |
| ---------------- | ------ | ---------------------------- | ------------------ |
| **P0: 文档编写** | 1 周   | 完成全部技术文档             | docs/ 目录完整文档 |
| **P1: 基础架构** | 1 周   | 项目初始化、数据库设计       | 可运行的空壳项目   |
| **P2: 协同内核** | 2 周   | Hocuspocus 集成、Tiptap 绑定 | 实时协同编辑可用   |
| **P3: 版本管理** | 1.5 周 | 版本快照、回溯、Diff         | 版本功能完整       |
| **P4: 交互打磨** | 1 周   | Awareness、UI 优化           | 产品级体验         |
| **P5: 部署上线** | 0.5 周 | CI/CD、监控配置              | 生产环境可用       |

**总周期：约 7 周**

## 详细排期

### P0: 文档编写 (第 1 周)

#### Day 1-2: 架构文档

- [x] 01-architecture/README.md
- [x] 01-architecture/tech-stack.md
- [x] 01-architecture/system-architecture.md
- [x] 01-architecture/data-flow.md

#### Day 3: 安全文档

- [x] 02-security/README.md
- [x] 02-security/authentication.md
- [x] 02-security/authorization.md
- [x] 02-security/data-encryption.md
- [x] 02-security/security-best-practices.md

#### Day 4: 前端文档

- [x] 03-frontend/README.md
- [x] 03-frontend/project-structure.md
- [x] 03-frontend/tiptap-integration.md
- [x] 03-frontend/yjs-client.md
- [x] 03-frontend/error-handling.md
- [x] 03-frontend/performance.md

#### Day 5: 后端文档

- [x] 04-backend/README.md
- [x] 04-backend/nestjs-modules.md
- [x] 04-backend/hocuspocus-gateway.md
- [x] 04-backend/prisma-schema.md
- [x] 04-backend/version-management.md
- [x] 04-backend/api-reference.md

#### Day 6: 协同文档

- [x] 05-collaboration/README.md
- [x] 05-collaboration/crdt-yjs.md
- [x] 05-collaboration/awareness-protocol.md
- [x] 05-collaboration/version-workflow.md
- [x] 05-collaboration/conflict-resolution.md

#### Day 7: 部署文档

- [x] 06-deployment/README.md
- [x] 06-deployment/platform-overview.md
- [x] 06-deployment/vercel-deploy.md
- [x] 06-deployment/railway-render.md
- [x] 06-deployment/database-setup.md
- [x] 06-deployment/cicd-pipeline.md
- [x] 06-deployment/environment.md
- [x] 06-deployment/monitoring.md
- [x] 07-schedule/development-schedule.md

---

### P1: 基础架构 (第 2 周)

#### Day 1-2: 项目初始化

- [ ] 创建 monorepo 结构
- [ ] 配置 pnpm workspaces
- [ ] 配置 TypeScript
- [ ] 配置 ESLint + Prettier

#### Day 3-4: 后端骨架

- [ ] NestJS 项目初始化
- [ ] Prisma 配置
- [ ] 数据库 Schema 设计
- [ ] 基础模块结构

#### Day 5-6: 前端骨架

- [ ] Next.js 项目初始化
- [ ] Tailwind CSS 配置
- [ ] ShadcnUI 安装
- [ ] 基础组件结构

#### Day 7: 集成测试

- [ ] 前后端联调
- [ ] Docker Compose 配置
- [ ] 基础 API 测试

---

### P2: 协同内核 (第 3-4 周)

#### Week 3: Hocuspocus 集成

##### Day 1-2: 服务端配置

- [ ] Hocuspocus 服务配置
- [ ] WebSocket 认证
- [ ] 文档持久化
- [ ] Redis 扩展配置

##### Day 3-4: 权限集成

- [ ] onAuthenticate 钩子
- [ ] 文档访问控制
- [ ] 角色检查

##### Day 5-7: 测试验证

- [ ] 多客户端连接测试
- [ ] 断线重连测试
- [ ] 并发编辑测试

#### Week 4: Tiptap 绑定

##### Day 1-2: 编辑器配置

- [ ] Tiptap 编辑器初始化
- [ ] Collaboration 扩展
- [ ] CollaborationCursor 扩展

##### Day 3-4: 基础功能

- [ ] 文本格式化
- [ ] 列表支持
- [ ] 撤销/重做

##### Day 5-6: UI 组件

- [ ] 菜单栏组件
- [ ] 状态栏组件
- [ ] 工具栏组件

##### Day 7: 集成测试

- [ ] 实时协同测试
- [ ] 光标同步测试

---

### P3: 版本管理 (第 5-6 周)

#### Day 1-2: 快照服务

- [ ] SnapshotService 实现
- [ ] 自动快照触发
- [ ] 哈希去重

#### Day 3-4: 版本 API

- [ ] 版本创建 API
- [ ] 版本列表 API
- [ ] 版本详情 API

#### Day 5-6: 恢复功能

- [ ] 版本恢复逻辑
- [ ] 恢复前快照
- [ ] 广播更新

#### Day 7-8: 前端集成

- [ ] 版本列表组件
- [ ] 版本预览组件
- [ ] 版本恢复 UI

#### Day 9-10: Diff 功能

- [ ] 版本对比逻辑
- [ ] Diff 展示组件

---

### P4: 交互打磨 (第 7 周)

#### Day 1-2: Awareness 优化

- [ ] 光标同步优化
- [ ] 用户状态展示
- [ ] 在线用户列表

#### Day 3-4: UI 优化

- [ ] 协作者头像
- [ ] 连接状态指示
- [ ] 离线提示

#### Day 5-6: 性能优化

- [ ] 代码分割
- [ ] 懒加载
- [ ] 缓存策略

#### Day 7: 细节打磨

- [ ] 错误处理
- [ ] 加载状态
- [ ] 空状态

---

### P5: 部署上线 (第 8 周)

#### Day 1: 环境准备

- [ ] Neon 数据库创建
- [ ] Upstash Redis 创建
- [ ] 环境变量配置

#### Day 2-3: 部署配置

- [ ] Vercel 前端部署
- [ ] Railway 后端部署
- [ ] 域名配置

#### Day 4: CI/CD

- [ ] GitHub Actions 配置
- [ ] 自动化测试
- [ ] 自动化部署

#### Day 5: 监控配置

- [ ] 错误监控 (Sentry)
- [ ] 性能监控
- [ ] 日志配置

---

## 里程碑

### M1: 文档完成

- **时间**: 第 1 周结束
- **标志**: 所有技术文档编写完成

### M2: 项目骨架

- **时间**: 第 2 周结束
- **标志**: 前后端项目可运行

### M3: 协同可用

- **时间**: 第 4 周结束
- **标志**: 实时协同编辑功能可用

### M4: 版本完整

- **时间**: 第 6 周结束
- **标志**: 版本管理功能完整

### M5: 产品级

- **时间**: 第 7 周结束
- **标志**: 交互体验达到产品级

### M6: 上线

- **时间**: 第 8 周结束
- **标志**: 生产环境部署完成

## 风险与缓解

| 风险             | 可能性 | 影响 | 缓解措施           |
| ---------------- | ------ | ---- | ------------------ |
| Yjs 学习曲线     | 高     | 中   | 提前学习，参考示例 |
| WebSocket 稳定性 | 中     | 高   | 完善重连机制       |
| 性能问题         | 中     | 中   | 早期性能测试       |
| 部署问题         | 低     | 中   | 使用成熟平台       |

## 相关文档

- [系统架构](../01-architecture/README.md)
- [部署与运维](../06-deployment/README.md)
