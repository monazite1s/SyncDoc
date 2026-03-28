# 性能优化策略

## 概述

本文档描述前端的性能优化策略，涵盖代码分割、虚拟列表、缓存策略和编辑器优化。

## 代码分割

### 动态导入

```tsx
// app/documents/[id]/page.tsx
import dynamic from 'next/dynamic';
import { DocumentSkeleton } from '@/components/common/skeleton';

// 动态导入编辑器（按需加载）
const DocumentEditor = dynamic(() => import('@/components/editor/editor'), {
    loading: () => <DocumentSkeleton />,
    ssr: false, // 编辑器不支持 SSR
});

export default function DocumentPage({ params }: { params: { id: string } }) {
    return (
        <main className="h-screen">
            <DocumentEditor documentId={params.id} />
        </main>
    );
}
```

### 组件懒加载

```tsx
// hooks/use-lazy-component.ts
import { useState, useEffect, ComponentType } from 'react';

export function useLazyComponent<T>(
    loader: () => Promise<{ default: ComponentType<T> }>,
    condition: boolean = true
): ComponentType<T> | null {
    const [Component, setComponent] = useState<ComponentType<T> | null>(null);

    useEffect(() => {
        if (condition && !Component) {
            loader().then((mod) => setComponent(() => mod.default));
        }
    }, [condition, Component, loader]);

    return Component;
}

// 使用示例
function DocumentPage() {
    const [showVersionHistory, setShowVersionHistory] = useState(false);
    const VersionHistory = useLazyComponent(
        () => import('@/components/version/version-list'),
        showVersionHistory
    );

    return (
        <div>
            <Button onClick={() => setShowVersionHistory(true)}>View History</Button>
            {showVersionHistory && VersionHistory && <VersionHistory />}
        </div>
    );
}
```

### 路由级别分割

```typescript
// next.config.ts
const nextConfig = {
    experimental: {
        turbo: {
            resolveExtensions: ['.tsx', '.ts', '.jsx', '.js'],
        },
    },
};

export default nextConfig;
```

## 虚拟列表

### 长文档优化

```tsx
// components/editor/virtualized-content.tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

interface VirtualizedContentProps {
    paragraphs: Paragraph[];
    editor: Editor;
}

export function VirtualizedContent({ paragraphs, editor }: VirtualizedContentProps) {
    const parentRef = useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count: paragraphs.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 100, // 估计每段高度
        overscan: 5, // 预渲染数量
    });

    return (
        <div ref={parentRef} className="h-full overflow-auto">
            <div
                style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    position: 'relative',
                }}
            >
                {virtualizer.getVirtualItems().map((virtualItem) => (
                    <div
                        key={virtualItem.key}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: `${virtualItem.size}px`,
                            transform: `translateY(${virtualItem.start}px)`,
                        }}
                    >
                        <ParagraphBlock paragraph={paragraphs[virtualItem.index]} editor={editor} />
                    </div>
                ))}
            </div>
        </div>
    );
}
```

### 版本列表虚拟化

```tsx
// components/version/version-list-virtualized.tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

interface Version {
    id: string;
    message: string;
    createdAt: Date;
    creator: User;
}

interface VersionListProps {
    versions: Version[];
    onSelect: (id: string) => void;
}

export function VersionListVirtualized({ versions, onSelect }: VersionListProps) {
    const parentRef = useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count: versions.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 80,
        overscan: 10,
    });

    return (
        <div ref={parentRef} className="h-[600px] overflow-auto">
            <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
                {virtualizer.getVirtualItems().map((virtualRow) => {
                    const version = versions[virtualRow.index];
                    return (
                        <div
                            key={virtualRow.key}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: `${virtualRow.size}px`,
                                transform: `translateY(${virtualRow.start}px)`,
                            }}
                        >
                            <VersionItem version={version} onClick={() => onSelect(version.id)} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
```

## 缓存策略

### React Query 配置

```tsx
// providers/query-provider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 60 * 1000, // 1 分钟
                        gcTime: 5 * 60 * 1000, // 5 分钟
                        retry: 1,
                        refetchOnWindowFocus: false,
                    },
                },
            })
    );

    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

### 文档缓存

```typescript
// hooks/use-document.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/client';

export function useDocument(documentId: string) {
    return useQuery({
        queryKey: ['document', documentId],
        queryFn: () => api.get(`/documents/${documentId}`).then((r) => r.data),
        staleTime: 30 * 1000, // 30 秒
        gcTime: 10 * 60 * 1000, // 10 分钟
    });
}

export function useDocumentMutations() {
    const queryClient = useQueryClient();

    const updateDocument = useMutation({
        mutationFn: (data: { id: string; title?: string }) =>
            api.patch(`/documents/${data.id}`, data),
        onSuccess: (_, variables) => {
            // 更新缓存
            queryClient.invalidateQueries({
                queryKey: ['document', variables.id],
            });
        },
    });

    return { updateDocument };
}
```

### 预加载策略

```typescript
// hooks/use-prefetch.ts
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/client';

