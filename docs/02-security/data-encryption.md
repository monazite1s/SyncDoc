# 数据加密策略

## 概述

本文档描述系统中各类数据的加密策略，包括传输加密、存储加密和敏感数据处理。

## 加密策略总览

| 数据类型       | 加密方式   | 位置   | 说明              |
| -------------- | ---------- | ------ | ----------------- |
| **传输数据**   | TLS 1.3    | 传输层 | 所有 HTTP/WS 流量 |
| **用户密码**   | bcrypt     | 数据库 | 单向哈希，cost=12 |
| **JWT Token**  | HS256      | 服务端 | 签名验证          |
| **敏感配置**   | 环境变量   | 运行时 | 不提交代码库      |
| **Yjs Binary** | 无额外加密 | 数据库 | 传输层已加密      |

## 传输层加密

### TLS 配置

```nginx
# Nginx TLS 配置
server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # TLS 1.3 only
    ssl_protocols TLSv1.3 TLSv1.2;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # 强制 HTTPS
    if ($scheme != "https") {
        return 301 https://$host$request_uri;
    }
}
```

### WebSocket 安全

```typescript
// 客户端：使用 WSS 协议
const wsProvider = new WebsocketProvider(
    'wss://collab.example.com', // 注意使用 wss://
    documentId,
    ydoc
);

// 服务端：Hocuspocus 配置
const server = Server.configure({
    // 生产环境启用 TLS
    tls: {
        key: fs.readFileSync('/path/to/key.pem'),
        cert: fs.readFileSync('/path/to/cert.pem'),
    },
});
```

## 密码哈希

### bcrypt 配置

```typescript
// auth/password.service.ts
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 12; // cost factor

export class PasswordService {
    async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, SALT_ROUNDS);
    }

    async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
        return bcrypt.compare(plainPassword, hashedPassword);
    }
}
```

### 密码强度验证

```typescript
// common/validators/password.validator.ts
import { z } from 'zod';

export const passwordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export function validatePassword(password: string): {
    valid: boolean;
    errors: string[];
} {
    const result = passwordSchema.safeParse(password);

    if (result.success) {
        return { valid: true, errors: [] };
    }

    return {
        valid: false,
        errors: result.error.errors.map((e) => e.message),
    };
}
```

## JWT 安全

### 密钥管理

```typescript
// config/jwt.config.ts
export default {
    secret: process.env.JWT_SECRET,
    signOptions: {
        expiresIn: '15m',
        algorithm: 'HS256',
    },
    refresh: {
        expiresIn: '7d',
    },
};

// 验证密钥强度
export function validateJwtSecret(secret: string): void {
    if (!secret) {
        throw new Error('JWT_SECRET is required');
    }

    if (secret.length < 32) {
        throw new Error('JWT_SECRET must be at least 32 characters');
    }

    // 检查是否是默认值
    const defaultSecrets = ['secret', 'your-secret-key', 'change-me'];
    if (defaultSecrets.includes(secret.toLowerCase())) {
        throw new Error('JWT_SECRET must not be a default value');
    }
}
```

### Token 黑名单

```typescript
// auth/token-blacklist.service.ts
import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class TokenBlacklistService {
    constructor(private redis: RedisService) {}

    async addToBlacklist(token: string, expiresAt: number): Promise<void> {
        const ttl = expiresAt - Math.floor(Date.now() / 1000);

        if (ttl > 0) {
            await this.redis.set(`blacklist:${token}`, '1', 'EX', ttl);
        }
    }

    async isBlacklisted(token: string): Promise<boolean> {
        return !!(await this.redis.get(`blacklist:${token}`));
    }
}
```

## 敏感配置管理

### 环境变量

```bash
# .env.example

# 数据库
DATABASE_URL="postgresql://user:password@host:5432/db?sslmode=require"

# Redis
REDIS_URL="redis://localhost:6379"
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

# JWT
JWT_SECRET="your-256-bit-secret-key-here"
JWT_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="7d"

# Hocuspocus
HOCUSPOCUS_SECRET="another-secret-key"

# OAuth (可选)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."
```

