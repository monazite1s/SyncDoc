# 工程化结构

## 项目目录结构

```
frontend/
├── .github/                    # GitHub 配置
│   └── workflows/             # CI/CD 工作流
│
├── app/                        # Next.js App Router
│   ├── (auth)/                # 认证路由组
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   │
│   ├── (main)/                # 主应用路由组
│   │   ├── documents/
│   │   │   ├── page.tsx       # 文档列表
│   │   │   └── [id]/
│   │   │       ├── page.tsx   # 文档编辑
│   │   │       └── versions/
│   │   │           └── page.tsx
│   │   ├── settings/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   │
│   ├── api/                   # API Routes (BFF)
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   └── trpc/
│   │       └── [trpc]/
│   │
│   ├── layout.tsx             # 根布局
│   ├── page.tsx               # 首页
│   └── globals.css            # 全局样式
│
├── components/                 # React 组件
│   ├── ui/                    # ShadcnUI 基础组件
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   └── ...
│   │
│   ├── editor/                # 编辑器组件
│   │   ├── editor.tsx         # 主编辑器
│   │   ├── menu-bar.tsx       # 菜单栏
│   │   ├── bubble-menu.tsx    # 浮动菜单
│   │   ├── status-bar.tsx     # 状态栏
│   │   └── extensions/        # 自定义扩展
│   │       ├── index.ts
│   │       └── highlight.tsx
│   │
│   ├── collaboration/         # 协同组件
│   │   ├── collaboration-cursor.tsx
│   │   ├── awareness-panel.tsx
│   │   ├── collaborator-avatars.tsx
│   │   └── connection-status.tsx
│   │
│   ├── version/               # 版本管理组件
│   │   ├── version-list.tsx
│   │   ├── version-preview.tsx
│   │   ├── version-diff.tsx
│   │   └── version-timeline.tsx
│   │
│   └── common/                # 通用组件
│       ├── header.tsx
│       ├── sidebar.tsx
│       ├── loading.tsx
│       └── error-boundary.tsx
│
├── hooks/                      # 自定义 Hooks
│   ├── use-document.ts        # 文档操作
│   ├── use-collaboration.ts   # 协同状态
│   ├── use-versions.ts        # 版本管理
│   ├── use-auth.ts            # 认证状态
│   └── use-websocket.ts       # WebSocket 连接
│
├── lib/                        # 工具函数
│   ├── api/                   # API 客户端
│   │   ├── client.ts
│   │   └── endpoints.ts
│   ├── auth/                  # 认证工具
│   │   ├── token.ts
│   │   └── session.ts
│   ├── yjs/                   # Yjs 工具
│   │   ├── provider.ts
│   │   ├── awareness.ts
│   │   └── sync.ts
│   ├── utils.ts               # 通用工具
│   └── constants.ts           # 常量定义
│
├── providers/                  # Context Providers
│   ├── app-provider.tsx       # 应用级 Provider
│   ├── auth-provider.tsx      # 认证 Provider
│   ├── query-provider.tsx     # TanStack Query
│   └── theme-provider.tsx     # 主题 Provider
│
├── stores/                     # Zustand Stores
│   ├── document-store.ts      # 文档状态
│   ├── ui-store.ts            # UI 状态
│   └── user-store.ts          # 用户状态
│
├── types/                      # TypeScript 类型
│   ├── api.ts                 # API 类型
│   ├── document.ts            # 文档类型
│   ├── user.ts                # 用户类型
│   └── version.ts             # 版本类型
│
├── styles/                     # 样式文件
│   └── editor.css             # 编辑器样式
│
├── public/                     # 静态资源
│   ├── icons/
│   └── images/
│
├── .env.local                  # 本地环境变量
├── .env.example                # 环境变量示例
├── next.config.ts              # Next.js 配置
├── tailwind.config.ts          # Tailwind 配置
├── tsconfig.json               # TypeScript 配置
├── package.json                # 项目依赖
└── pnpm-lock.yaml              # 锁定文件
```

## 配置文件

### next.config.ts

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 启用 Turbopack（开发模式）
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },

  // 环境变量
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  },

  // 严格模式
  reactStrictMode: true,

  // 图片优化
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
};

export default nextConfig;
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### tailwind.config.ts

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 自定义颜色
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        // 编辑器光标颜色
        cursor: {
          blue: '#3b82f6',
          green: '#22c55e',
          red: '#ef4444',
          yellow: '#eab308',
          purple: '#a855f7',
        },
      },
      animation: {
        // 协作光标动画
        'cursor-blink': 'blink 1s infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/typography'),
  ],
};

export default config;
```

### package.json

```json
{
  "name": "collab-editor-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbo",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:coverage": "vitest --coverage"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@tiptap/react": "^3.0.0",
    "@tiptap/starter-kit": "^3.0.0",
    "@tiptap/extension-collaboration": "^3.0.0",
    "@tiptap/extension-collaboration-cursor": "^3.0.0",
    "yjs": "^13.6.0",
    "y-websocket": "^2.0.0",
    "zustand": "^5.0.0",
    "@tanstack/react-query": "^5.0.0",
    "tailwindcss": "^4.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "lucide-react": "^0.400.0",
    "zod": "^3.0.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.0.0",
    "prettier": "^3.0.0",
    "vitest": "^2.0.0"
  }
}
```

## ESLint 配置

```javascript
// eslint.config.mjs
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
];

export default eslintConfig;
```

## 环境变量

```bash
# .env.example

# API 配置
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=ws://localhost:1234

# 认证
NEXT_PUBLIC_AUTH_DOMAIN=localhost

# 功能开关
NEXT_PUBLIC_ENABLE_OFFLINE=true
NEXT_PUBLIC_ENABLE_VERSIONS=true
```

## 开发规范

### 命名约定

| 类型 | 约定 | 示例 |
|------|------|------|
| 组件文件 | PascalCase | `DocumentEditor.tsx` |
| Hook 文件 | camelCase + use 前缀 | `useDocument.ts` |
| 工具函数 | camelCase | `formatDate.ts` |
| 类型文件 | camelCase | `document.ts` |
| 常量 | UPPER_SNAKE_CASE | `MAX_FILE_SIZE` |

### 组件结构

```tsx
// 组件模板
import { FC } from 'react';
import { cn } from '@/lib/utils';

interface ComponentProps {
  className?: string;
  // ...
}

export const Component: FC<ComponentProps> = ({ className, ...props }) => {
  return (
    <div className={cn('base-classes', className)}>
      {/* 内容 */}
    </div>
  );
};
```

### 导出规范

```typescript
// 优先命名导出
export { DocumentEditor } from './editor';
export { MenuBar } from './menu-bar';

// 统一在 index.ts 中导出
// components/editor/index.ts
export { DocumentEditor } from './editor';
export { MenuBar } from './menu-bar';
export { BubbleMenu } from './bubble-menu';
```

## 相关文档

- [Tiptap 编辑器集成](./tiptap-integration.md)
- [Yjs 客户端配置](./yjs-client.md)
- [性能优化策略](./performance.md)
