# 编码规范

## 概述

本文档定义协同文档编辑系统的统一编码规范，确保代码质量和团队协作效率。

> **AI Agent 开发必读**：在进行任何代码修改前，请先阅读 [AI Agent 开发指南](./ai-agent-guidelines.md) 和 [代码审查检查清单](./code-review-checklist.md)。

---

## 0. AI Agent 开发规范

### 0.1 代码修改优先级

| 优先级        | 操作类型     | 需要确认       |
| ------------- | ------------ | -------------- |
| **1（最高）** | 修改现有逻辑 | 否             |
| **2**         | 删除冗余代码 | 否             |
| **3（最低）** | 新增逻辑     | **是（必须）** |

### 0.2 文件大小限制

#### 前端文件

| 文件类型               | 推荐行数 | 最大行数 |
| ---------------------- | -------- | -------- |
| 页面组件               | 200-300  | 400      |
| UI 组件                | 100-200  | 300      |
| Hook 文件              | 100-200  | 300      |
| 工具函数               | 50-150   | 200      |
| 编辑器核心配置（例外） | 300-500  | 800      |

#### 后端文件

| 文件类型   | 推荐行数 | 最大行数 |
| ---------- | -------- | -------- |
| Controller | 100-200  | 300      |
| Service    | 200-400  | 600      |
| DTO        | 50-150   | 150      |

#### 通用限制

| 限制项         | 值    |
| -------------- | ----- |
| 单函数最大行数 | 50 行 |
| 嵌套层级       | 4 层  |
| 参数数量       | 4 个  |

> 详细规范请参阅 [AI Agent 开发指南](./ai-agent-guidelines.md)。

---

## 1. 不可变数据原则 (CRITICAL)

### 1.1 核心原则

**始终创建新对象，绝不修改现有对象。**

```typescript
// ❌ 错误：直接修改原对象
state.items.push(newItem);
obj.field = value;
array[index] = newValue;

// ✅ 正确：返回新对象
return [...state.items, newItem];
return { ...obj, field: value };
return array.map((item, i) => (i === index ? newValue : item));
```

### 1.2 React 状态更新

```typescript
// ❌ 错误：直接修改状态
const [user, setUser] = useState({ name: '', email: '' });
user.name = 'new name';
setUser(user);

// ✅ 正确：创建新对象
setUser({ ...user, name: 'new name' });

// ✅ 正确：使用函数式更新
setUser((prev) => ({ ...prev, name: 'new name' }));
```

### 1.3 数组操作

```typescript
// 添加元素
const newArray = [...oldArray, newItem];

// 删除元素
const newArray = oldArray.filter((item) => item.id !== idToRemove);

// 更新元素
const newArray = oldArray.map((item) => (item.id === id ? { ...item, updated: true } : item));

// 排序（sort 会修改原数组）
const sortedArray = [...oldArray].sort((a, b) => a.name.localeCompare(b.name));
```

### 1.4 嵌套对象更新

```typescript
// ❌ 错误
state.nested.field = value;

// ✅ 正确：使用展开运算符
const newState = {
    ...state,
    nested: {
        ...state.nested,
        field: value,
    },
};

// ✅ 正确：使用 immer（推荐用于深层嵌套）
import { produce } from 'immer';

const newState = produce(state, (draft) => {
    draft.nested.deep.field = value;
});
```

### 1.5 为什么要不可变？

| 优势     | 说明                             |
| -------- | -------------------------------- |
| 可预测性 | 数据变化可追踪，便于调试         |
| 性能优化 | React 可高效判断是否需要重新渲染 |
| 时间旅行 | 支持撤销/重做功能                |
| 并发安全 | 避免竞态条件和数据竞争           |
| 测试友好 | 纯函数易于测试                   |

---

## 2. 文件组织规范

### 2.1 文件大小原则

- **推荐范围**：200-400 行
- **最大限制**：800 行
- **超出处理**：拆分为多个模块或提取工具函数

### 2.2 目录组织原则

**按功能/领域组织，而非按类型：**

```
// ❌ 按类型组织（不推荐）
src/
├── components/
│   ├── Button.tsx
│   ├── Input.tsx
│   └── DocumentEditor.tsx
├── hooks/
├── utils/

// ✅ 按功能组织（推荐）
src/
├── features/
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   ├── documents/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   └── collaboration/
└── shared/
    ├── components/
    └── utils/
```

### 2.3 模块导出

```typescript
// 使用 index.ts 统一导出
// features/documents/index.ts
export { DocumentEditor } from './components/DocumentEditor';
export { useDocument } from './hooks/useDocument';
export type { Document, DocumentCreateInput } from './types';
```

### 2.4 文件命名规范

| 类型     | 规范                 | 示例                  |
| -------- | -------------------- | --------------------- |
| 组件     | PascalCase           | `DocumentEditor.tsx`  |
| Hook     | camelCase + use 前缀 | `useDocument.ts`      |
| 工具函数 | camelCase            | `formatDate.ts`       |
| 类型定义 | PascalCase           | `Document.ts`         |
| 常量     | UPPER_SNAKE_CASE     | `API_ENDPOINTS.ts`    |
| 测试文件 | 原文件名 + .test     | `useDocument.test.ts` |

### 2.5 组件使用优先级（前端）

**优先级规则**：

```
1. shadcn/UI 组件 → 最高优先级（components/ui/）
2. 项目自定义组件 → 次优先级
   - components/common/ 通用组件
   - components/editor/ 编辑器组件
   - components/collaboration/ 协同组件
3. 第三方组件库 → 最后选择（需说明原因）
4. 新建自定义组件 → 需要确认
```

**组件选择流程**：

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

### 2.6 新增逻辑确认规则

