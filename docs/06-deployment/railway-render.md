# Railway/Render 后端部署

## 概述

本文档描述如何将 NestJS + Hocuspocus 后端部署到 Railway 或 Render。

## Railway 部署

### 准备工作

```dockerfile
# Dockerfile
FROM node:22-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci --only=production

# 复制代码
COPY dist ./dist
COPY prisma ./prisma

# 生成 Prisma Client
RUN npx prisma generate

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

### railway.toml

```toml
[build]
builder = "heroku/buildpacks:20"

[deploy]
startCommand = "npx prisma migrate deploy && node dist/main.js"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

### 部署步骤

```bash
# 1. 安装 CLI
npm i -g @railway/cli

# 2. 登录
railway login

# 3. 初始化项目
railway init

# 4. 添加数据库
railway add --plugin postgresql
railway add --plugin redis

# 5. 设置环境变量
railway variables set JWT_SECRET=xxx
railway variables set DATABASE_URL=${{Postgres.DATABASE_URL}}

# 6. 部署
railway up

# 7. 查看日志
railway logs
```

### 环境变量

```bash
# Railway Dashboard > Variables
NODE_ENV=production
PORT=3000
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
JWT_SECRET=your-secret-key
HOCUSPOCUS_PORT=1234
```

### 自定义域名

1. 进入项目设置 > Domains
2. 添加自定义域名
3. 配置 DNS CNAME 记录

```
类型: CNAME
名称: api
内容: <project>.railway.app
```

## Render 部署

### render.yaml

```yaml
services:
  - type: web
    name: collab-editor-api
    env: node
    region: oregon
    plan: free
    buildCommand: npm ci && npm run build && npx prisma generate
    startCommand: npx prisma migrate deploy && node dist/main.js
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: collab-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          name: collab-redis
          type: redis
          property: connectionString

databases:
  - name: collab-db
    databaseName: collab
    user: collab

  - name: collab-redis
    type: redis
    plan: free
    maxmemoryPolicy: allkeys-lru
```

### 部署步骤

1. **连接 GitHub**
   - 访问 [render.com](https://render.com)
   - 连接 GitHub 账户
   - 选择仓库

2. **配置服务**
   - 选择 "Web Service"
   - 配置构建和启动命令
   - 添加环境变量

3. **部署**
   - 点击 "Create Web Service"
   - 等待构建完成

### 免费实例限制

| 限制 | 说明 |
|------|------|
| 内存 | 512MB |
| CPU | 0.1 vCPU |
| 休眠 | 15 分钟无请求后休眠 |
| 冷启动 | 休眠后首次请求约 30 秒 |

### 避免休眠

```yaml
# 使用 Cron Job 保持唤醒
services:
  - type: cron
    name: keep-alive
    env: node
    schedule: "*/10 * * * *"  # 每 10 分钟
    buildCommand: "echo 'No build needed'"
    startCommand: "curl https://your-app.onrender.com/health"
```

## WebSocket 配置

### Railway

Railway 原生支持 WebSocket，无需额外配置。

### Render

Render 也支持 WebSocket，但免费实例有休眠问题。

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // WebSocket 支持
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || '*',
    credentials: true,
  });

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
```

## Hocuspocus 配置

### 生产环境配置

```typescript
// src/hocuspocus/hocuspocus.config.ts
import { Server } from '@hocuspocus/server';

const server = Server.configure({
  port: parseInt(process.env.HOCUSPOCUS_PORT || '1234'),

  // 生产环境关闭调试
  quiet: process.env.NODE_ENV === 'production',

  extensions: [
    // Redis 扩展（水平扩展必需）
    new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    }),
  ],

  async onAuthenticate({ token }) {
    // JWT 验证
  },

  async onStoreDocument({ documentName, document }) {
    // 持久化
  },
});

server.listen();
```

### 环境变量

```bash
# WebSocket 端口
HOCUSPOCUS_PORT=1234

# Redis 配置
REDIS_HOST=<redis-host>
REDIS_PORT=6379
REDIS_PASSWORD=<password>

# 安全
HOCUSPOCUS_SECRET=<secret-key>
```

## 数据库迁移

### Railway

```bash
# 方式一：在 startCommand 中执行
startCommand = "npx prisma migrate deploy && node dist/main.js"

# 方式二：手动执行
railway run npx prisma migrate deploy
```

### Render

```yaml
# render.yaml
services:
  - type: web
    buildCommand: npm run build && npx prisma generate
    startCommand: npx prisma migrate deploy && node dist/main.js
```

## 健康检查

### 实现

```typescript
// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async ready() {
    // 检查数据库连接
    // 检查 Redis 连接
    return { status: 'ready' };
  }
}
```

### 配置

```yaml
# Railway
healthcheckPath = "/health"
healthcheckTimeout = 300

# Render
healthCheckPath: /health
```

## 日志

### 查看日志

```bash
# Railway
railway logs
railway logs --follow

# Render
# Dashboard > Logs 标签
```

### 结构化日志

```typescript
// src/common/logger/logger.service.ts
import { Injectable, LoggerService } from '@nestjs/common';

@Injectable()
export class CustomLogger implements LoggerService {
  log(message: string, context?: string) {
    console.log(JSON.stringify({
      level: 'info',
      message,
      context,
      timestamp: new Date().toISOString(),
    }));
  }

  error(message: string, trace?: string, context?: string) {
    console.error(JSON.stringify({
      level: 'error',
      message,
      trace,
      context,
      timestamp: new Date().toISOString(),
    }));
  }
}
```

## 故障排查

### 常见问题

1. **构建超时**
   ```yaml
   # 增加超时时间
   buildCommand: npm ci && npm run build
   ```

2. **内存不足**
   ```bash
   # Railway: 升级计划
   # Render: 使用 swap
   ```

3. **WebSocket 断开**
   - 检查超时配置
   - 确认客户端重连逻辑

4. **数据库连接失败**
   - 检查连接字符串
   - 确认 IP 白名单

### 调试

```bash
# Railway: 进入容器
railway run sh

# 查看进程
ps aux

# 查看内存
free -m
```

## 相关文档

- [平台概览](./platform-overview.md)
- [数据库配置](./database-setup.md)
- [环境变量配置](./environment.md)