export function usePrefetch() {
  const queryClient = useQueryClient();

  const prefetchDocument = (documentId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['document', documentId],
      queryFn: () => api.get(`/documents/${documentId}`).then((r) => r.data),
      staleTime: 60 * 1000,
    });
  };

  const prefetchVersions = (documentId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['versions', documentId],
      queryFn: () =>
        api.get(`/documents/${documentId}/versions`).then((r) => r.data),
      staleTime: 5 * 60 * 1000,
    });
  };

  return { prefetchDocument, prefetchVersions };
}

// 使用示例 - 鼠标悬停预加载
function DocumentLink({ document }: { document: Document }) {
  const { prefetchDocument } = usePrefetch();

  return (
    <Link
      href={`/documents/${document.id}`}
      onMouseEnter={() => prefetchDocument(document.id)}
    >
      {document.title}
    </Link>
  );
}
```

## 编辑器优化

### 输入防抖

```typescript
// lib/editor/debounce.ts
import { debounce } from 'lodash-es';

// 自动保存防抖
export const debouncedSave = debounce(
    async (documentId: string, content: string) => {
        await saveDocument(documentId, content);
    },
    2000 // 2 秒延迟
);

// 编辑器中使用
editor.on('update', () => {
    debouncedSave(documentId, editor.getHTML());
});
```

### 批量更新

```typescript
// lib/editor/batch-updates.ts
import * as Y from 'yjs';

// 批量应用更新
export function batchApplyUpdates(ydoc: Y.Doc, updates: Uint8Array[]): void {
    Y.transact(ydoc, () => {
        updates.forEach((update) => {
            Y.applyUpdate(ydoc, update);
        });
    });
}
```

### 增量渲染

```tsx
// components/editor/incremental-render.tsx
import { useEffect, useRef, useState } from 'react';

interface IncrementalRenderProps {
    content: string;
    chunkSize?: number;
}

export function IncrementalRender({ content, chunkSize = 10000 }: IncrementalRenderProps) {
    const [rendered, setRendered] = useState('');
    const indexRef = useRef(0);

    useEffect(() => {
        if (content.length <= chunkSize) {
            setRendered(content);
            return;
        }

        const renderChunk = () => {
            const nextIndex = Math.min(indexRef.current + chunkSize, content.length);
            setRendered(content.slice(0, nextIndex));
            indexRef.current = nextIndex;

            if (nextIndex < content.length) {
                requestIdleCallback(renderChunk);
            }
        };

        indexRef.current = 0;
        renderChunk();
    }, [content, chunkSize]);

    return <div dangerouslySetInnerHTML={{ __html: rendered }} />;
}
```

## 图片优化

### Next.js Image 组件

```tsx
// components/common/optimized-image.tsx
import Image from 'next/image';

interface OptimizedImageProps {
    src: string;
    alt: string;
    width: number;
    height: number;
}

export function OptimizedImage({ src, alt, width, height }: OptimizedImageProps) {
    return (
        <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            loading="lazy"
            placeholder="blur"
            blurDataURL="data:image/png;base64,..."
            sizes="(max-width: 768px) 100vw, 50vw"
        />
    );
}
```

### 图片懒加载

```tsx
// components/editor/lazy-image.tsx
import { useState, useRef, useEffect } from 'react';

interface LazyImageProps {
    src: string;
    alt: string;
}

export function LazyImage({ src, alt }: LazyImageProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const imgRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '100px' }
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => observer.disconnect();
    }, []);

    return (
        <div ref={imgRef} className="relative aspect-video bg-gray-100">
            {isInView && (
                <img
                    src={src}
                    alt={alt}
                    onLoad={() => setIsLoaded(true)}
                    className={cn(
                        'transition-opacity duration-300',
                        isLoaded ? 'opacity-100' : 'opacity-0'
                    )}
                />
            )}
            {!isLoaded && <Skeleton />}
        </div>
    );
}
```

## 包体积优化

### Bundle 分析

```bash
# 分析包体积
ANALYZE=true pnpm build
```

### Tree Shaking

```typescript
// 优化导入
// ❌ 导入整个库
import _ from 'lodash';
_.debounce();

// ✅ 按需导入
import debounce from 'lodash-es/debounce';
debounce();
```

### 外部依赖

```typescript
// next.config.ts
const nextConfig = {
    experimental: {
        optimizePackageImports: ['lucide-react', '@tiptap/core'],
    },
};

export default nextConfig;
```

## 性能监控

### Web Vitals

```tsx
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html>
            <body>
                {children}
                <Analytics />
                <SpeedInsights />
            </body>
        </html>
    );
}
```

### 自定义性能指标

```typescript
// lib/monitoring/performance.ts
export function measurePerformance(name: string) {
    const start = performance.now();

    return {
        end: () => {
            const duration = performance.now() - start;
            console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);

            // 上报
            if (duration > 1000) {
                reportSlowOperation(name, duration);
            }
        },
    };
}

// 使用
const measure = measurePerformance('document-load');
await loadDocument(id);
measure.end();
```

## 相关文档

- [工程化结构](./project-structure.md)
- [错误处理与边界](./error-handling.md)
- [监控与日志](../06-deployment/monitoring.md)
