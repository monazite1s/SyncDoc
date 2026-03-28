# 监控与日志

## 概述

本文档描述系统的监控和日志策略，确保生产环境的可观测性。

## 监控架构

```
┌─────────────────────────────────────────────────────────────────┐
│                      监控架构                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   前端      │    │   后端      │    │  数据库     │        │
│  │  Vercel     │    │  Railway    │    │   Neon      │        │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘        │
│         │                  │                  │                 │
│         └──────────────────┼──────────────────┘                 │
│                            │                                    │
│                            ▼                                    │
│                   ┌─────────────────┐                          │
│                   │   日志聚合      │                          │
│                   │   告警系统      │                          │
│                   └─────────────────┘                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 平台监控

### Vercel Analytics

```bash
pnpm add @vercel/analytics @vercel/speed-insights
```

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

### Railway/Render 监控

- **内置仪表板**：CPU、内存、网络
- **日志流**：实时日志查看
- **告警**：资源使用告警

### Neon 监控

- 连接数
- 查询性能
- 存储使用

### Upstash 监控

- 命令统计
- 内存使用
- 连接数

## 应用监控

### 错误追踪 (Sentry)

```bash
pnpm add @sentry/nextjs @sentry/nestjs
```

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV,
});
```

```typescript
// 后端 main.ts
import * as Sentry from '@sentry/nestjs';

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
});
```

### 性能监控

```typescript
// lib/monitoring/performance.ts
export function measurePerformance(name: string) {
    const start = performance.now();

    return {
        end: () => {
            const duration = performance.now() - start;

            if (duration > 1000) {
                // 上报慢操作
                reportSlowOperation(name, duration);
            }

            return duration;
        },
    };
}

// 使用
const measure = measurePerformance('document-load');
await loadDocument(id);
const duration = measure.end();
```

### 健康检查

```typescript
// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import {
    HealthCheck,
    HealthCheckService,
    TypeOrmHealthIndicator,
    MemoryHealthIndicator,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
    constructor(
        private health: HealthCheckService,
        private db: TypeOrmHealthIndicator,
        private memory: MemoryHealthIndicator
    ) {}

    @Get()
    @HealthCheck()
    check() {
        return this.health.check([
            () => this.db.pingCheck('database'),
            () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
        ]);
    }

    @Get('ready')
    ready() {
        return { status: 'ok' };
    }

    @Get('live')
    live() {
        return { status: 'ok' };
    }
}
```

## 日志系统

### 结构化日志

```typescript
// src/common/logger/logger.service.ts
import { Injectable, LoggerService } from '@nestjs/common';

interface LogEntry {
    level: string;
    message: string;
    timestamp: string;
    context?: string;
    trace?: string;
    meta?: Record<string, unknown>;
}

@Injectable()
export class StructuredLogger implements LoggerService {
    private formatMessage(entry: LogEntry): string {
        return JSON.stringify(entry);
    }

    log(message: string, context?: string, meta?: Record<string, unknown>) {
        console.log(
            this.formatMessage({
                level: 'info',
                message,
                timestamp: new Date().toISOString(),
                context,
                meta,
            })
        );
    }

    error(message: string, trace?: string, context?: string) {
        console.error(
            this.formatMessage({
                level: 'error',
                message,
                timestamp: new Date().toISOString(),
                context,
                trace,
            })
        );
    }

    warn(message: string, context?: string) {
        console.warn(
            this.formatMessage({
                level: 'warn',
                message,
                timestamp: new Date().toISOString(),
                context,
            })
        );
    }

    debug(message: string, context?: string) {
        if (process.env.NODE_ENV === 'development') {
            console.debug(
                this.formatMessage({
                    level: 'debug',
                    message,
                    timestamp: new Date().toISOString(),
                    context,
                })
            );
        }
    }
}
```

### 请求日志

