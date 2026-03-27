# AI Agent 开发指南

## 概述

本文档定义 AI Agents 在 SyncDoc 项目中的开发流程规范，确保 AI 辅助开发的一致性、代码质量和架构合规性。

---

## 1. 修改前文档检查流程（必须执行）

### 1.1 检查步骤

```
1. 读取架构文档
   └─► docs/01-architecture/README.md
   └─► docs/03-frontend/architecture.md 或 docs/04-backend/architecture.md

2. 确认操作范围
   └─► 在架构设计范围内 → 继续
   └─► 超出设计范围 → 拒绝，说明原因

3. 检查编码规范
   └─► docs/01-architecture/coding-standards.md
```

### 1.2 文档阅读清单

| 操作类型 | 必读文档 |
|----------|----------|
| **前端开发** | `docs/03-frontend/architecture.md`、`docs/03-frontend/project-structure.md` |
| **后端开发** | `docs/04-backend/architecture.md`、`docs/04-backend/nestjs-modules.md` |
| **协同功能** | `docs/05-collaboration/README.md`、`docs/05-collaboration/crdt-yjs.md` |
| **安全相关** | `docs/02-security/README.md`、`docs/02-security/security-best-practices.md` |
| **通用规范** | `docs/01-architecture/coding-standards.md`、`docs/01-architecture/testing-guide.md` |

### 1.3 架构范围确认

在开始任何代码修改前，必须确认：

- [ ] 已阅读相关架构文档
- [ ] 理解模块边界和职责划分
- [ ] 确认修改在现有架构设计范围内
- [ ] 不引入新的技术栈或架构模式（除非明确批准）

---

## 2. 代码修改优先级

### 2.1 优先级规则

| 优先级 | 操作类型 | 需要确认 | 说明 |
|--------|----------|----------|------|
| **1（最高）** | 修改现有逻辑 | 否 | 优先复用和改进现有代码 |
| **2** | 删除冗余代码 | 否 | 清理无用代码，保持代码库整洁 |
| **3（最低）** | 新增逻辑 | **是（必须）** | 新增需说明原因并获得确认 |

### 2.2 核心原则

```
优先：修改 > 删除 > 新增
```

**原因**：
- 修改现有代码可以保持代码库的一致性
- 删除冗余代码减少维护成本
- 新增逻辑会增加复杂度和维护负担

---

## 3. 新增逻辑确认流程

### 3.1 确认步骤

当需要新增逻辑时，必须：

```
1. 停止当前操作
2. 向用户说明：
   - 为什么需要新增？
   - 现有代码为何无法满足？
   - 有无替代方案？
3. 等待用户确认后继续
```

### 3.2 确认模板

```markdown
## 新增逻辑确认请求

**操作类型**：[新增组件/新增函数/新增模块/新增依赖]

**原因说明**：
[解释为什么需要新增]

**现有代码分析**：
[说明现有代码为何无法满足需求]

**替代方案**：
[列出可能的替代方案，如果没有则说明]

**影响范围**：
[说明新增逻辑的影响范围]

**请确认是否继续**：是 / 否
```

---

## 4. 文件大小限制

### 4.1 前端文件限制

| 文件类型 | 推荐行数 | 最大行数 | 说明 |
|----------|----------|----------|------|
| 页面组件 | 200-300 | 400 | `app/**/page.tsx` |
| UI 组件 | 100-200 | 300 | `components/ui/*.tsx` |
| Hook 文件 | 100-200 | 300 | `hooks/*.ts` |
| 工具函数 | 50-150 | 200 | `lib/**/*.ts` |
| **例外**（编辑器核心配置） | 300-500 | 800 | `lib/editor/extensions.ts` 等 |

### 4.2 后端文件限制

| 文件类型 | 推荐行数 | 最大行数 | 说明 |
|----------|----------|----------|------|
| Controller | 100-200 | 300 | `*.controller.ts` |
| Service | 200-400 | 600 | `*.service.ts` |
| DTO | 50-150 | 150 | `dto/*.ts` |
| Module | 30-100 | 150 | `*.module.ts` |

### 4.3 通用限制

| 限制项 | 值 | 说明 |
|--------|-----|------|
| 单函数最大行数 | 50 行 | 超过需要拆分 |
| 嵌套层级 | 4 层 | 超过需要重构 |
| 参数数量 | 4 个 | 超过使用对象封装 |

