# 数据库配置

## 概述

本文档描述如何配置 Neon (PostgreSQL) 和 Upstash (Redis) 数据库。

## Neon (PostgreSQL)

### 创建数据库

1. 访问 [neon.tech](https://neon.tech)
2. 创建账户或登录
3. 创建新项目
4. 选择区域（建议选择离用户最近的）
5. 获取连接字符串

### 连接字符串

```
postgresql://[user]:[password]@[endpoint]/[database]?sslmode=require
```

示例：

```
postgresql://neondb_owner:abc123@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### Prisma 配置

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_DATABASE_URL")
}

// 对于 Neon，使用连接池 URL 和直连 URL
// DATABASE_URL: 连接池 URL（用于应用）
// DIRECT_DATABASE_URL: 直连 URL（用于迁移）
```

### 环境变量

```bash
# .env
# 连接池 URL（应用使用）
DATABASE_URL="postgresql://...?sslmode=require&pgbouncer=true"

# 直连 URL（迁移使用）
DIRECT_DATABASE_URL="postgresql://...?sslmode=require"
```

### 连接池配置

Neon 默认使用 PgBouncer 连接池：

```typescript
// 优化连接
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
    // 连接池设置
    __internal: {
        engine: {
            connection_limit: 10,
            pool_timeout: 30,
        },
    },
});
```

### 数据库迁移

```bash
# 本地开发
npx prisma migrate dev --name init

# 生产环境
npx prisma migrate deploy
```

### 分支功能

Neon 支持数据库分支，用于开发/测试：

```bash
# 通过 CLI 创建分支
neon branches create --name preview

# 获取分支连接字符串
neon connection-string preview
```

### 备份

```bash
# 导出
pg_dump $DATABASE_URL > backup.sql

# 导入
psql $DATABASE_URL < backup.sql
```

## Upstash (Redis)

### 创建数据库

1. 访问 [upstash.com](https://upstash.com)
2. 创建账户或登录
3. 创建 Redis 数据库
4. 选择区域
5. 获取连接信息

### 连接方式

#### REST API (推荐 Serverless)

```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// 使用
await redis.set('key', 'value');
const value = await redis.get('key');
```

#### 传统 Redis 客户端

```typescript
import { createClient } from 'redis';

const redis = createClient({
    url: process.env.REDIS_URL,
});

await redis.connect();
```

### 环境变量

```bash
# REST API
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# 传统连接
REDIS_URL=redis://default:xxx@xxx.upstash.io:6379
```

### NestJS 集成

```typescript
// src/redis/redis.service.ts
import { Injectable } from '@nestjs/common';
import { Redis } from '@upstash/redis';

@Injectable()
export class RedisService {
    private redis: Redis;

    constructor() {
        this.redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL!,
            token: process.env.UPSTASH_REDIS_REST_TOKEN!,
        });
    }

    async get(key: string): Promise<string | null> {
        return this.redis.get(key);
    }

    async set(key: string, value: string, ttl?: number): Promise<void> {
        if (ttl) {
            await this.redis.setex(key, ttl, value);
        } else {
            await this.redis.set(key, value);
        }
    }

    async del(key: string): Promise<void> {
        await this.redis.del(key);
    }

    async incr(key: string): Promise<number> {
        return this.redis.incr(key);
    }

    // Pub/Sub（需要使用传统客户端）
    async publish(channel: string, message: string): Promise<void> {
        // Upstash REST API 不支持 Pub/Sub
        // 需要使用传统 Redis 客户端
    }
}
```

### 使用场景

| 场景         | TTL          | 说明         |
| ------------ | ------------ | ------------ |
| Session 存储 | 7 天         | 用户登录状态 |
| Token 黑名单 | Token 有效期 | JWT 失效列表 |
| 速率限制     | 1-5 分钟     | API 限流     |
| 缓存         | 5-30 分钟    | 热点数据缓存 |
| 锁           | 30 秒        | 分布式锁     |

### 数据结构示例

```typescript
// 会话存储
await redis.setex(`session:${userId}`, 7 * 24 * 60 * 60, JSON.stringify(session));

// Token 黑名单
await redis.setex(`blacklist:${token}`, ttl, '1');

// 速率限制
const count = await redis.incr(`rate:${ip}:${endpoint}`);
if (count === 1) {
    await redis.expire(`rate:${ip}:${endpoint}`, 60);
}

// 分布式锁
const locked = await redis.set(`lock:${resource}`, '1', 'NX', 'EX', 30);
if (locked) {
    // 执行操作
    await redis.del(`lock:${resource}`);
}
```

## Supabase (备选)

如果需要更多功能（认证、存储），可以使用 Supabase：

### 创建项目

1. 访问 [supabase.com](https://supabase.com)
2. 创建新项目
3. 获取连接信息

### 连接字符串

```
postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
```

### Prisma 配置

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

### 认证集成

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

// 登录
const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
});
```

## 数据库监控

### Neon 监控

- Dashboard 显示连接数、查询数
- 自动计算使用量
- 预警配置

### Upstash 监控

- 实时命令统计
- 内存使用
- 连接数

### 告警配置

```yaml
# 设置告警阈值
- 内存使用 > 80%
- 连接数 > 80%
- 响应时间 > 100ms
```

## 最佳实践

### 连接管理

```typescript
// Prisma 单例
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
```

### 查询优化

```typescript
// 使用 select 减少返回字段
const user = await prisma.user.findUnique({
  where: { id },
  select: { id: true, name: true },
});

// 使用索引
// prisma/schema.prisma
model Document {
  @@index([ownerId])
  @@index([updatedAt])
}
```

### Redis 最佳实践

```typescript
// 批量操作
await redis.mset({ key1: 'value1', key2: 'value2' });

// 管道
const pipeline = redis.pipeline();
pipeline.set('key1', 'value1');
pipeline.set('key2', 'value2');
await pipeline.exec();
```

## 相关文档

- [Prisma 数据模型](../04-backend/prisma-schema.md)
- [环境变量配置](./environment.md)
- [监控与日志](./monitoring.md)