```typescript
// src/common/interceptors/logging.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const { method, url, ip } = request;
        const userAgent = request.headers['user-agent'];
        const now = Date.now();

        return next.handle().pipe(
            tap(() => {
                const response = context.switchToHttp().getResponse();
                const { statusCode } = response;
                const duration = Date.now() - now;

                console.log(
                    JSON.stringify({
                        level: 'info',
                        message: 'HTTP Request',
                        timestamp: new Date().toISOString(),
                        meta: {
                            method,
                            url,
                            statusCode,
                            duration,
                            ip,
                            userAgent,
                        },
                    })
                );
            })
        );
    }
}
```

### 审计日志

```typescript
// src/modules/audit/audit.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
    constructor(private prisma: PrismaService) {}

    async log(params: {
        action: string;
        userId?: string;
        documentId?: string;
        ipAddress?: string;
        userAgent?: string;
        details?: Record<string, unknown>;
    }) {
        return this.prisma.auditLog.create({
            data: {
                action: params.action,
                userId: params.userId,
                documentId: params.documentId,
                ipAddress: params.ipAddress,
                userAgent: params.userAgent,
                details: params.details || {},
            },
        });
    }

    async query(params: {
        userId?: string;
        documentId?: string;
        action?: string;
        startDate?: Date;
        endDate?: Date;
        page?: number;
        limit?: number;
    }) {
        const { page = 1, limit = 50 } = params;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (params.userId) where.userId = params.userId;
        if (params.documentId) where.documentId = params.documentId;
        if (params.action) where.action = params.action;
        if (params.startDate || params.endDate) {
            where.createdAt = {};
            if (params.startDate) where.createdAt.gte = params.startDate;
            if (params.endDate) where.createdAt.lte = params.endDate;
        }

        const [logs, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.auditLog.count({ where }),
        ]);

        return { logs, meta: { page, limit, total } };
    }
}
```

## 告警配置

### 告警规则

| 指标       | 阈值  | 严重级别 |
| ---------- | ----- | -------- |
| 错误率     | > 1%  | 高       |
| 响应时间   | > 2s  | 中       |
| CPU 使用   | > 80% | 中       |
| 内存使用   | > 85% | 中       |
| 磁盘使用   | > 90% | 高       |
| 数据库连接 | > 80% | 中       |

### Slack 通知

```typescript
// lib/monitoring/alert.ts
import { WebClient } from '@slack/web-api';

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

export async function sendAlert(params: {
    level: 'info' | 'warning' | 'critical';
    title: string;
    message: string;
    meta?: Record<string, unknown>;
}) {
    const color = {
        info: '#36a64f',
        warning: '#ff9900',
        critical: '#ff0000',
    }[params.level];

    await slack.chat.postMessage({
        channel: process.env.SLACK_ALERT_CHANNEL!,
        attachments: [
            {
                color,
                title: params.title,
                text: params.message,
                fields: Object.entries(params.meta || {}).map(([key, value]) => ({
                    title: key,
                    value: String(value),
                    short: true,
                })),
                ts: String(Math.floor(Date.now() / 1000)),
            },
        ],
    });
}
```

## 仪表板

### Grafana (可选)

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
    prometheus:
        image: prom/prometheus
        ports:
            - '9090:9090'
        volumes:
            - ./prometheus.yml:/etc/prometheus/prometheus.yml

    grafana:
        image: grafana/grafana
        ports:
            - '3000:3000'
        environment:
            - GF_SECURITY_ADMIN_PASSWORD=admin
        volumes:
            - grafana_data:/var/lib/grafana

volumes:
    grafana_data:
```

### 关键指标

```
# 请求指标
- 请求总数
- 请求延迟 (P50, P95, P99)
- 错误率

# WebSocket 指标
- 活跃连接数
- 消息吞吐量
- 重连率

# 数据库指标
- 查询延迟
- 连接池使用
- 慢查询

# Redis 指标
- 命令延迟
- 内存使用
- 键空间
```

## 相关文档

- [环境变量配置](./environment.md)
- [安全最佳实践](../02-security/security-best-practices.md)
- [错误处理与边界](../03-frontend/error-handling.md)