当需要新增逻辑时，必须：

1. **停止当前操作**
2. **向用户说明**：
    - 为什么需要新增？
    - 现有代码为何无法满足？
    - 有无替代方案？
3. **等待用户确认后继续**

**核心原则**：`修改 > 删除 > 新增`

---

## 3. 错误处理规范

### 3.1 错误处理原则

- 在每一层显式处理错误
- UI 层提供用户友好的错误提示
- 服务端记录详细的错误上下文
- **绝不静默吞掉错误**

### 3.2 前端错误处理

```typescript
// ✅ React 组件错误边界
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert">
      <p>出错了：</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>重试</button>
    </div>
  );
}

// 使用
<ErrorBoundary FallbackComponent={ErrorFallback}>
  <DocumentEditor />
</ErrorBoundary>;
```

```typescript
// ✅ 异步操作错误处理
async function fetchDocument(id: string) {
    try {
        const response = await api.get(`/documents/${id}`);
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            // 处理 HTTP 错误
            if (error.response?.status === 404) {
                throw new NotFoundError('文档不存在');
            }
            throw new NetworkError('网络请求失败');
        }
        // 未知错误
        throw error;
    }
}
```

### 3.3 后端错误处理

```typescript
// ✅ NestJS 异常过滤器
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();

        // 记录详细错误日志
        this.logger.error({
            message: exception instanceof Error ? exception.message : 'Unknown error',
            stack: exception instanceof Error ? exception.stack : undefined,
            path: request.url,
            method: request.method,
        });

        // 构建响应
        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const message =
            process.env.NODE_ENV === 'production'
                ? '服务器内部错误'
                : exception instanceof Error
                  ? exception.message
                  : 'Unknown error';

        response.status(status).json({
            success: false,
            error: {
                code: status,
                message,
            },
            timestamp: new Date().toISOString(),
        });
    }
}
```

### 3.4 自定义错误类型

```typescript
// 定义业务错误
export class AppError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode: number = 500
    ) {
        super(message);
        this.name = 'AppError';
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string) {
        super(`${resource}不存在`, 'NOT_FOUND', 404);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message: string = '未授权访问') {
        super(message, 'UNAUTHORIZED', 401);
    }
}

export class ValidationError extends AppError {
    constructor(
        message: string,
        public details?: Record<string, string>
    ) {
        super(message, 'VALIDATION_ERROR', 400);
    }
}
```

---

## 4. 输入验证规范

### 4.1 验证原则

- 在系统边界验证所有用户输入
- 使用 schema 验证（如 Zod）
- 快速失败，提供清晰错误信息
- **永不信任外部数据**

### 4.2 前端验证

```typescript
import { z } from 'zod';

// 定义 schema
const loginSchema = z.object({
    email: z.string().email('请输入有效的邮箱地址'),
    password: z.string().min(8, '密码至少 8 位'),
});

type LoginInput = z.infer<typeof loginSchema>;

// 使用验证
function validateLogin(input: unknown): LoginInput {
    return loginSchema.parse(input);
}
```

### 4.3 后端验证

```typescript
// NestJS + Zod 验证管道
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: z.ZodSchema) {}

  transform(value: unknown) {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new BadRequestException({
          message: '输入验证失败',
          errors: error.errors,
        });
      }
      throw error;
    }
  }
}

// 使用
@Post('login')
async login(@Body(new ZodValidationPipe(loginSchema)) body: LoginInput) {
  return this.authService.login(body);
}
```

### 4.4 API 响应验证

```typescript
// 验证 API 响应
const userResponseSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    createdAt: z.string().datetime(),
});

async function fetchUser(id: string): Promise<User> {
    const response = await api.get(`/users/${id}`);
    return userResponseSchema.parse(response.data);
}
```

---

## 5. 代码质量检查清单

### 5.1 提交前检查

- [ ] 代码可读且命名清晰
- [ ] 函数不超过 50 行
- [ ] 文件不超过 800 行
- [ ] 嵌套层级不超过 4 层
- [ ] 正确处理错误
- [ ] 无硬编码值（使用常量或配置）
- [ ] 使用不可变模式

### 5.2 命名规范

| 类型     | 规范                | 示例                               |
| -------- | ------------------- | ---------------------------------- |
| 变量     | camelCase，描述性   | `documentList`, `isLoading`        |
| 常量     | UPPER_SNAKE_CASE    | `MAX_RETRY_COUNT`                  |
| 函数     | camelCase，动词开头 | `fetchDocuments`, `handleClick`    |
| 布尔值   | is/has/can 前缀     | `isLoading`, `hasError`, `canEdit` |
| 类/接口  | PascalCase          | `DocumentService`, `User`          |
| 私有成员 | \_ 前缀             | `_privateMethod`                   |

### 5.3 注释规范

```typescript
// ✅ 好的注释：解释为什么
// 使用 debounce 避免频繁请求，限制每 300ms 最多一次
const debouncedSearch = useMemo(() => debounce(handleSearch, 300), [handleSearch]);

// ✅ 好的注释：说明复杂逻辑
// CRDT 合并策略：当冲突发生时，使用 Last-Write-Wins 策略
// 时间戳由服务器统一分配，确保全局一致性
function mergeUpdates(local: Update, remote: Update): Update {
    // ...
}

// ❌ 不好的注释：重复代码内容
// 设置 loading 为 true
setLoading(true);
```

---

## 6. 相关文档

- [AI Agent 开发指南](./ai-agent-guidelines.md)
- [代码审查检查清单](./code-review-checklist.md)
- [技术栈选型](./tech-stack.md)
- [系统架构](./system-architecture.md)
- [测试指南](./testing-guide.md)
- [安全最佳实践](../02-security/security-best-practices.md)
