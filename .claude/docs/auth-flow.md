# 认证流程参考

## 架构

```
浏览器 ←→ Next.js Middleware ←→ NestJS API ←→ PostgreSQL
                ↓                      ↓
         cookie 检测             JWT 签发/验证
         路由保护                Session 管理
```

## Token 存储

| Token         | 存储位置        | 属性                   | 有效期 |
| ------------- | --------------- | ---------------------- | ------ |
| access_token  | HttpOnly cookie | path=/, SameSite=Lax   | 7 天   |
| refresh_token | HttpOnly cookie | path=/api/auth/refresh | 30 天  |

**前端 JS 无法读取 token 值**。认证状态通过 zustand persist 存储 `user` + `isAuthenticated`。

## 关键文件

### 后端

```
backend/src/modules/auth/
├── auth.controller.ts       # Set-Cookie 设置 token
├── auth.service.ts          # JWT 签发 + bcrypt + Session CRUD
├── auth.module.ts           # JwtModule + PassportModule
├── strategies/jwt.strategy.ts  # 优先 cookie 提取，兼容 Bearer header
├── guards/jwt-auth.guard.ts    # 全局认证守卫
└── dto/
    ├── login.dto.ts         # @IsEmail + @IsString
    ├── register.dto.ts      # 邮箱+用户名+密码+可选昵称
    └── refresh-token.dto.ts

backend/src/main.ts          # cookieParser() + CORS(credentials: true)
```

### 前端

```
frontend/
├── middleware.ts             # 从 cookie 检测，保护 /(main)/* 路由
├── lib/api/client.ts        # withCredentials + 401 自动刷新
├── stores/auth.store.ts     # user + isAuthenticated (无 token)
├── components/common/auth-guard.tsx  # 客户端守卫 + 骨架屏
└── providers/app-provider.tsx
```

## API 端点

```
POST /api/auth/register    → Set-Cookie → { user }
POST /api/auth/login       → Set-Cookie → { user }
POST /api/auth/logout      → Clear-Cookie → { success: true }
POST /api/auth/refresh     → Set-Cookie → { user }  (读取 refresh_token cookie)
GET  /api/auth/me          → { user }  (需要认证)
```

## 刷新流程

```
1. 请求返回 401
2. 前端 client.ts 自动调用 POST /api/auth/refresh (cookie 自动携带)
3. 后端从 cookie 读取 refresh_token → 验证 → 签发新 token → Set-Cookie
4. 前端重试原始请求 (新 cookie 已自动设置)
5. 刷新也失败 → localStorage.removeItem('auth-storage') → 跳转 /login
```

## 路由保护

```
middleware.ts (服务端):
  /documents, /settings → 无 access_token cookie → 重定向 /login?callbackUrl=...
  /login, /register     → 有 access_token cookie → 重定向 /documents

auth-guard.tsx (客户端):
  /(main)/layout.tsx 包裹 → hydrate 后检测 isAuthenticated → 无则 router.replace('/login')
  hydrate 中显示骨架屏
```

## 注意事项

- WebSocket 认证仍使用 Bearer header (Hocuspocus 限制)
- cookie `secure: true` 仅在 NODE_ENV=production 启用
- 修改认证逻辑后需同步更新：auth.controller.ts, jwt.strategy.ts, client.ts, middleware.ts, auth.store.ts
