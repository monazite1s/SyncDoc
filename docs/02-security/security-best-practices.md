# 安全最佳实践

## 概述

本文档汇总协同文档编辑系统的安全最佳实践，涵盖开发、部署和运维各阶段。

## 开发阶段安全

### 1. 代码安全

#### 依赖安全

```bash
# 定期检查依赖漏洞
pnpm audit

# 自动修复
pnpm audit --fix

# 使用 npm audit in CI
# .github/workflows/security.yml
name: Security Audit
on: [push, pull_request]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm audit --audit-level=moderate
```

#### TypeScript 严格模式

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

#### 避免 eval 和动态代码执行

```typescript
// ❌ 危险
eval(userInput);
new Function(userInput);

// ✅ 安全
// 使用 JSON.parse 处理 JSON 数据
const data = JSON.parse(jsonString);

// 使用正则表达式验证格式
if (/^[a-zA-Z0-9]+$/.test(userInput)) {
  // 处理
}
```

### 2. 输入验证

#### 使用 Zod 进行验证

```typescript
import { z } from 'zod';

// 文档 ID 验证
const documentIdSchema = z.string().cuid();

// 用户输入验证
const createDocumentSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title too long')
    .trim(),
  content: z.string().max(1000000).optional(), // 限制大小
});

// 版本消息验证
const versionMessageSchema = z
  .string()
  .max(500)
  .refine(
    (val) => !/<script|javascript:|on\w+=/i.test(val),
    'Invalid characters in message'
  );
```

#### SQL 注入防护

```typescript
// ✅ Prisma 自动参数化
const user = await prisma.user.findFirst({
  where: {
    email: userInput, // 自动转义
  },
});

// ✅ 原始查询使用参数化
const result = await prisma.$queryRaw`
  SELECT * FROM users WHERE email = ${userInput}
`;

// ❌ 危险：字符串拼接
// const query = `SELECT * FROM users WHERE email = '${userInput}'`;
```

### 3. XSS 防护

#### React 自动转义

```tsx
// ✅ React 自动转义
<div>{userContent}</div>

// ❌ 危险：dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// 如果必须使用，先清理
import DOMPurify from 'dompurify';

<div
  dangerouslySetInnerHTML={{
    __html: DOMPurify.sanitize(userContent, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
      ALLOWED_ATTR: ['href'],
    }),
  }}
/>
```

#### Content Security Policy

```typescript
// helmet CSP 配置
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", 'wss://your-domain.com'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
    },
  })
);
```

### 4. CSRF 防护

```typescript
// 使用 SameSite Cookie
app.use(
  session({
    cookie: {
      sameSite: 'strict', // 或 'lax'
      secure: true, // HTTPS only
      httpOnly: true,
    },
  })
);

// 或使用 CSRF Token
import csurf from 'csurf';

app.use(csurf({ cookie: true }));

// 在响应中返回 token
@app.Get('csrf-token')
getCsrfToken(@Req() req: Request) {
  return { csrfToken: req.csrfToken() };
}
```

## API 安全

### 1. 认证与授权

```typescript
// 所有敏感端点都需要认证
@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  // 权限检查
  @Get(':id')
  async getDocument(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    await this.accessControl.checkAccess(id, user.id, 'read');
    return this.documentsService.findById(id);
  }
}
```

### 2. 速率限制

```typescript
// 不同端点不同限制
const rateLimits = {
  login: { limit: 5, window: 300 },      // 5次/5分钟
  api: { limit: 100, window: 60 },        // 100次/分钟
  websocket: { limit: 1000, window: 60 }, // 1000次/分钟
};

// Redis 实现
async function checkRateLimit(
  key: string,
  limit: number,
  window: number,
): Promise<boolean> {
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, window);
  }
  return current <= limit;
}
```

### 3. 请求大小限制

```typescript
// 限制请求体大小
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 文件上传限制
@Post('upload')
@UseInterceptors(
  FileInterceptor('file', {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 1,
    },
    fileFilter: (req, file, cb) => {
      // 白名单检查
      const allowedMimes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedMimes.includes(file.mimetype)) {
        return cb(new BadRequestException('Invalid file type'), false);
      }
      cb(null, true);
    },
  }),
)
```

### 4. 错误处理

```typescript
// 不要暴露敏感错误信息
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // 在生产环境中隐藏详细错误
      if (process.env.NODE_ENV === 'production') {
        message = exception.message;
      } else {
        message = exceptionResponse;
      }
    }

    // 记录错误但不暴露给用户
    console.error(exception);

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

## WebSocket 安全

### 1. 连接认证

```typescript
// Hocuspocus 认证钩子
const server = Server.configure({
  async onAuthenticate({ token, documentName, request }) {
    // 验证 token
    const user = await verifyToken(token);
    if (!user) {
      throw new Error('Unauthorized');
    }

    // 检查权限
    const hasAccess = await checkDocumentAccess(documentName, user.id);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    return { user };
  },
});
```

### 2. 消息验证

```typescript
// 验证 WebSocket 消息
async onMessage({ documentName, context, update }) {
  // 检查消息大小
  if (update.length > 1024 * 1024) { // 1MB
    throw new Error('Message too large');
  }

  // 检查写权限
  if (context.role === 'VIEWER') {
    throw new Error('Read-only access');
  }

  // 验证 Yjs update 格式
  try {
    applyUpdate(ydoc, update);
  } catch (error) {
    throw new Error('Invalid update format');
  }
}
```

### 3. 连接限制

```typescript
// 限制每用户连接数
const connectionLimiter = new Map<string, number>();
const MAX_CONNECTIONS_PER_USER = 5;

