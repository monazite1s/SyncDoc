# 监控系统策略

## 文档概述

**文档版本**: 1.0  
**创建日期**: 2026-04-24  
**适用系统**: 协同文档编辑器  
**技术栈**: Next.js 15 + Tiptap + Yjs + Hocuspocus + NestJS + PostgreSQL + Redis

---

## 1. 错误追踪 (Error Tracking)

### 1.1 Sentry 集成架构

#### 前端配置 (@sentry/nextjs)

```typescript
// frontend/sentry.client.config.ts
Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV,
    sampleRate: 0.1,
    integrations: [
        new Sentry.BrowserTracing({
            routingInstrumentation: Sentry.reactRouterV6Instrumentation(React.useRouter),
        }),
        new Sentry.Replay(),
    ],
});
```

#### 后端配置 (@sentry/nestjs)

```typescript
// backend/src/main.ts
const app = await NestFactory.create(AppModule);
app.useGlobalFilters(new SentryFilter()); // 全局异常过滤器
```

### 1.2 错误监控范围

| 组件       | 监控方式                | 错误类型             | 优先级   |
| ---------- | ----------------------- | -------------------- | -------- |
| 前端编辑器 | Error Boundary          | JS错误、资源加载错误 | Critical |
| Tiptap事务 | Span包装                | 编辑器状态错误       | High     |
| Hocuspocus | Span包装                | WebSocket认证错误    | High     |
| API路由    | Global Exception Filter | 5xx错误              | Critical |
| 数据库     | Prisma中间件            | 查询失败             | High     |
| 版本控制   | Span包装                | 版本创建失败         | Medium   |

### 1.3 关键错误追踪点

```typescript
// frontend/components/editor/editor-provider.tsx
const EditorProvider = () => {
  return (
    <ErrorBoundary
      fallback={<EditorErrorFallback />}
      onError={(error) => Sentry.captureException(error)}
    >
      <TiptapEditor
        onUpdate={(transaction) => {
          transaction.setTag('component', 'Tiptap');
        }}
      />
    </ErrorBoundary>
  );
};

// backend/src/modules/collaboration/collaboration.hocuspocus.ts
new HocuspocusProvider({
  server: {
    onAuthenticate: async ({ token }) => {
      const span = Sentry.startSpan({ name: 'WebSocket Authentication' });
      try {
        // 认证逻辑
        span.setStatus('ok');
      } catch (error) {
        Sentry.captureException(error, {
          tags: { component: 'WebSocket Auth' }
        });
        throw error;
      } finally {
        span.finish();
      }
    }
  }
});
```

### 1.4 Source Maps 管理

- **上传**: Turborepo 构建完成后自动上传 Sentry
- **保留策略**: 保持最近的 3 个版本
- **映射**: 生产和开发环境分开管理

---

## 2. 性能指标 (Performance Metrics)

### 2.1 核心性能指标

| 指标名称      | 监测方法                             | 目标值       | 采集工具        |
| ------------- | ------------------------------------ | ------------ | --------------- |
| 文档打开时间  | EditorProvider mount → isSynced=true | <500ms       | Performance API |
| 按键到渲染    | Tiptap update 事件耗时               | <50ms        | Span计时        |
| 版本创建时间  | createSnapshot 调用耗时              | <200ms       | Span计时        |
| 差分计算      | diffVersions 耗时                    | <1s (1000行) | Span计时        |
| WebSocket延迟 | 客户端往返时间                       | <100ms       | Span计时        |
| DB查询时间    | Prisma中间件                         | <50ms p95    | 查询日志        |

### 2.2 性能监控实现

```typescript
// frontend/lib/performance/metrics.ts
export class PerformanceMetrics {
    private static startEditorMount = performance.now();

    static editorSynced() {
        const duration = performance.now() - this.startEditorMount;
        Sentry.addSpan({ name: 'Document Open Time' }).setMeasurement('duration', duration, 'ms');
    }

    static keystrokeToRender(duration: number) {
        Sentry.addSpan({ name: 'Keystroke to Render' }).setMeasurement('duration', duration, 'ms');
    }
}

// backend/src/prisma/performance.middleware.ts
export const PerformanceMiddleware = async (
    params: Prisma.MiddlewareParams,
    next: (params: Prisma.MiddlewareParams) => Promise<any>
) => {
    const start = Date.now();
    const result = await next(params);
    const duration = Date.now() - start;

    if (duration > 100) {
        Sentry.addSpan({ name: 'Slow Query' })
            .setMeasurement('duration', duration, 'ms')
            .setTag('model', params.model);
    }

    return result;
};
```

