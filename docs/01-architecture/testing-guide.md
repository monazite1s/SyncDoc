# 测试指南

## 概述

本文档定义协同文档编辑系统的测试策略、规范和最佳实践。

---

## 1. 测试覆盖率要求

### 1.1 最低覆盖率

**项目最低覆盖率要求：80%**

### 1.2 覆盖率目标

| 类型     | 目标覆盖率 | 说明           |
| -------- | ---------- | -------------- |
| 工具函数 | 100%       | 纯函数易于测试 |
| Hooks    | 90%+       | 核心业务逻辑   |
| 组件     | 80%+       | 关键交互路径   |
| API 端点 | 90%+       | 包含错误场景   |
| 服务层   | 90%+       | 业务逻辑核心   |

### 1.3 检查覆盖率

```bash
# 前端
cd frontend
pnpm test -- --coverage

# 后端
cd backend
pnpm test:cov

# 生成 HTML 报告
pnpm test:cov -- --reporter=html
```

---

## 2. 测试类型

### 2.1 单元测试

测试独立的函数、组件和模块。

**适用范围：**

- 工具函数 (utils)
- 自定义 Hooks
- 独立组件
- 状态管理 (stores)

**示例：**

```typescript
// utils/formatDate.test.ts
import { formatDate } from './formatDate';

describe('formatDate', () => {
    it('应该正确格式化日期', () => {
        const date = new Date('2026-03-05T10:30:00Z');
        expect(formatDate(date)).toBe('2026-03-05 10:30');
    });

    it('应该处理无效输入', () => {
        expect(formatDate(null)).toBe('');
        expect(formatDate(undefined)).toBe('');
    });

    it('应该支持自定义格式', () => {
        const date = new Date('2026-03-05T10:30:00Z');
        expect(formatDate(date, 'YYYY/MM/DD')).toBe('2026/03/05');
    });
});
```

```typescript
// hooks/useDocument.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useDocument } from './useDocument';

describe('useDocument', () => {
    it('应该加载文档数据', async () => {
        const { result } = renderHook(() => useDocument('doc-1'));

        expect(result.current.isLoading).toBe(true);

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.document).toBeDefined();
    });

    it('应该处理加载错误', async () => {
        const { result } = renderHook(() => useDocument('invalid-id'));

        await waitFor(() => {
            expect(result.current.error).toBeDefined();
        });
    });
});
```

### 2.2 集成测试

测试多个模块协作的场景，如 API 端点、数据库操作。

**适用范围：**

- API 端点
- 数据库操作
- 服务间交互

**示例：**

```typescript
// backend/test/documents.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Documents API (集成测试)', () => {
    let app: INestApplication;
    let authToken: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        // 获取测试用户 token
        const loginResponse = await request(app.getHttp())
            .post('/auth/login')
            .send({ email: 'test@test.com', password: 'password' });
        authToken = loginResponse.body.access_token;
    });

    afterAll(async () => {
        await app.close();
    });

    describe('GET /documents', () => {
        it('应该返回文档列表', () => {
            return request(app.getHttp())
                .get('/documents')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200)
                .expect((res) => {
                    expect(Array.isArray(res.body.data)).toBe(true);
                });
        });

        it('未认证应该返回 401', () => {
            return request(app.getHttp()).get('/documents').expect(401);
        });
    });

    describe('POST /documents', () => {
        it('应该创建新文档', () => {
            return request(app.getHttp())
                .post('/documents')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ title: '测试文档' })
                .expect(201)
                .expect((res) => {
                    expect(res.body.data.title).toBe('测试文档');
                });
        });
    });
});
```

### 2.3 E2E 测试

测试完整的用户流程，模拟真实用户操作。

**适用范围：**

- 关键业务流程
- 用户注册/登录
- 文档创建/编辑
- 协同编辑

**示例 (Playwright)：**

```typescript
// e2e/document-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('文档管理流程', () => {
    test.beforeEach(async ({ page }) => {
        // 登录
        await page.goto('/login');
        await page.fill('[name="email"]', 'test@test.com');
        await page.fill('[name="password"]', 'password');
        await page.click('button[type="submit"]');
        await page.waitForURL('/documents');
    });

    test('应该能创建并编辑文档', async ({ page }) => {
        // 创建文档
        await page.click('text=新建文档');
        await page.fill('[placeholder="文档标题"]', 'E2E 测试文档');
        await page.click('text=创建');

        // 验证创建成功
        await expect(page.locator('text=E2E 测试文档')).toBeVisible();

        // 编辑文档
        await page.click('text=E2E 测试文档');
        await page.fill('.editor', '这是测试内容');
        await page.waitForTimeout(1000); // 等待自动保存

        // 验证保存成功
        await expect(page.locator('.save-status')).toContainText('已保存');
    });

    test('应该支持实时协同', async ({ browser }) => {
        // 打开两个浏览器上下文
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();

        const page1 = await context1.newPage();
        const page2 = await context2.newPage();

        // 两个用户登录并打开同一文档
        // ... 省略登录代码

        // 用户1 编辑
        await page1.fill('.editor', '用户1的内容');

        // 验证用户2 能看到更新
        await expect(page2.locator('.editor')).toContainText('用户1的内容');
    });
});
```

