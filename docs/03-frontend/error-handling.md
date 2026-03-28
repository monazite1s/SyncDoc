# 错误处理与边界

## 概述

本文档描述前端的错误处理策略，包括 React Error Boundary、API 错误处理、WebSocket 错误和用户友好的错误展示。

## 错误边界架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    错误边界架构                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐   ┌─────────────────┐                    │
│  │ RootErrorBoundary│   │ EditorErrorBoundary│                 │
│  │ (全局捕获)       │   │ (编辑器隔离)       │                 │
│  └─────────────────┘   └─────────────────┘                    │
│           │                    │                               │
│           ▼                    ▼                               │
│  ┌─────────────────────────────────────────┐                  │
│  │ Fallback UI                              │                  │
│  │ ├── 友好错误提示                         │                  │
│  │ ├── 重试按钮                             │                  │
│  │ └── 本地数据恢复提示                     │                  │
│  └─────────────────────────────────────────┘                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## React Error Boundary

### 基础 Error Boundary

```tsx
// components/common/error-boundary.tsx
'use client';

import { Component, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        // 记录错误
        console.error('ErrorBoundary caught:', error, errorInfo);

        // 调用错误回调
        this.props.onError?.(error, errorInfo);

        // 发送错误到监控服务
        reportError(error, errorInfo);
    }

    handleRetry = (): void => {
        this.setState({ hasError: false, error: null });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            return (
                this.props.fallback || (
                    <DefaultErrorFallback error={this.state.error} onRetry={this.handleRetry} />
                )
            );
        }

        return this.props.children;
    }
}

// 默认错误展示组件
interface ErrorFallbackProps {
    error: Error | null;
    onRetry: () => void;
}

function DefaultErrorFallback({ error, onRetry }: ErrorFallbackProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
                <p className="text-gray-600 mb-4">
                    {error?.message || 'An unexpected error occurred'}
                </p>
                <Button onClick={onRetry}>Try again</Button>
            </div>
        </div>
    );
}
```

### 编辑器 Error Boundary

```tsx
// components/editor/editor-error-boundary.tsx
'use client';

import { ErrorBoundary } from '@/components/common/error-boundary';

interface EditorErrorBoundaryProps {
    children: React.ReactNode;
    documentId: string;
}

export function EditorErrorBoundary({ children, documentId }: EditorErrorBoundaryProps) {
    return (
        <ErrorBoundary
            fallback={<EditorErrorFallback documentId={documentId} />}
            onError={(error, errorInfo) => {
                // 记录编辑器特定错误
                logEditorError(documentId, error, errorInfo);
            }}
        >
            {children}
        </ErrorBoundary>
    );
}

function EditorErrorFallback({ documentId }: { documentId: string }) {
    const [hasLocalData, setHasLocalData] = useState(false);

    useEffect(() => {
        // 检查是否有本地缓存的数据
        checkLocalData(documentId).then(setHasLocalData);
    }, [documentId]);

    return (
        <div className="flex flex-col items-center justify-center h-full p-8 bg-gray-50">
            <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Editor Error</h2>
            <p className="text-gray-600 mb-4 text-center max-w-md">
                The editor encountered an error. Your changes are saved locally.
            </p>

            {hasLocalData && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <p className="text-yellow-800">
                        You have unsaved changes that can be recovered.
                    </p>
                </div>
            )}

            <div className="flex gap-2">
                <Button variant="outline" onClick={() => window.location.reload()}>
                    Reload Page
                </Button>
                {hasLocalData && (
                    <Button onClick={() => recoverLocalData(documentId)}>Recover Changes</Button>
                )}
            </div>
        </div>
    );
}
```

### 根级 Error Boundary

```tsx
// app/error.tsx (Next.js 15)
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface ErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function RootError({ error, reset }: ErrorProps) {
    useEffect(() => {
        // 记录到错误监控
        reportError(error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <h1 className="text-4xl font-bold mb-4">Something went wrong!</h1>
            <p className="text-gray-600 mb-8 text-center max-w-md">
                {error.message || 'An unexpected error occurred. Please try again.'}
            </p>
            <div className="flex gap-4">
                <Button variant="outline" onClick={() => (window.location.href = '/')}>
                    Go Home
                </Button>
                <Button onClick={reset}>Try again</Button>
            </div>
        </div>
    );
}
```