### 配置验证

```typescript
// config/config.validation.ts
import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
    NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),

    DATABASE_URL: Joi.string().required(),
    REDIS_URL: Joi.string().required(),

    JWT_SECRET: Joi.string().min(32).required(),
    JWT_EXPIRES_IN: Joi.string().default('15m'),
    REFRESH_TOKEN_EXPIRES_IN: Joi.string().default('7d'),

    HOCUSPOCUS_SECRET: Joi.string().min(32).required(),
});
```

### .gitignore 配置

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

## 数据库安全

### 连接加密

```bash
# PostgreSQL 连接字符串
DATABASE_URL="postgresql://user:password@host:5432/db?sslmode=require"
```

### Prisma 配置

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // 启用 SSL
  directUrl = env("DATABASE_URL")
}
```

### 敏感字段处理

```typescript
// 过滤敏感字段
interface UserResponse {
    id: string;
    email: string;
    name: string;
    createdAt: Date;
    // 注意：不包含 password
}

function sanitizeUser(user: any): UserResponse {
    const { password, ...safe } = user;
    return safe;
}

// Prisma 查询时排除敏感字段
const user = await prisma.user.findUnique({
    where: { id },
    select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        // 不选择 password
    },
});
```

## API 安全

### 速率限制

```typescript
// common/guards/rate-limit.guard.ts
import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class RateLimitGuard {
    constructor(private redis: RedisService) {}

    async checkLimit(
        key: string,
        limit: number,
        windowSeconds: number
    ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
        const current = await this.redis.incr(key);

        if (current === 1) {
            await this.redis.expire(key, windowSeconds);
        }

        const ttl = await this.redis.ttl(key);

        return {
            allowed: current <= limit,
            remaining: Math.max(0, limit - current),
            resetAt: Date.now() + ttl * 1000,
        };
    }
}

// 使用装饰器
@Injectable()
export class LoginRateLimitGuard {
    private readonly limit = 5; // 5 次尝试
    private readonly window = 300; // 5 分钟

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const ip = request.ip;
        const email = request.body.email;

        const key = `rate-limit:login:${ip}:${email}`;
        const result = await this.rateLimitGuard.checkLimit(key, this.limit, this.window);

        if (!result.allowed) {
            throw new TooManyRequestsException(
                `Too many login attempts. Try again in ${Math.ceil(result.resetAt / 1000)} seconds`
            );
        }

        return true;
    }
}
```

### 输入验证

```typescript
// common/pipes/validation.pipe.ts
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: any) {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: result.error.errors,
      });
    }

    return result.data;
  }
}

// 使用示例
const createDocumentSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().optional(),
});

@Post()
async create(
  @Body(new ZodValidationPipe(createDocumentSchema)) dto: CreateDocumentDto,
) {
  return this.documentsService.create(dto);
}
```

## 安全响应头

### Helmet 配置

```typescript
// main.ts
import helmet from '@nestjs/platform-express/helmet';

async function bootstrap() {
    const app = create(AppModule);

    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "'unsafe-inline'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", 'data:', 'https:'],
                    connectSrc: [
                        "'self'",
                        'wss://collab.example.com', // WebSocket
                    ],
                    fontSrc: ["'self'"],
                    objectSrc: ["'none'"],
                    upgradeInsecureRequests: [],
                },
            },
            crossOriginEmbedderPolicy: true,
            crossOriginOpenerPolicy: true,
            crossOriginResourcePolicy: { policy: 'same-origin' },
        })
    );

    await app.listen(3000);
}
```

### CORS 配置

```typescript
// main.ts
app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400, // 24 小时
});
```

## 相关文档

- [JWT 认证机制](./authentication.md)
- [安全最佳实践](./security-best-practices.md)
- [环境变量配置](../06-deployment/environment.md)