---

## 3. TDD 工作流

### 3.1 TDD 循环

```
┌─────────────────────────────────────────┐
│                                         │
│   1. 编写测试 (RED)                      │
│      ↓ 测试失败 ✗                        │
│                                         │
│   2. 最小实现 (GREEN)                    │
│      ↓ 测试通过 ✓                        │
│                                         │
│   3. 重构优化 (IMPROVE)                  │
│      ↓ 测试仍然通过 ✓                    │
│                                         │
│   4. 验证覆盖率 → 80%+                   │
│      ↓                                  │
│                                         │
│   返回步骤 1                             │
│                                         │
└─────────────────────────────────────────┘
```

### 3.2 实践示例

```typescript
// Step 1: RED - 编写失败的测试
describe('DocumentService', () => {
    it('应该创建文档并返回 ID', async () => {
        const service = new DocumentService(mockPrisma);
        const result = await service.create({
            title: '测试文档',
            ownerId: 'user-1',
        });

        expect(result.id).toBeDefined();
        expect(result.title).toBe('测试文档');
    });
});

// 运行测试：失败 ✗

// Step 2: GREEN - 最小实现
class DocumentService {
    async create(data: CreateDocumentInput) {
        const document = await this.prisma.document.create({
            data: {
                title: data.title,
                ownerId: data.ownerId,
            },
        });
        return document;
    }
}

// 运行测试：通过 ✓

// Step 3: IMPROVE - 重构
class DocumentService {
    async create(data: CreateDocumentInput): Promise<Document> {
        this.validateCreateInput(data);

        const document = await this.prisma.document.create({
            data: {
                id: this.generateId(),
                title: data.title.trim(),
                ownerId: data.ownerId,
                content: '',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });

        await this.eventBus.publish(new DocumentCreatedEvent(document));

        return document;
    }

    private validateCreateInput(data: CreateDocumentInput): void {
        if (!data.title?.trim()) {
            throw new ValidationError('标题不能为空');
        }
    }
}

// 运行测试：仍然通过 ✓
```

### 3.3 TDD 最佳实践

1. **先写测试，再写代码** - 这是 TDD 的核心
2. **小步前进** - 每次只测试一个行为
3. **测试行为，而非实现** - 关注输入输出
4. **保持测试简单** - 复杂的测试难以维护
5. **快速反馈** - 测试应该快速运行

---

## 4. Mock 策略

### 4.1 前端 Mock

```typescript
// Mock API 响应
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
    rest.get('/api/documents', (req, res, ctx) => {
        return res(
            ctx.json({
                data: [
                    { id: '1', title: '文档1' },
                    { id: '2', title: '文档2' },
                ],
            })
        );
    })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### 4.2 后端 Mock

```typescript
// Mock Prisma
const mockPrisma = {
    document: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
};

// 使用
beforeEach(() => {
    jest.clearAllMocks();
});

it('应该调用 findMany', async () => {
    mockPrisma.document.findMany.mockResolvedValue([]);

    const result = await service.findAll();

    expect(mockPrisma.document.findMany).toHaveBeenCalled();
    expect(result).toEqual([]);
});
```

---

## 5. 测试工具

### 5.1 前端测试工具

| 工具                  | 用途     |
| --------------------- | -------- |
| Jest                  | 测试框架 |
| React Testing Library | 组件测试 |
| MSW                   | API Mock |
| Playwright            | E2E 测试 |

### 5.2 后端测试工具

| 工具           | 用途      |
| -------------- | --------- |
| Jest           | 测试框架  |
| Supertest      | HTTP 测试 |
| NestJS Testing | 模块测试  |

### 5.3 测试命令

```bash
# 前端
pnpm test              # 运行所有测试
pnpm test:watch        # 监听模式
pnpm test:coverage     # 覆盖率报告

# 后端
pnpm test              # 单元测试
pnpm test:e2e          # E2E 测试
pnpm test:cov          # 覆盖率报告

# E2E
pnpm test:e2e          # 运行 E2E 测试
pnpm test:e2e:ui       # Playwright UI 模式
```

---

## 6. 持续集成

### 6.1 CI 配置

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
    test:
        runs-on: ubuntu-latest

        services:
            postgres:
                image: postgres:17
                env:
                    POSTGRES_PASSWORD: postgres
                options: >-
                    --health-cmd pg_isready
                    --health-interval 10s

        steps:
            - uses: actions/checkout@v4

            - uses: pnpm/action-setup@v2
              with:
                  version: 10

            - uses: actions/setup-node@v4
              with:
                  node-version: 22
                  cache: 'pnpm'

            - run: pnpm install

            - name: Lint
              run: pnpm lint

            - name: Type Check
              run: pnpm type-check

            - name: Unit Tests
              run: pnpm test -- --coverage

            - name: Upload Coverage
              uses: codecov/codecov-action@v4
```

---

## 7. 相关文档

- [编码规范](./coding-standards.md)
- [安全最佳实践](../02-security/security-best-practices.md)
- [部署指南](../06-deployment/README.md)