## API 错误处理

### 错误类型定义

```typescript
// types/api.ts
export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    statusCode: number;
}

export const ErrorCodes = {
    // 认证错误
    UNAUTHORIZED: 'UNAUTHORIZED',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    FORBIDDEN: 'FORBIDDEN',

    // 验证错误
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INVALID_INPUT: 'INVALID_INPUT',

    // 资源错误
    NOT_FOUND: 'NOT_FOUND',
    ALREADY_EXISTS: 'ALREADY_EXISTS',

    // 服务器错误
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;
```

### Axios 拦截器

```typescript
// lib/api/client.ts
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { ApiError, ErrorCodes } from '@/types/api';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    timeout: 30000,
});

// 请求拦截器
api.interceptors.request.use(
    (config) => {
        const token = getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// 响应拦截器
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // 处理 Token 过期
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const newToken = await refreshAccessToken();
                if (newToken && originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    return api(originalRequest);
                }
            } catch (refreshError) {
                // Token 刷新失败，跳转登录
                clearTokens();
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        // 转换错误格式
        const apiError = transformError(error);

        // 显示错误提示
        showErrorToast(apiError);

        return Promise.reject(apiError);
    }
);

function transformError(error: AxiosError<ApiError>): ApiError {
    if (error.response?.data) {
        return error.response.data;
    }

    if (error.code === 'ECONNABORTED') {
        return {
            code: ErrorCodes.SERVICE_UNAVAILABLE,
            message: 'Request timeout. Please try again.',
            statusCode: 408,
        };
    }

    if (!error.response) {
        return {
            code: ErrorCodes.SERVICE_UNAVAILABLE,
            message: 'Network error. Please check your connection.',
            statusCode: 0,
        };
    }

    return {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'An unexpected error occurred.',
        statusCode: error.response.status,
    };
}

export default api;
```

### 错误处理 Hook

```typescript
// hooks/use-api-error.ts
import { useCallback } from 'react';
import { ApiError, ErrorCodes } from '@/types/api';

interface ErrorHandlers {
    onUnauthorized?: () => void;
    onForbidden?: () => void;
    onNotFound?: () => void;
    onValidationError?: (details: Record<string, unknown>) => void;
    onServerError?: () => void;
}

export function useApiError(handlers: ErrorHandlers = {}) {
    const handleError = useCallback(
        (error: unknown) => {
            const apiError = error as ApiError;

            switch (apiError.code) {
                case ErrorCodes.UNAUTHORIZED:
                case ErrorCodes.TOKEN_EXPIRED:
                    handlers.onUnauthorized?.();
                    break;

                case ErrorCodes.FORBIDDEN:
                    handlers.onForbidden?.();
                    break;

                case ErrorCodes.NOT_FOUND:
                    handlers.onNotFound?.();
                    break;

                case ErrorCodes.VALIDATION_ERROR:
                    handlers.onValidationError?.(apiError.details || {});
                    break;

                default:
                    handlers.onServerError?.();
            }

            // 默认错误展示
            showErrorToast(apiError);
        },
        [handlers]
    );

    return { handleError };
}
```

## WebSocket 错误处理

### 连接错误

```typescript
// hooks/use-websocket-error.ts
import { useEffect } from 'react';
import { WebsocketProvider } from 'y-websocket';

interface WebSocketErrorConfig {
    onConnectionError?: (error: Error) => void;
    onAuthError?: () => void;
    onDisconnect?: () => void;
    maxRetries?: number;
}

export function useWebSocketError(
    provider: WebsocketProvider | null,
    config: WebSocketErrorConfig = {}
) {
    useEffect(() => {
        if (!provider) return;

        const handleConnectionError = (error: Error) => {
            console.error('WebSocket connection error:', error);
            config.onConnectionError?.(error);
        };

        const handleAuthError = () => {
            console.error('WebSocket authentication failed');
            config.onAuthError?.();
        };

        const handleDisconnect = () => {
            console.log('WebSocket disconnected');
            config.onDisconnect?.();
        };

        provider.on('connection-error', handleConnectionError);
        provider.on('auth-failed', handleAuthError);
        provider.on('connection-close', handleDisconnect);

        return () => {
            provider.off('connection-error', handleConnectionError);
            provider.off('auth-failed', handleAuthError);
            provider.off('connection-close', handleDisconnect);
        };
    }, [provider, config]);
}
```