---

## 5. 组件使用优先级（前端）

### 5.1 优先级规则

```
1. shadcn/UI 组件 → 最高优先级（components/ui/）
2. 项目自定义组件 → 次优先级
   - components/common/ 通用组件
   - components/editor/ 编辑器组件
   - components/collaboration/ 协同组件
3. 第三方组件库 → 最后选择（需说明原因）
4. 新建自定义组件 → 需要确认
```

### 5.2 组件选择流程

```
开始
  │
  ▼
┌──────────────────┐
│ shadcn/UI 是否   │──是──▶ 使用 shadcn/UI 组件
│ 满足需求？       │
└────────┬─────────┘
         │否
         ▼
┌──────────────────┐
│ 项目组件是否     │──是──▶ 使用项目组件
│ 满足需求？       │
└────────┬─────────┘
         │否
         ▼
┌──────────────────┐
│ 第三方库是否     │──是──▶ 使用第三方（需说明原因）
│ 满足需求？       │
└────────┬─────────┘
         │否
         ▼
┌──────────────────┐
│ 申请新建组件     │
│ （需用户确认）   │
└──────────────────┘
```

---

## 6. 后端模块结构规范

### 6.1 NestJS 模块目录结构

```
modules/[模块名]/
├── [模块名].module.ts      # 模块定义
├── [模块名].controller.ts   # 控制器（100-200行，最大300行）
├── [模块名].service.ts      # 业务逻辑（200-400行，最大600行）
├── dto/                     # 数据传输对象（最大150行）
│   ├── create-[实体].dto.ts
│   ├── update-[实体].dto.ts
│   └── index.ts
└── interfaces/              # 接口定义
    └── [实体].interface.ts
```

### 6.2 服务层规范

| 规范项 | 说明 |
|--------|------|
| **单一职责** | 每个服务只负责一个业务领域 |
| **依赖注入** | 通过构造函数注入依赖 |
| **错误处理** | 抛出明确的业务异常 |
| **日志记录** | 使用 NestJS Logger |
| **事务管理** | 使用 Prisma 事务 |

---

## 7. 不可变数据原则

### 7.1 核心规则

**始终创建新对象，绝不修改现有对象。**

### 7.2 正确示例

```typescript
// ✅ 正确：返回新对象
return [...state.items, newItem];
return { ...obj, field: value };
return array.map((item, i) => (i === index ? newValue : item));

// ✅ 正确：React 状态更新
setUser((prev) => ({ ...prev, name: 'new name' }));

// ✅ 正确：使用 immer 处理深层嵌套
const newState = produce(state, (draft) => {
  draft.nested.deep.field = value;
});
```

### 7.3 错误示例

```typescript
// ❌ 错误：直接修改原对象
state.items.push(newItem);
obj.field = value;
array[index] = newValue;

// ❌ 错误：直接修改状态
user.name = 'new name';
setUser(user);
```

---

## 8. 错误处理规范

### 8.1 前端错误处理

- 使用 ErrorBoundary 捕获组件错误
- 使用 try-catch 处理异步操作
- 提供用户友好的错误提示

### 8.2 后端错误处理

- 使用 NestJS 异常过滤器统一处理
- 抛出明确的业务异常
- 记录详细的错误日志

---

## 9. 测试规范

### 9.1 测试覆盖率要求

| 类型 | 最低覆盖率 | 目标覆盖率 |
|------|------------|------------|
| 单元测试 | 80% | 90% |
| 集成测试 | 70% | 80% |
| E2E 测试 | 关键流程 | 全部流程 |

### 9.2 测试文件命名

| 类型 | 命名规范 | 示例 |
|------|----------|------|
| 单元测试 | `*.test.ts` | `useDocument.test.ts` |
| 集成测试 | `*.spec.ts` | `documents.service.spec.ts` |
| E2E 测试 | `*.e2e-spec.ts` | `auth.e2e-spec.ts` |

---

## 10. 相关文档

- [编码规范](./coding-standards.md)
- [代码审查检查清单](./code-review-checklist.md)
- [测试指南](./testing-guide.md)
- [前端架构](../03-frontend/architecture.md)
- [后端架构](../04-backend/architecture.md)
