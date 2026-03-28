# 环境变量配置

## 概述

本文档描述各环境的环境变量配置规范。

## 环境分类

| 环境 | 用途       | 配置文件        |
| ---- | ---------- | --------------- |
| 开发 | 本地开发   | `.env.local`    |
| 测试 | CI/CD 测试 | `.env.test`     |
| 预览 | PR 预览    | Vercel 预览环境 |
| 生产 | 正式环境   | 平台 Secrets    |

## 前端环境变量

### 变量列表

```bash
# .env.example (前端)

# API 配置
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=ws://localhost:1234

# 应用配置
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Collab Editor

# 功能开关
NEXT_PUBLIC_ENABLE_OFFLINE=true
NEXT_PUBLIC_ENABLE_VERSIONS=true

# 分析（可选）
NEXT_PUBLIC_GA_ID=
```

### 使用方式

```typescript
// 访问环境变量
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// 类型定义
// types/env.d.ts
namespace NodeJS {
    interface ProcessEnv {
        NEXT_PUBLIC_API_URL: string;
        NEXT_PUBLIC_WS_URL: string;
        NEXT_PUBLIC_APP_URL: string;
    }
}
```

### 验证

```typescript
// lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
    NEXT_PUBLIC_API_URL: z.string().url(),
    NEXT_PUBLIC_WS_URL: z.string(),
    NEXT_PUBLIC_APP_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
```

## 后端环境变量

### 变量列表

```bash
# .env.example (后端)

# 应用
NODE_ENV=development
PORT=3001

# 数据库
DATABASE_URL="postgresql://user:pass@localhost:5432/collab?schema=public"
DIRECT_DATABASE_URL="postgresql://user:pass@localhost:5432/collab?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"
UPSTASH_REDIS_REST_URL="https://xxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="xxx"

# JWT
JWT_SECRET="your-256-bit-secret-key-here"
JWT_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="7d"

# Hocuspocus
HOCUSPOCUS_PORT=1234
HOCUSPOCUS_SECRET="another-secret-key"

# CORS
CORS_ORIGINS="http://localhost:3000,http://localhost:3001"

# OAuth (可选)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
```

### 验证

```typescript
// src/config/config.validation.ts
import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
    NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),

    PORT: Joi.number().default(3001),

    DATABASE_URL: Joi.string().required(),
    DIRECT_DATABASE_URL: Joi.string().required(),

    REDIS_URL: Joi.string().required(),

    JWT_SECRET: Joi.string().min(32).required(),
    JWT_EXPIRES_IN: Joi.string().default('15m'),
    REFRESH_TOKEN_EXPIRES_IN: Joi.string().default('7d'),

    HOCUSPOCUS_PORT: Joi.number().default(1234),
    HOCUSPOCUS_SECRET: Joi.string().min(32).required(),

    CORS_ORIGINS: Joi.string().default('*'),
});
```

### 配置模块

```typescript
// src/config/configuration.ts
export default () => ({
    node: {
        env: process.env.NODE_ENV || 'development',
        port: parseInt(process.env.PORT, 10) || 3001,
    },

    database: {
        url: process.env.DATABASE_URL,
        directUrl: process.env.DIRECT_DATABASE_URL,
    },

    redis: {
        url: process.env.REDIS_URL,
        upstashUrl: process.env.UPSTASH_REDIS_REST_URL,
        upstashToken: process.env.UPSTASH_REDIS_REST_TOKEN,
    },

    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
    },

    hocuspocus: {
        port: parseInt(process.env.HOCUSPOCUS_PORT, 10) || 1234,
        secret: process.env.HOCUSPOCUS_SECRET,
    },

    cors: {
        origins: process.env.CORS_ORIGINS?.split(',') || ['*'],
    },
});
```

## 平台配置

### Vercel

```bash
# 通过 CLI
vercel env add NEXT_PUBLIC_API_URL production
vercel env add NEXT_PUBLIC_WS_URL production

# 或在 Dashboard 配置
# Settings > Environment Variables
```

### Railway

```bash
# 通过 CLI
railway variables set JWT_SECRET=xxx
railway variables set DATABASE_URL=${{Postgres.DATABASE_URL}}

# 或在 Dashboard 配置
# Variables 标签页
```

### Render

```yaml
# render.yaml
envVars:
    - key: DATABASE_URL
      fromDatabase:
          name: collab-db
          property: connectionString
    - key: JWT_SECRET
      sync: false
```

## 密钥管理

### 生成安全密钥

```bash
# 生成 256 位随机密钥
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 生成 UUID
node -e "console.log(require('crypto').randomUUID())"
```

### .gitignore

```gitignore
# 环境变量
.env
.env.local
.env.*.local

# 密钥文件
*.pem
*.key
secrets/
```

### 密钥轮换

建议定期轮换以下密钥：

- JWT_SECRET（需要用户重新登录）
- HOCUSPOCUS_SECRET（需要断开所有 WebSocket 连接）
- 数据库密码（需要更新所有服务）

## 开发环境设置

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/xxx/collab-editor.git
cd collab-editor

# 前端
cd frontend
cp .env.example .env.local
# 编辑 .env.local

# 后端
cd ../backend
cp .env.example .env
# 编辑 .env

# 启动服务
docker-compose up -d  # PostgreSQL + Redis
pnpm dev              # 后端
pnpm dev              # 前端
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
    postgres:
        image: postgres:17
        environment:
            POSTGRES_USER: collab
            POSTGRES_PASSWORD: collab
            POSTGRES_DB: collab
        ports:
            - '5432:5432'
        volumes:
            - postgres_data:/var/lib/postgresql/data

    redis:
        image: redis:8
        ports:
            - '6379:6379'
        volumes:
            - redis_data:/data

volumes:
    postgres_data:
    redis_data:
```

## 相关文档

- [Vercel 前端部署](./vercel-deploy.md)
- [数据库配置](./database-setup.md)
- [安全最佳实践](../02-security/security-best-practices.md)