### 同步错误

```typescript
// lib/yjs/error-handling.ts
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

export function setupSyncErrorHandling(ydoc: Y.Doc, provider: WebsocketProvider) {
    // 监听更新错误
    ydoc.on('update', (update: Uint8Array, origin: unknown) => {
        try {
            // 验证更新
            if (!isValidUpdate(update)) {
                console.error('Invalid Yjs update received');
                return;
            }
        } catch (error) {
            console.error('Error processing update:', error);
            // 尝试恢复
            attemptRecovery(ydoc, provider);
        }
    });

    // 监听同步错误
    provider.on('sync-error', (error: Error) => {
        console.error('Sync error:', error);
        // 重新同步
        provider.disconnect();
        setTimeout(() => provider.connect(), 1000);
    });
}

function isValidUpdate(update: Uint8Array): boolean {
    // 基本验证
    if (!update || update.length === 0) {
        return false;
    }
    return true;
}

async function attemptRecovery(ydoc: Y.Doc, provider: WebsocketProvider): Promise<void> {
    // 尝试从 IndexedDB 恢复
    const localData = await loadFromIndexedDB();

    if (localData) {
        Y.applyUpdate(ydoc, localData);
    }

    // 重新连接同步
    provider.disconnect();
    provider.connect();
}
```

## 错误展示组件

### Toast 通知

```tsx
// components/common/error-toast.tsx
import { toast } from 'sonner';
import { ApiError, ErrorCodes } from '@/types/api';

export function showErrorToast(error: ApiError): void {
    const title = getErrorTitle(error.code);
    const description = error.message;

    toast.error(title, {
        description,
        action:
            error.code === ErrorCodes.UNAUTHORIZED
                ? {
                      label: 'Login',
                      onClick: () => (window.location.href = '/login'),
                  }
                : undefined,
    });
}

function getErrorTitle(code: string): string {
    const titles: Record<string, string> = {
        [ErrorCodes.UNAUTHORIZED]: 'Authentication Required',
        [ErrorCodes.TOKEN_EXPIRED]: 'Session Expired',
        [ErrorCodes.FORBIDDEN]: 'Access Denied',
        [ErrorCodes.NOT_FOUND]: 'Not Found',
        [ErrorCodes.VALIDATION_ERROR]: 'Validation Error',
        [ErrorCodes.INTERNAL_ERROR]: 'Server Error',
        [ErrorCodes.SERVICE_UNAVAILABLE]: 'Service Unavailable',
    };

    return titles[code] || 'Error';
}
```

### 内联错误提示

```tsx
// components/common/inline-error.tsx
import { AlertCircle } from 'lucide-react';

interface InlineErrorProps {
    message: string;
    onRetry?: () => void;
}

export function InlineError({ message, onRetry }: InlineErrorProps) {
    return (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 flex-1">{message}</p>
            {onRetry && (
                <Button size="sm" variant="outline" onClick={onRetry}>
                    Retry
                </Button>
            )}
        </div>
    );
}
```

## 错误监控

### 错误上报

```typescript
// lib/monitoring/error-reporter.ts
interface ErrorReport {
    message: string;
    stack?: string;
    componentStack?: string;
    url: string;
    timestamp: number;
    userAgent: string;
    userId?: string;
    metadata?: Record<string, unknown>;
}

export function reportError(
    error: Error,
    errorInfo?: React.ErrorInfo,
    metadata?: Record<string, unknown>
): void {
    const report: ErrorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo?.componentStack,
        url: window.location.href,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        userId: getCurrentUserId(),
        metadata,
    };

    // 发送到监控服务
    sendToMonitoringService(report);

    // 本地存储（离线时）
    if (!navigator.onLine) {
        storeErrorForLater(report);
    }
}

async function sendToMonitoringService(report: ErrorReport): Promise<void> {
    try {
        await fetch('/api/errors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(report),
        });
    } catch (error) {
        console.error('Failed to report error:', error);
    }
}
```

## 相关文档

- [性能优化策略](./performance.md)
- [安全最佳实践](../02-security/security-best-practices.md)
- [监控与日志](../06-deployment/monitoring.md)
