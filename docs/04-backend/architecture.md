# 后端架构详细设计

## 概述

本文档详细描述协同文档编辑系统的后端架构设计，基于 **NestJS 11** 构建模块化 API 服务，集成 **Hocuspocus 3** 作为协同网关，使用 **Prisma 6** 进行数据访问，实现高性能、可扩展的实时协同后端。

---

## 目录

- [1. 架构总览](#1-架构总览)
- [2. 技术栈](#2-技术栈)
- [3. 目录结构](#3-目录结构)
- [4. 模块架构设计](#4-模块架构设计)
- [5. API 设计规范](#5-api-设计规范)
- [6. 数据模型设计](#6-数据模型设计)
- [7. Hocuspocus 网关设计](#7-hocuspocus-网关设计)
- [8. 认证授权设计](#8-认证授权设计)
- [9. 版本管理设计](#9-版本管理设计)
- [10. 缓存策略设计](#10-缓存策略设计)
- [11. 性能优化策略](#11-性能优化策略)
- [12. 安全设计](#12-安全设计)
- [13. 错误处理架构](#13-错误处理架构)

---

## 1. 架构总览

### 1.1 四层架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           后端应用架构                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        网关层 (Gateway)                          │   │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │   │
│  │  │   Hocuspocus  │  │    NestJS     │  │   WebSocket   │       │   │
│  │  │ (协同网关)    │  │   (HTTP API)  │  │   (实时通信)  │       │   │
│  │  └───────────────┘  └───────────────┘  └───────────────┘       │   │
│  │  职责：JWT 认证、房间管理、消息广播、文档同步                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        服务层 (Service)                          │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐   │   │
│  │  │AuthModule │  │ DocModule │  │ VerModule │  │CollabModule│   │   │
│  │  │           │  │           │  │           │  │           │   │   │
│  │  │AuthService│  │DocService │  │VerService │  │RoomService│   │   │
│  │  │JwtService │  │PermService│  │SnapService│  │AwareSvc   │   │   │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘   │   │
│  │  职责：业务逻辑、数据处理、权限校验                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        数据访问层 (Repository)                   │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐   │   │
│  │  │  Prisma   │  │   Redis   │  │  Yjs Doc  │  │  Storage  │   │   │
│  │  │  Client   │  │  Client   │  │  Manager  │  │  Service  │   │   │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘   │   │
│  │  职责：数据持久化、缓存、文档状态管理                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        基础设施层 (Infrastructure)               │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐   │   │
│  │  │PostgreSQL │  │   Redis   │  │   Logger  │  │  Monitor  │   │   │
│  │  │  (主存储) │  │ (缓存/Pub)│  │ (日志)    │  │ (监控)    │   │   │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘   │   │
│  │  职责：数据存储、消息队列、日志记录、性能监控                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 设计原则

| 原则 | 说明 | 实现 |
|------|------|------|
| **模块化** | 高内聚低耦合，模块边界清晰 | NestJS Module 系统 |
| **关注点分离** | 控制器、服务、数据访问分离 | MVC + Repository |
| **依赖注入** | 控制反转，便于测试和扩展 | NestJS DI 容器 |
| **事件驱动** | 异步处理，解耦业务逻辑 | EventEmitter + Redis Pub/Sub |
| **安全默认** | 所有 API 默认需认证 | 全局 JWT 守卫 |

### 1.3 请求处理流程

```
HTTP Request
     │
     ▼
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  CORS    │───▶│  Rate    │───▶│  JWT     │───▶│  Logger  │
│  Filter  │    │  Limit   │    │  Guard   │    │Interceptor│
└──────────┘    └──────────┘    └──────────┘    └──────────┘
     │                                               │
     │                                               ▼
     │                                        ┌──────────┐
     │                                        │  Route   │
     │                                        │  Handler │
     │                                        └────┬─────┘
     │                                             │
     ▼                                             ▼
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Exception│◀───│Transform │◀───│ Service  │◀───│  Pipe    │
│  Filter  │    │Interceptor│   │  Layer   │    │Validation│
└──────────┘    └──────────┘    └──────────┘    └──────────┘
     │
     ▼
HTTP Response
```

---

## 2. 技术栈

### 2.1 核心技术

| 技术 | 版本 | 用途 | 选型理由 |
|------|------|------|----------|
| **NestJS** | 11+ | 后端框架 | 模块化，TypeScript 原生，依赖注入 |
| **Hocuspocus** | 3.x | 协同网关 | Tiptap 官方，钩子式架构 |
| **Prisma** | 6+ | ORM | 类型安全，迁移系统，查询优化 |
| **TypeScript** | 5.5+ | 类型系统 | 类型安全，开发体验 |

### 2.2 数据存储

| 技术 | 版本 | 用途 | 选型理由 |
|------|------|------|----------|
| **PostgreSQL** | 17 | 主数据库 | BYTEA 支持，JSONB 优化，ACID |
| **Redis** | 8+ | 缓存/PubSub | 高性能，Pub/Sub，分布式锁 |

### 2.3 认证授权

| 技术 | 用途 |
|------|------|
| **JWT** | 无状态认证 |
| **Passport** | 认证中间件 |
| **bcrypt** | 密码哈希 |

---

## 3. 目录结构

```
backend/
├── src/
│   ├── main.ts                         # 应用入口
│   ├── app.module.ts                   # 根模块
│   │
│   ├── modules/                        # 业务模块
│   │   ├── auth/                       # 认证模块
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── login.dto.ts
│   │   │   │   └── register.dto.ts
│   │   │   └── strategies/
│   │   │       └── jwt.strategy.ts
│   │   │
│   │   ├── documents/                  # 文档模块
│   │   │   ├── documents.module.ts
│   │   │   ├── documents.controller.ts
│   │   │   ├── documents.service.ts
│   │   │   └── permission.service.ts
│   │   │
│   │   ├── versions/                   # 版本模块
│   │   │   ├── versions.module.ts
│   │   │   ├── versions.controller.ts
│   │   │   ├── versions.service.ts
│   │   │   └── snapshot.service.ts
│   │   │
│   │   └── collaboration/              # 协同模块
│   │       ├── collaboration.module.ts
│   │       ├── room.service.ts
│   │       └── awareness.service.ts
│   │
│   ├── common/                         # 公共模块
│   │   ├── decorators/                 # 装饰器
│   │   │   ├── current-user.decorator.ts
│   │   │   ├── public.decorator.ts
│   │   │   └── require-permission.decorator.ts
│   │   │
│   │   ├── guards/                     # 守卫
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── permission.guard.ts
│   │   │
│   │   ├── interceptors/               # 拦截器
│   │   │   ├── transform.interceptor.ts
│   │   │   └── logging.interceptor.ts
│   │   │
│   │   ├── filters/                    # 过滤器
│   │   │   └── global-exception.filter.ts
│   │   │
│   │   └── dto/
│   │       └── pagination.dto.ts
│   │
│   ├── config/                         # 配置
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   └── redis.config.ts
│   │
│   ├── prisma/                         # Prisma 服务
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   │
│   ├── redis/                          # Redis 服务
│   │   ├── redis.module.ts
│   │   └── redis.service.ts
│   │
│   └── hocuspocus/                     # Hocuspocus 配置
│       ├── hocuspocus.module.ts
│       ├── hocuspocus.service.ts
│       └── hooks/
│           ├── authenticate.hook.ts
│           └── store-document.hook.ts
│
├── prisma/
│   ├── schema.prisma                   # 数据模型
│   └── migrations/                     # 迁移文件
│
├── test/                               # 测试
│   ├── auth.e2e-spec.ts
│   └── documents.e2e-spec.ts
│
├── .env                                # 环境变量
├── nest-cli.json                       # NestJS 配置
├── tsconfig.json                       # TypeScript 配置
└── package.json                        # 项目依赖
```

---

## 4. 模块架构设计

### 4.1 模块依赖图

```
                      ┌─────────────┐
                      │  AppModule  │
                      └──────┬──────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
  ┌───────────┐        ┌───────────┐        ┌───────────┐
  │ConfigModule│        │PrismaModule│       │RedisModule│
  │  (全局)   │        │  (全局)   │        │  (全局)   │
  └───────────┘        └───────────┘        └───────────┘
                             │                    │
        ┌────────────────────┼────────────────────┤
        │                    │                    │
        ▼                    ▼                    ▼
  ┌───────────┐        ┌───────────┐        ┌───────────┐
  │AuthModule │        │ DocModule │        │Hocuspocus │
  │           │        │           │        │  Module   │
  └─────┬─────┘        └─────┬─────┘        └─────┬─────┘
        │                    │                    │
        │                    ▼                    │
        │              ┌───────────┐              │
        └─────────────▶│ VerModule │◀─────────────┘
                       │           │
                       └─────┬─────┘
                             │
                             ▼
                       ┌───────────┐
                       │CollabModule│
                       └───────────┘
```

### 4.2 核心模块代码

#### AppModule

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

import { AuthModule } from './modules/auth/auth.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { VersionsModule } from './modules/versions/versions.module';
import { HocuspocusModule } from './hocuspocus/hocuspocus.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';

import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    HocuspocusModule,
    AuthModule,
    DocumentsModule,
    VersionsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
```

#### AuthModule

```typescript
// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../../redis/redis.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '15m') },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
```

---

## 5. API 设计规范

### 5.1 RESTful API 规范

| 操作 | HTTP 方法 | 端点 | 说明 |
|------|----------|------|------|
| 列表 | GET | `/api/v1/documents` | 分页获取文档列表 |
| 创建 | POST | `/api/v1/documents` | 创建新文档 |
| 详情 | GET | `/api/v1/documents/:id` | 获取文档详情 |
| 更新 | PATCH | `/api/v1/documents/:id` | 更新文档信息 |
| 删除 | DELETE | `/api/v1/documents/:id` | 删除文档 |

### 5.2 统一响应格式

```typescript
// 成功响应
interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: { page?: number; limit?: number; total?: number };
  timestamp: string;
}

// 错误响应
interface ErrorResponse {
  success: false;
  error: {
    code: string;        // 'AUTH_INVALID_TOKEN'
    message: string;     // 用户友好的错误信息
    details?: Record<string, unknown>;
  };
  timestamp: string;
}
```

### 5.3 响应转换拦截器

```typescript
// src/common/interceptors/transform.interceptor.ts
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, SuccessResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<SuccessResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
```

---

## 6. 数据模型设计

### 6.1 ER 图

```
┌─────────────┐          ┌─────────────────┐
│    User     │          │    Session      │
├─────────────┤          ├─────────────────┤
│ id (PK)     │◀────────▶│ userId (FK)     │
│ email       │          │ token           │
│ username    │          │ refreshToken    │
│ password    │          └─────────────────┘
│ nickname    │
│ status      │
└──────┬──────┘
       │ 1:N
       ▼
┌─────────────────┐         ┌─────────────────────┐
│    Document     │────────▶│ DocumentCollaborator│
├─────────────────┤  1:N    ├─────────────────────┤
│ id (PK)         │         │ documentId (FK)     │
│ title           │         │ userId (FK)         │
│ content (JSON)  │         │ role                │
│ authorId (FK)   │         └─────────────────────┘
└──────┬──────────┘
       │ 1:N
       ▼
┌─────────────────┐
│ DocumentVersion │
├─────────────────┤
│ id (PK)         │
│ documentId (FK) │
│ version         │
│ content (JSON)  │
│ changeLog       │
│ createdBy (FK)  │
└─────────────────┘
```

### 6.2 Prisma Schema

```prisma
// prisma/schema.prisma

model User {
  id        String     @id @default(cuid())
  email     String     @unique
  username  String     @unique
  password  String
  nickname  String?
  avatar    String?
  status    UserStatus @default(ACTIVE)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  documents      Document[]
  collaborations DocumentCollaborator[]
  versions       DocumentVersion[]
  sessions       Session[]

  @@index([email])
  @@map("users")
}

enum UserStatus { ACTIVE INACTIVE SUSPENDED }

model Session {
  id           String   @id @default(cuid())
  userId       String
  token        String   @unique
  refreshToken String   @unique
  expiresAt    DateTime
  createdAt    DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([token])
  @@map("sessions")
}

model Document {
  id          String         @id @default(cuid())
  title       String
  description String?
  content     Json?
  isPublic    Boolean        @default(false)
  status      DocumentStatus @default(DRAFT)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  authorId      String
  author        User                  @relation(fields: [authorId], references: [id], onDelete: Cascade)
  collaborators DocumentCollaborator[]
  versions      DocumentVersion[]

  @@index([authorId])
  @@map("documents")
}

enum DocumentStatus { DRAFT PUBLISHED ARCHIVED DELETED }

model DocumentCollaborator {
  id         String           @id @default(cuid())
  documentId String
  userId     String
  role       CollaboratorRole @default(VIEWER)
  addedAt    DateTime         @default(now())

  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([documentId, userId])
  @@map("document_collaborators")
}

enum CollaboratorRole { OWNER EDITOR VIEWER }

model DocumentVersion {
  id         String   @id @default(cuid())
  documentId String
  version    Int
  content    Json
  changeLog  String?
  createdBy  String
  createdAt  DateTime @default(now())

  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  author   User     @relation(fields: [createdBy], references: [id], onDelete: Cascade)

  @@unique([documentId, version])
  @@index([documentId])
  @@map("document_versions")
}
```

---

## 7. Hocuspocus 网关设计

### 7.1 钩子流程

```
WebSocket 连接
     │
     ▼
┌──────────────┐
│onAuthenticate│  验证 JWT，检查权限
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  onConnect   │  记录连接
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ onLoadDocument│ 加载 Yjs 文档
└──────┬───────┘
       │
       │  ┌─────────────────┐
       │  │   实时编辑循环   │
       │  │ onChange Hook   │
       │  │ onStoreDocument │
       │  └─────────────────┘
       │
       ▼
┌──────────────┐
│ onDisconnect │  清理连接
└──────────────┘
```

### 7.2 Hocuspocus 服务配置

```typescript
// src/hocuspocus/hocuspocus.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Server } from '@hocuspocus/server';
import { Database } from '@hocuspocus/extension-database';
import { Redis } from '@hocuspocus/extension-redis';
import { Logger } from '@hocuspocus/extension-logger';
import * as Y from 'yjs';

@Injectable()
export class HocuspocusService implements OnModuleInit, OnModuleDestroy {
  private server: Server;

  constructor(
    private config: ConfigService,
    private jwt: JwtService,
    private prisma: PrismaService,
    private redis: RedisService,
    private documents: DocumentsService,
  ) {}

  onModuleInit() {
    this.server = Server.configure({
      port: this.config.get('HOCUSPOCUS_PORT', 1234),

      extensions: [
        new Logger(),
        new Redis({ host: this.config.get('REDIS_HOST'), port: 6379 }),
        new Database({
          fetch: async ({ documentName }) => {
            const content = await this.documents.loadContent(documentName);
            return content ? new Uint8Array(content) : null;
          },
          store: async ({ documentName, state }) => {
            await this.documents.saveContent(documentName, Buffer.from(state));
          },
        }),
      ],

      async onAuthenticate({ token, documentName }) {
        if (!token) throw new Error('Authentication required');
        const payload = this.jwt.verify(token);
        const hasAccess = await this.checkAccess(documentName, payload.sub);
        if (!hasAccess) throw new Error('Access denied');
        return { user: { id: payload.sub, email: payload.email } };
      },

      async onConnect({ documentName, context }) {
        await this.redis.sadd(`connections:${documentName}`, context.user.id);
      },

      async onDisconnect({ documentName, context }) {
        await this.redis.srem(`connections:${documentName}`, context.user.id);
      },
    });

    this.server.listen();
  }

  onModuleDestroy() {
    this.server?.destroy();
  }
}
```

---

## 8. 认证授权设计

### 8.1 JWT 认证流程

```
客户端                              服务端
   │                                  │
   │  POST /auth/login                │
   │  { email, password }             │
   │─────────────────────────────────▶│
   │                                  │ 验证凭证
   │  { accessToken, refreshToken }   │ 生成 JWT
   │◀─────────────────────────────────│
   │                                  │
   │  API 请求                        │
   │  Authorization: Bearer token     │
   │─────────────────────────────────▶│
   │                                  │ JwtAuthGuard 验证
   │  响应                            │
   │◀─────────────────────────────────│
```

### 8.2 权限控制（RBAC）

```typescript
// 权限矩阵
const PERMISSIONS = {
  OWNER:  ['read', 'write', 'delete', 'share', 'version'],
  EDITOR: ['read', 'write', 'version'],
  VIEWER: ['read'],
};

// 权限守卫
@Injectable()
export class PermissionGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get(PERMISSION_KEY, context.getHandler());
    if (!requiredPermission) return true;

    const { user } = context.switchToHttp().getRequest();
    const documentId = context.switchToHttp().getRequest().params.id;

    const role = await this.getUserRole(documentId, user.id);
    return PERMISSIONS[role]?.includes(requiredPermission);
  }
}
```

---

## 9. 版本管理设计

### 9.1 快照创建流程

```
触发条件
├── 手动触发（用户点击"创建版本"）
├── 自动触发（50 次编辑后）
└── 定时触发（每 1 小时）
       │
       ▼
┌──────────────┐
│ 获取当前文档 │
│ Y.Doc 状态   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ 提取快照     │
│ encodeStateAsUpdate
└──────┬───────┘
       │
       ▼
┌──────────────┐     是
│ 计算哈希     │────────▶ 跳过（去重）
│ SHA-256      │
└──────┬───────┘
       │ 否
       ▼
┌──────────────┐
│ 创建版本记录 │
│ 存储到数据库 │
└──────────────┘
```

### 9.2 版本恢复

```typescript
async restoreVersion(versionId: string, documentId: string): Promise<void> {
  // 1. 获取目标版本
  const version = await this.prisma.documentVersion.findUnique({ where: { id: versionId } });
  if (!version) throw new NotFoundException('Version not found');

  // 2. 创建当前快照（用于撤销）
  await this.createSnapshot(documentId, 'system', 'Auto-save before restore');

  // 3. 恢复到目标版本
  await this.documentsService.saveContent(documentId, version.content);

  // 4. 通知所有客户端
  await this.broadcastRestore(documentId, version.content);
}
```

---

## 10. 缓存策略设计

### 10.1 Redis 缓存结构

| 键模式 | 说明 | TTL |
|--------|------|-----|
| `session:{userId}` | 用户会话 | 7 days |
| `refresh:{userId}` | 刷新令牌 | 7 days |
| `blacklist:{token}` | Token 黑名单 | Token 剩余时间 |
| `document:{id}` | 文档缓存 | 5 min |
| `lock:document:{id}` | 分布式锁 | 5 sec |
| `connections:{id}` | 在线用户集合 | 无 |
| `ratelimit:{ip}:login` | 登录限流 | 15 min |

### 10.2 缓存策略

| 场景 | 策略 | 说明 |
|------|------|------|
| 用户会话 | Cache-Aside | 登录时写入，登出时删除 |
| 文档元数据 | Cache-Aside | 读取时缓存，更新时失效 |
| 文档内容 | Write-Through | 实时写入，短期缓存 |
| 在线用户 | Write-Behind | 连接时写入，断开时删除 |

---

## 11. 性能优化策略

### 11.1 数据库优化

```typescript
// 连接池配置
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

// 查询优化：只查询需要的字段
async getDocuments(userId: string) {
  return this.prisma.document.findMany({
    where: {
      OR: [
        { authorId: userId },
        { collaborators: { some: { userId } } },
      ],
    },
    select: {
      id: true,
      title: true,
      updatedAt: true,
      author: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
}
```

### 11.2 防抖持久化

```typescript
const DEBOUNCE_DELAY = 2000; // 2 秒

async debouncedSave(documentId: string, document: Y.Doc): Promise<void> {
  const lockKey = `lock:document:${documentId}`;
  const acquired = await this.redis.set(lockKey, '1', 'PX', 5000, 'NX');

  if (!acquired) return;

  try {
    const state = Y.encodeStateAsUpdate(document);
    await this.documentsService.saveContent(documentId, Buffer.from(state));
  } finally {
    await this.redis.del(lockKey);
  }
}
```

---

## 12. 安全设计

### 12.1 安全检查清单

- [ ] 所有 API 端点都有认证保护
- [ ] 敏感操作有权限检查
- [ ] 密码使用 bcrypt 哈希存储
- [ ] 敏感配置通过环境变量管理
- [ ] 强制 HTTPS/WSS
- [ ] 配置 Rate Limiting
- [ ] 数据库连接加密

### 12.2 密码安全

```typescript
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

---

## 13. 错误处理架构

### 13.1 全局异常过滤器

```typescript
// src/common/filters/global-exception.filter.ts
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      status = HttpStatus.BAD_REQUEST;
      code = `PRISMA_${exception.code}`;
    }

    response.status(status).json({
      success: false,
      error: { code, message },
      timestamp: new Date().toISOString(),
    });
  }
}
```

### 13.2 业务异常

```typescript
export class BusinessException extends HttpException {
  constructor(code: string, message: string) {
    super({ code, message }, HttpStatus.BAD_REQUEST);
  }
}

export class DocumentNotFoundException extends BusinessException {
  constructor(documentId: string) {
    super('DOCUMENT_NOT_FOUND', `Document ${documentId} not found`);
  }
}
```

---

## 相关文档

- [NestJS 模块设计](./nestjs-modules.md)
- [Hocuspocus 网关](./hocuspocus-gateway.md)
- [数据模型设计](./prisma-schema.md)
- [版本管理逻辑](./version-management.md)
- [API 接口文档](./api-reference.md)
- [系统架构](../01-architecture/README.md)
- [协同核心](../05-collaboration/README.md)
- [部署与运维](../06-deployment/README.md)