### 2.3 性能目标监控

| 指标          | 当前状态 | 目标   | 阈值   | SLA   |
| ------------- | -------- | ------ | ------ | ----- |
| 文档打开时间  | 待测量   | <500ms | >800ms | 99.9% |
| 按键到渲染    | 待测量   | <50ms  | >100ms | 99.5% |
| 版本创建      | 待测量   | <200ms | >500ms | 99%   |
| 差分计算      | 待测量   | <1s    | >2s    | 95%   |
| WebSocket延迟 | 待测量   | <100ms | >200ms | 99.9% |
| DB查询p95     | 待测量   | <50ms  | >100ms | 99.9% |

---

## 3. 协同健康 (Collaboration Health)

### 3.1 WebSocket 连接监控

| 指标           | 监控方式                     | 健康阈值      | 告警阈值      |
| -------------- | ---------------------------- | ------------- | ------------- |
| 活跃连接数     | Hocuspocus connectionsCount  | <300/instance | >500/instance |
| 每文档编辑者数 | 自定义计数器                 | <30/文档      | >50/文档      |
| 重连率         | 重连计数器/小时              | <5%/hour      | >10%/hour     |
| 存储失败率     | Hocuspocus persistenceErrors | <0.5%         | >1%           |

### 3.2 健康端点实现

```typescript
// backend/src/modules/health/health.controller.ts
@Controller('/api/health')
export class HealthController {
    @Get('/collaboration')
    async getCollaborationHealth() {
        const connections = hocuspocus.getConnectionsCount();
        const persistenceErrors = hocuspocus.getPersistenceErrors();

        return {
            status: 'healthy',
            connections,
            maxConnections: 500,
            errorRate: persistenceErrors / connections,
            documentsEditing: this.getDocumentEditingStats(),
        };
    }
}
```

### 3.3 协同健康仪表盘

| 状态 | 颜色 | 说明              |
| ---- | ---- | ----------------- |
| 优秀 | 绿色 | 所有指标正常      |
| 警告 | 黄色 | 1-2个指标接近阈值 |
| 危险 | 红色 | 多个指标超出阈值  |
| 离线 | 灰色 | 服务不可用        |

---

## 4. 用户活动分析 (User Activity Analytics)

### 4.1 隐私优先分析策略

#### 数据收集原则

- **聚合数据**: 只收集汇总统计数据，不追踪个体
- **匿名化**: 所有用户ID进行哈希处理
- **本地化**: 首选Redis HyperLogLog，而非数据库查询
- **透明**: 在隐私政策中明确说明数据使用

#### 避免的数据

- 个人身份信息
- 具体编辑内容
- 精确地理位置
- IP地址（除非用于安全分析）

### 4.2 核心活动指标

| 指标类别 | 指标名称         | 计算方法            | 采样率 |
| -------- | ---------------- | ------------------- | ------ |
| 用户参与 | DAU (日活跃用户) | HyperLogLog daily   | 实时   |
| 用户参与 | MAU (月活跃用户) | HyperLogLog monthly | 实时   |
| 文档行为 | 日创建文档数     | Redis计数器         | 实时   |
| 会话行为 | 平均会话时长     | Redis计时器         | 1%     |
| 编辑行为 | 工具栏点击       | 匿名计数器          | 0.1%   |
| 版本行为 | 版本操作频率     | 数据库汇总          | 1%     |

### 4.3 Redis HyperLogLog 实现

