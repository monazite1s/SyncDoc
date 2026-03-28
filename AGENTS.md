# AGENTS.md - AI 开发指导文件

> 本文件为 AI 开发助手提供统一的项目开发规范和指导。

---

## 1. 项目概述

### 1.1 技术栈

| 层级     | 技术                    |
| -------- | ----------------------- |
| 前端框架 | Next.js 15 (App Router) |
| UI 框架  | React 19                |
| 样式方案 | Tailwind CSS            |
| 编辑器   | Tiptap Editor           |
| 实时协作 | Yjs                     |
| 状态管理 | Zustand                 |
| 后端框架 | NestJS 11               |
| ORM      | Prisma                  |
| 数据库   | PostgreSQL              |
| 缓存     | Redis                   |
| 实时通信 | WebSocket (Socket.io)   |
| 认证     | JWT                     |

### 1.2 Monorepo 结构

```
collab-editor/
├── frontend/              # Next.js 15 前端应用
│   ├── app/               # App Router 页面
│   ├── components/        # React 组件
│   ├── hooks/             # 自定义 Hooks
│   ├── lib/               # 工具函数
│   ├── providers/         # React Context Providers
│   ├── stores/            # Zustand 状态存储
│   └── types/             # TypeScript 类型定义
│
├── backend/               # NestJS 11 后端应用
│   ├── src/
│   │   ├── modules/       # 功能模块
│   │   ├── prisma/        # Prisma 服务
│   │   ├── config/        # 配置模块
│   │   └── common/        # 共享工具
│   └── prisma/            # 数据库 Schema
│
├── packages/              # 共享包
│   ├── eslint-config/     # ESLint 共享配置
│   ├── prettier-config/   # Prettier 共享配置
│   └── typescript-config/ # TypeScript 共享配置
│
└── docs/                  # 技术文档 (../docs/)
```

### 1.3 核心功能

- 用户认证（注册/登录/JWT）
- 文档 CRUD 操作
- 实时协作编辑
- 版本历史管理
- WebSocket 同步

---

## 2. 开发命令

### 2.1 日常开发

```bash
# 安装依赖
pnpm install

# 启动所有服务
pnpm dev

# 单独启动
pnpm dev:frontend    # 前端 :3000
pnpm dev:backend     # 后端 :3001
```

### 2.2 构建与检查

```bash
pnpm build           # 构建所有包
pnpm lint            # 代码检查
pnpm type-check      # 类型检查
pnpm format          # 格式化代码
pnpm clean           # 清理构建产物
```

### 2.3 数据库操作

```bash
pnpm db:up           # 启动 Docker 服务 (PostgreSQL + Redis)
pnpm db:down         # 停止 Docker 服务
pnpm db:migrate      # 运行数据库迁移
pnpm db:studio       # 打开 Prisma Studio
pnpm db:seed         # 填充测试数据
```

### 2.4 环境要求

- Node.js 22 LTS
- pnpm 10+
- Docker & Docker Compose

---

## 3. 编码规范

### 3.1 不可变数据原则 (CRITICAL)

**始终创建新对象，绝不修改现有对象：**

```typescript
// ❌ 错误：直接修改原对象
state.items.push(newItem);
obj.field = value;

// ✅ 正确：返回新对象
return [...state.items, newItem];
return { ...obj, field: value };
```

**理由：** 不可变数据防止隐藏副作用，简化调试，支持安全的并发操作。

### 3.2 文件组织规范

- **小文件优于大文件**：单个文件控制在 200-400 行，最大不超过 800 行
- **高内聚低耦合**：按功能/领域组织，而非按类型
- **提取公共逻辑**：大型模块应拆分为独立工具函数

### 3.3 错误处理规范

- 在每一层显式处理错误
- UI 层提供用户友好的错误提示
- 服务端记录详细的错误上下文
- **绝不静默吞掉错误**

```typescript
// ✅ 正确示例
try {
    await service.execute();
} catch (error) {
    logger.error('操作失败', { context, error });
    throw new UserFriendlyError('操作失败，请稍后重试');
}
```

### 3.4 输入验证规范

- 在系统边界验证所有用户输入
- 使用 schema 验证（如 Zod）
- 快速失败，提供清晰错误信息
- **永不信任外部数据**

### 3.5 代码质量检查清单

- [ ] 代码可读且命名清晰
- [ ] 函数不超过 50 行
- [ ] 文件不超过 800 行
- [ ] 嵌套层级不超过 4 层
- [ ] 正确处理错误
- [ ] 无硬编码值（使用常量或配置）
- [ ] 使用不可变模式

---

## 4. 测试要求

### 4.1 测试覆盖率要求

**最低覆盖率：80%**

### 4.2 测试类型