async onConnect({ context, documentName }) {
  const userId = context.user.id;
  const current = connectionLimiter.get(userId) || 0;

  if (current >= MAX_CONNECTIONS_PER_USER) {
    throw new Error('Too many connections');
  }

  connectionLimiter.set(userId, current + 1);
}

async onDisconnect({ context }) {
  const userId = context.user.id;
  const current = connectionLimiter.get(userId) || 1;
  connectionLimiter.set(userId, current - 1);
}
```

## 数据安全

### 1. 数据最小化

```typescript
// 只返回必要的数据
@Get('documents')
async getDocuments(@CurrentUser() user: User) {
  return this.prisma.document.findMany({
    where: { ownerId: user.id },
    select: {
      id: true,
      title: true,
      updatedAt: true,
      // 不返回 content
    },
  });
}
```

### 2. 敏感数据处理

```typescript
// 日志中不记录敏感信息
function sanitizeForLogging(data: any): any {
  const sanitized = { ...data };
  const sensitiveFields = ['password', 'token', 'secret', 'creditCard'];

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

// 使用
logger.info('User login', sanitizeForLogging({ email, password }));
```

### 3. 数据备份加密

```bash
# 备份时加密
pg_dump $DATABASE_URL | gzip | openssl enc -aes-256-cbc -salt -out backup.sql.gz.enc

# 恢复时解密
openssl enc -aes-256-cbc -d -in backup.sql.gz.enc | gunzip | psql $DATABASE_URL
```

## 部署安全

### 1. 环境隔离

```bash
# 不同环境使用不同配置
.env.development
.env.staging
.env.production

# 生产环境强制检查
if [ "$NODE_ENV" = "production" ]; then
  # 检查必要的环境变量
  required_vars=("DATABASE_URL" "JWT_SECRET" "REDIS_URL")
  for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
      echo "Error: $var is required in production"
      exit 1
    fi
  done
fi
```

### 2. 容器安全

```dockerfile
# Dockerfile 安全实践
FROM node:22-alpine

# 非 root 用户
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

WORKDIR /app

# 只复制必要文件
COPY --chown=appuser:appgroup package*.json ./
COPY --chown=appuser:appgroup dist ./dist

# 不复制敏感文件
# .env, *.pem 等通过挂载或 secrets 注入

USER appuser

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

### 3. 密钥管理

```yaml
# GitHub Actions Secrets
# 不要在代码中存储密钥
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  JWT_SECRET: ${{ secrets.JWT_SECRET }}

# Kubernetes Secrets
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
stringData:
  DATABASE_URL: "postgresql://..."
  JWT_SECRET: "..."
```

## 监控与审计

### 1. 安全日志

```typescript
// 记录安全相关事件
const securityEvents = [
  'login.success',
  'login.failure',
  'logout',
  'password.change',
  'role.change',
  'document.access.denied',
  'rate.limit.exceeded',
];

async function logSecurityEvent(
  event: string,
  userId: string,
  metadata: Record<string, any>,
) {
  await prisma.securityLog.create({
    data: {
      event,
      userId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      details: metadata,
    },
  });
}
```

### 2. 异常检测

```typescript
// 检测异常行为
async function detectAnomalousActivity(userId: string): Promise<boolean> {
  const recentFailures = await redis.get(`login-failures:${userId}`);

  // 5 分钟内超过 10 次失败
  if (parseInt(recentFailures || '0') > 10) {
    // 触发安全警报
    await alertSecurityTeam(userId);
    return true;
  }

  return false;
}
```

### 3. 定期审计

```typescript
// 定期检查任务
@Cron('0 2 * * *') // 每天凌晨 2 点
async runSecurityAudit() {
  // 检查过期会话
  await this.cleanExpiredSessions();

  // 检查异常权限
  await this.auditPermissions();

  // 检查依赖漏洞
  await this.checkDependencyVulnerabilities();
}
```

## 安全检查清单

### 开发阶段

- [ ] 所有用户输入经过验证
- [ ] 使用参数化查询
- [ ] 敏感数据不记录在日志中
- [ ] 使用 HTTPS/WSS
- [ ] 实现速率限制
- [ ] 错误消息不暴露系统信息

### 部署阶段

- [ ] 环境变量正确配置
- [ ] TLS 证书有效
- [ ] 安全响应头配置
- [ ] 依赖无已知漏洞
- [ ] 容器以非 root 运行

### 运维阶段

- [ ] 监控安全事件
- [ ] 定期更新依赖
- [ ] 定期审计权限
- [ ] 备份加密存储
- [ ] 有事件响应计划

## 相关文档

- [JWT 认证机制](./authentication.md)
- [权限控制](./authorization.md)
- [数据加密策略](./data-encryption.md)
- [监控与日志](../06-deployment/monitoring.md)