```typescript
// backend/src/modules/analytics/analytics.service.ts
export class AnalyticsService {
    private dau = new Redis.Command('pfadd', ['dau:' + new Date().toISOString().split('T')[0]]);
    private mau = new Redis.Command('pfadd', ['mau:' + new Date().toISOString().slice(0, 7)]);

    async trackUserActivity(userId: string) {
        // 匿名化用户ID
        const anonId = crypto.createHash('sha256').update(userId).digest('hex');

        await this.dau.execute(anonId);
        await this.mau.execute(anonId);
    }

    async getDAU(): Promise<number> {
        const key = 'dau:' + new Date().toISOString().split('T')[0];
        return await this.redis.sendCommand(['pfcount', key]);
    }
}
```

### 4.4 工具使用分析

```typescript
// frontend/components/editor/toolbar.tsx
export const Toolbar = () => {
  const trackFormatting = (format: string) => {
    // 0.1% 采样率
    if (Math.random() < 0.001) {
      analytics.track('formatting_used', {
        type: format,
        anonymous: true
      });
    }
  };

  return (
    <Toolbar>
      <BoldButton onClick={() => trackFormatting('bold')} />
      <ItalicButton onClick={() => trackFormatting('italic')} />
      {/* ... */}
    </Toolbar>
  );
};
```

---

## 5. 技术实施

### 5.1 监控架构图

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   Next.js       │    │   NestJS        │    │   PostgreSQL    │
│   - Sentry      │◄──►│   - Sentry      │◄──►│   - Query Log   │
│   - Perf API    │    │   - Health Endp │    │   - Metrics     │
│   - Analytics   │    │   - Redis       │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Monitoring    │
                    │   Dashboard     │
                    │   - Grafana     │
                    │   - Prometheus │
                    └─────────────────┘
```

### 5.2 部署配置

#### 环境变量

```env
# Sentry 配置
SENTRY_DSN=https://your-dsn@sentry.io/project-id
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id

# 监控配置
MONITORING_ENABLED=true
ANALYTICS_SAMPLE_RATE=0.01
HEALTH_CHECK_INTERVAL=30000
```

#### Docker 配置

```dockerfile
# backend/Dockerfile
RUN npm install @sentry/nestjs @sentry/node

# 启动健康检查
HEALTHCHECK --interval=30s \
  CMD curl -f http://localhost:3001/api/health/collaboration || exit 1
```

### 5.3 告警规则

| 指标          | 条件            | 级别     | 通知方式          |
| ------------- | --------------- | -------- | ----------------- |
| 5xx错误       | >5%请求失败     | Critical | PagerDuty + Slack |
| WebSocket延迟 | >200ms持续5分钟 | Warning  | Slack             |
| 文档打开时间  | >1秒持续10分钟  | Warning  | Slack             |
| 数据库查询    | >1秒p95         | Warning  | Slack             |
| 存储失败率    | >1%             | Critical | PagerDuty         |

---

## 6. 持续优化

### 6.1 数据驱动改进

1. **月度回顾**
    - 错误趋势分析
    - 性能瓶颈识别
    - 用户行为洞察

2. **季度优化**
    - 告警阈值调整
    - 监控范围扩展
    - 工具链升级

### 6.2 监控最佳实践

- **最少信息**: 只监控必要的指标，避免数据过载
- **主动监控**: 设置合理的告警阈值，避免被动响应
- **用户视角**: 从最终用户体验出发设计监控指标
- **团队协作**: 开发、运维、产品团队共同审视监控数据

---

## 附录

### A. 依赖包清单

```json
{
    "dependencies": {
        "@sentry/nextjs": "^7.x",
        "@sentry/nestjs": "^7.x",
        "@sentry/browser": "^7.x",
        "@sentry/tracing": "^7.x",
        "@sentry/replay": "^7.x"
    }
}
```

### B. 监控仪表盘

使用 Grafana 创建统一监控仪表盘，包含：

- 实时错误率
- 性能指标趋势
- 协同健康状态
- 用户活跃度

### C. 数据保留策略

| 数据类型 | 保留期 | 存储位置         | 访问控制 |
| -------- | ------ | ---------------- | -------- |
| 错误日志 | 90天   | Sentry           | 开发团队 |
| 性能数据 | 30天   | InfluxDB         | 运维团队 |
| 分析数据 | 365天  | Redis + Postgres | 数据团队 |
