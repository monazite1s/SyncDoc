# API 接口文档

## 概述

本文档描述协同文档编辑系统的 REST API 接口规范。

## 基础信息

| 项目 | 说明 |
|------|------|
| 基础路径 | `/api/v1` |
| 认证方式 | Bearer Token (JWT) |
| 响应格式 | JSON |
| 编码 | UTF-8 |

## 响应格式

### 成功响应

```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-01-15T10:30:00.000Z"
}
```

### 分页响应

```json
{
  "success": true,
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  },
  "timestamp": "2026-01-15T10:30:00.000Z"
}
```

### 错误响应

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "email": ["Invalid email format"]
    }
  },
  "timestamp": "2026-01-15T10:30:00.000Z"
}
```

## 认证 API

### 用户注册

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

**响应**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "user": {
      "id": "clx123",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
}
```

### 用户登录

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**响应**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "user": {
      "id": "clx123",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
}
```

### 刷新 Token

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJ..."
}
```

**响应**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

### 登出

```http
POST /api/v1/auth/logout
Authorization: Bearer <accessToken>
```

**响应**

```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

## 文档 API

### 获取文档列表

```http
GET /api/v1/documents?page=1&limit=20
Authorization: Bearer <accessToken>
```

**查询参数**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | int | 1 | 页码 |
| limit | int | 20 | 每页数量 |

**响应**

```json
{
  "success": true,
  "data": [
    {
      "id": "clx123",
      "title": "My Document",
      "createdAt": "2026-01-15T10:00:00.000Z",
      "updatedAt": "2026-01-15T10:30:00.000Z",
      "owner": {
        "id": "user123",
        "name": "John Doe"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

### 创建文档

```http
POST /api/v1/documents
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "title": "New Document"
}
```

**响应**

```json
{
  "success": true,
  "data": {
    "id": "clx456",
    "title": "New Document",
    "ownerId": "user123",
    "createdAt": "2026-01-15T10:30:00.000Z",
    "updatedAt": "2026-01-15T10:30:00.000Z"
  }
}
```

### 获取文档详情

```http
GET /api/v1/documents/:documentId
Authorization: Bearer <accessToken>
```

**响应**

```json
{
  "success": true,
  "data": {
    "id": "clx123",
    "title": "My Document",
    "content": null,
    "createdAt": "2026-01-15T10:00:00.000Z",
    "updatedAt": "2026-01-15T10:30:00.000Z",
    "owner": {
      "id": "user123",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "collaborators": [
      {
        "id": "collab1",
        "userId": "user456",
        "role": "EDITOR",
        "user": {
          "id": "user456",
          "name": "Jane Doe"
        }
      }
    ]
  }
}
```

### 更新文档

```http
PATCH /api/v1/documents/:documentId
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "title": "Updated Title"
}
```

**响应**

```json
{
  "success": true,
  "data": {
    "id": "clx123",
    "title": "Updated Title",
    "updatedAt": "2026-01-15T11:00:00.000Z"
  }
}
```

### 删除文档

```http
DELETE /api/v1/documents/:documentId
Authorization: Bearer <accessToken>
```

**响应**

```json
{
  "success": true,
  "data": {
    "message": "Document deleted successfully"
  }
}
```

## 协作者 API

### 添加协作者

```http
POST /api/v1/documents/:documentId/collaborators
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "userId": "user456",
  "role": "EDITOR"
}
```

**响应**

```json
{
  "success": true,
  "data": {
    "id": "collab1",
    "documentId": "clx123",
    "userId": "user456",
    "role": "EDITOR",
    "user": {
      "id": "user456",
      "name": "Jane Doe",
      "email": "jane@example.com"
    }
  }
}
```

### 更新协作者角色

```http
PATCH /api/v1/documents/:documentId/collaborators/:userId
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "role": "VIEWER"
}
```

### 移除协作者

```http
DELETE /api/v1/documents/:documentId/collaborators/:userId
Authorization: Bearer <accessToken>
```

## 版本 API

### 获取版本列表

```http
GET /api/v1/documents/:documentId/versions?page=1&limit=20
Authorization: Bearer <accessToken>
```

**响应**

```json
{
  "success": true,
  "data": [
    {
      "id": "ver123",
      "message": "Initial version",
      "createdAt": "2026-01-15T10:00:00.000Z",
      "creator": {
        "id": "user123",
        "name": "John Doe"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

### 创建版本

```http
POST /api/v1/documents/:documentId/versions
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "message": "Save before major changes"
}
```

**响应**

```json
{
  "success": true,
  "data": {
    "id": "ver456",
    "documentId": "clx123",
    "message": "Save before major changes",
    "createdAt": "2026-01-15T11:00:00.000Z",
    "creator": {
      "id": "user123",
      "name": "John Doe"
    }
  }
}
```

### 获取版本详情

```http
GET /api/v1/documents/:documentId/versions/:versionId
Authorization: Bearer <accessToken>
```

### 恢复到指定版本

```http
POST /api/v1/documents/:documentId/versions/:versionId/restore
Authorization: Bearer <accessToken>
```

**响应**

```json
{
  "success": true,
  "data": {
    "success": true,
    "newVersionId": "ver789"
  }
}
```

### 版本对比

```http
GET /api/v1/documents/:documentId/versions/:fromId/diff/:toId
Authorization: Bearer <accessToken>
```

**响应**

```json
{
  "success": true,
  "data": {
    "from": {
      "id": "ver123",
      "createdAt": "2026-01-15T10:00:00.000Z",
      "message": "Initial version"
    },
    "to": {
      "id": "ver456",
      "createdAt": "2026-01-15T11:00:00.000Z",
      "message": "Updated content"
    },
    "changes": [
      {
        "type": "add",
        "value": "New paragraph",
        "position": 5
      },
      {
        "type": "delete",
        "value": "Old paragraph",
        "position": 3
      }
    ],
    "stats": {
      "additions": 1,
      "deletions": 1
    }
  }
}
```

### 删除版本

```http
DELETE /api/v1/documents/:documentId/versions/:versionId
Authorization: Bearer <accessToken>
```

## WebSocket API

### 连接

```
wss://collab.example.com/<documentId>?token=<accessToken>
```

### 消息类型

#### 认证

```json
{
  "type": "auth",
  "token": "eyJ..."
}
```

#### 同步

```json
{
  "type": "sync",
  "stateVector": [0, 1, 2, ...]
}
```

#### 更新

```json
{
  "type": "update",
  "update": [0, 1, 2, ...]
}
```

#### Awareness

```json
{
  "type": "awareness",
  "awareness": {
    "user": {
      "id": "user123",
      "name": "John Doe",
      "color": "#3b82f6"
    },
    "cursor": {
      "from": 10,
      "to": 20
    }
  }
}
```

## 错误码

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| UNAUTHORIZED | 401 | 未认证 |
| TOKEN_EXPIRED | 401 | Token 过期 |
| FORBIDDEN | 403 | 无权限 |
| NOT_FOUND | 404 | 资源不存在 |
| VALIDATION_ERROR | 400 | 验证失败 |
| CONFLICT | 409 | 资源冲突 |
| RATE_LIMIT_EXCEEDED | 429 | 请求过于频繁 |
| INTERNAL_ERROR | 500 | 服务器错误 |

## 速率限制

| 端点 | 限制 | 窗口 |
|------|------|------|
| /auth/login | 5 | 5 分钟 |
| /auth/register | 3 | 1 小时 |
| /api/* | 100 | 1 分钟 |
| WebSocket | 1000 | 1 分钟 |

## 相关文档

- [NestJS 模块设计](./nestjs-modules.md)
- [安全设计](../02-security/README.md)
- [数据模型设计](./prisma-schema.md)
