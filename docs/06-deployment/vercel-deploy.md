# Vercel 前端部署

## 概述

本文档描述如何将 Next.js 15 前端部署到 Vercel。

## 准备工作

### 项目配置

```json
// package.json
{
  "scripts": {
    "dev": "next dev --turbo",
    "build": "next build",
    "start": "next start",
    "lint": "eslint ."
  }
}
```

### Next.js 配置

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 输出配置
  output: 'standalone',

  // 环境变量
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  },

  // 图片优化
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
    ],
  },

  // 安全头
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

## 部署方式

### 方式一：Vercel CLI

```bash
# 安装 CLI
pnpm i -g vercel

# 登录
vercel login

# 部署到预览环境
vercel

# 部署到生产环境
vercel --prod
```

### 方式二：GitHub 集成

1. 访问 [vercel.com](https://vercel.com)
2. 点击 "Import Project"
3. 选择 GitHub 仓库
4. 配置项目设置
5. 点击 "Deploy"

### 方式三：Vercel 配置文件

```json
// vercel.json
{
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "regions": ["sfo1", "iad1"],
  "env": {
    "NEXT_PUBLIC_API_URL": "@api-url",
    "NEXT_PUBLIC_WS_URL": "@ws-url"
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
```

## 环境变量

### 配置方式

1. **Vercel Dashboard**
   - 进入项目设置
   - 点击 "Environment Variables"
   - 添加变量

2. **Vercel CLI**
   ```bash
   # 添加环境变量
   vercel env add NEXT_PUBLIC_API_URL

   # 拉取环境变量
   vercel env pull .env.local
   ```

3. **vercel.json**
   ```json
   {
     "env": {
       "NEXT_PUBLIC_API_URL": "@api-url"
     }
   }
   ```

### 环境变量列表

```bash
# .env.production
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_WS_URL=wss://ws.example.com
NEXT_PUBLIC_APP_URL=https://app.example.com
```

## 域名配置

### 添加自定义域名

1. 进入项目设置 > Domains
2. 添加域名
3. 配置 DNS 记录

### DNS 配置

```
# Apex 域名
类型: A
名称: @
内容: 76.76.21.21

# www 子域名
类型: CNAME
名称: www
内容: cname.vercel-dns.com
```

### Cloudflare 代理

如果使用 Cloudflare：

1. 将 DNS 代理状态设为 "仅 DNS"（灰色云朵）
2. 等待 SSL 证书颁发
3. 再启用代理（橙色云朵）

## 预览部署

Vercel 自动为每个 PR 创建预览部署。

```yaml
# 预览 URL 格式
https://<commit-sha>-<project>.vercel.app
```

### 禁用预览部署

```json
// vercel.json
{
  "git": {
    "deploymentEnabled": {
      "main": true,
      "develop": true,
      "*": false
    }
  }
}
```

## 性能优化

### 静态资源

```typescript
// next.config.ts
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
  },
};
```

### Edge Functions

```typescript
// app/api/hello/route.ts
export const runtime = 'edge';

export async function GET() {
  return Response.json({ message: 'Hello from Edge' });
}
```

### 缓存策略

```typescript
// app/page.tsx
export const revalidate = 60; // 60 秒 ISR

// 或动态
export const dynamic = 'force-dynamic';
```

## 监控

### Vercel Analytics

```bash
pnpm add @vercel/analytics
```

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### Speed Insights

```bash
pnpm add @vercel/speed-insights
```

```typescript
// app/layout.tsx
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
```

## 日志

### 查看日志

```bash
# 实时日志
vercel logs --follow

# 特定部署日志
vercel logs <deployment-url>
```

### 结构化日志

```typescript
// lib/logger.ts
export function log(level: string, message: string, data?: any) {
  console.log(JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...data,
  }));
}
```

## 故障排查

### 常见问题

1. **构建失败**
   ```bash
   # 本地测试构建
   pnpm build

   # 检查 Node 版本
   node --version
   ```

2. **环境变量未生效**
   - 确认变量名以 `NEXT_PUBLIC_` 开头
   - 重新部署项目

3. **WebSocket 连接失败**
   - Vercel Serverless 不支持 WebSocket
   - 使用外部 WebSocket 服务（如 Railway）

### 调试模式

```bash
# 启用调试日志
vercel --debug
```

## 相关文档

- [平台概览](./platform-overview.md)
- [环境变量配置](./environment.md)
- [CI/CD 流水线](./cicd-pipeline.md)
