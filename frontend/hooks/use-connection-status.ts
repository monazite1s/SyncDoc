'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface ConnectionState {
    status: ConnectionStatus;
    isOffline: boolean;
    wasOffline: boolean;
    retryCount: number;
    dismissWasOffline: () => void;
}

/**
 * 连接状态 hook — 封装 navigator.onLine 和重连计数
 * 将此 hook 与 EditorContext 的 connectionStatus 配合使用
 */
export function useConnectionStatus(connectionStatus: ConnectionStatus): ConnectionState {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [wasOffline, setWasOffline] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const prevStatusRef = useRef<ConnectionStatus>(connectionStatus);

    // 监听浏览器网络状态
    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
        };
        const handleOffline = () => {
            setIsOffline(true);
            setWasOffline(true);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // 追踪连接状态变化，检测重连
    useEffect(() => {
        const prev = prevStatusRef.current;

        // 断开 → 进入重连
        if (prev === 'connected' && connectionStatus === 'disconnected') {
            setWasOffline(true);
            setRetryCount(0);
        }

        // 重连中递增计数
        if (connectionStatus === 'reconnecting') {
            setRetryCount((c) => c + 1);
        }

        // 重新连接成功
        if (prev !== 'connected' && connectionStatus === 'connected') {
            // wasOffline 保留，由 dismissWasOffline 手动清除
        }

        prevStatusRef.current = connectionStatus;
    }, [connectionStatus]);

    // 断网时也标记 wasOffline
    useEffect(() => {
        if (isOffline) {
            setWasOffline(true);
        }
    }, [isOffline]);

    const dismissWasOffline = useCallback(() => {
        setWasOffline(false);
    }, []);

    return {
        status: connectionStatus,
        isOffline:
            isOffline || connectionStatus === 'disconnected' || connectionStatus === 'reconnecting',
        wasOffline,
        retryCount,
        dismissWasOffline,
    };
}