| 类型     | 说明                | 范围                     |
| -------- | ------------------- | ------------------------ |
| 单元测试 | 独立函数/组件       | utils, hooks, components |
| 集成测试 | API 端点/数据库操作 | services, controllers    |
| E2E 测试 | 关键用户流程        | 完整业务场景             |

### 4.3 TDD 工作流

```
1. 编写测试 (RED)     → 测试应该失败
2. 最小实现 (GREEN)   → 测试通过
3. 重构优化 (IMPROVE) → 保持测试通过
4. 验证覆盖率        → 确保达到 80%+
```

---

## 5. Agent 使用指南

### 5.1 可用 Agent 列表

| Agent                  | 用途         | 使用时机         |
| ---------------------- | ------------ | ---------------- |
| `planner`              | 实现计划     | 复杂功能、重构   |
| `architect`            | 系统设计     | 架构决策         |
| `tdd-guide`            | 测试驱动开发 | 新功能、Bug 修复 |
| `code-reviewer`        | 代码审查     | 编写代码后       |
| `security-reviewer`    | 安全分析     | 提交前           |
| `build-error-resolver` | 构建错误修复 | 构建失败时       |
| `e2e-runner`           | E2E 测试     | 关键用户流程     |

### 5.2 Agent 使用场景

**无需用户提示，自动使用：**

1. **复杂功能请求** → 使用 `planner` agent
2. **代码刚写完/修改** → 使用 `code-reviewer` agent
3. **Bug 修复或新功能** → 使用 `tdd-guide` agent
4. **架构决策** → 使用 `architect` agent

### 5.3 并行执行策略

对于独立操作，**始终并行执行**：

```markdown
# 正确：并行执行

1. Agent 1: 认证模块安全分析
2. Agent 2: 缓存系统性能审查
3. Agent 3: 工具函数类型检查

# 错误：不必要的串行

先 Agent 1，再 Agent 2，再 Agent 3
```

---

## 6. Git 工作流

### 6.1 Commit 消息格式

```
<type>: <description>

[optional body]
```

**Types:** `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`

**示例：**

```
feat: 添加文档版本历史功能

- 支持查看历史版本
- 支持版本对比
- 支持版本回滚
```

### 6.2 分支命名规范

```
feature/<功能名称>    # 新功能
fix/<问题描述>        # Bug 修复
refactor/<重构内容>   # 代码重构
docs/<文档内容>       # 文档更新
```

### 6.3 PR 流程

1. 分析完整 commit 历史
2. 使用 `git diff [base]...HEAD` 查看所有变更
3. 起草全面的 PR 描述
4. 包含测试计划
5. 新分支使用 `-u` 标志推送

---

## 7. 语言规范

| 场景     | 语言               |
| -------- | ------------------ |
| 思考过程 | 英文               |
| 最终回答 | **中文**           |
| 代码注释 | **中文**           |
| 提交信息 | 中文或遵循项目约定 |

### 代码注释示例

```typescript
// 计算用户积分总和
function calculateTotalPoints(userId: string): number {
    // 从数据库获取用户的所有积分记录
    const records = await getPointRecords(userId);
    // 累加并返回
    return records.reduce((sum, r) => sum + r.points, 0);
}
```

### 例外情况

- 专有名词可使用英文（API、HTTP、TypeScript 等）
- 代码本身（变量名、函数名、类名）
- 命令行输出保持原始格式
- 用户明确要求使用英文

---

## 8. 安全检查清单

**每次提交前必查：**

- [ ] 无硬编码密钥（API keys, passwords, tokens）
- [ ] 所有用户输入已验证
- [ ] SQL 注入防护（参数化查询）
- [ ] XSS 防护（HTML 转义）
- [ ] CSRF 保护已启用
- [ ] 认证/授权已验证
- [ ] 所有端点有速率限制
- [ ] 错误消息不泄露敏感信息

### 密钥管理

- **绝不**在源代码中硬编码密钥
- **始终**使用环境变量或密钥管理器
- 启动时验证必需的密钥是否存在
- 轮换任何可能已暴露的密钥

---

## 9. 相关文档链接

- 架构设计：`../docs/01-architecture/`
- 安全规范：`../docs/02-security/`
- 前端开发：`../docs/03-frontend/`
- 后端开发：`../docs/04-backend/`
- 协作功能：`../docs/05-collaboration/`
- 部署指南：`../docs/06-deployment/`

---

## 10. 快速参考

```bash
# 一键启动开发环境
pnpm install && pnpm db:up && pnpm dev

# 完整检查流程
pnpm lint && pnpm type-check && pnpm build

# 数据库重置
pnpm db:down && pnpm db:up && pnpm db:migrate && pnpm db:seed
```
