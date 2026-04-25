'use client';

import { WifiOff, CloudOff } from 'lucide-react';
import { useEditorContext } from './editor-provider';

/**
 * 离线/断连警告横幅
 * 断网或 WebSocket 断开时显示，重连后自动消失
 */
export function ConnectionBanner() {
    const { connectionStatus } = useEditorContext();

    const isDisconnected =
        connectionStatus === 'disconnected' || connectionStatus === 'reconnecting';

    if (!isDisconnected) return null;

    const isReconnecting = connectionStatus === 'reconnecting';

    return (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-sm flex-shrink-0">
            {isReconnecting ? (
                <CloudOff className="h-4 w-4 flex-shrink-0" />
            ) : (
                <WifiOff className="h-4 w-4 flex-shrink-0" />
            )}
            <span>
                {isReconnecting
                    ? '正在尝试重新连接服务器...'
                    : '网络连接已断开，您的编辑将在本地保存，重新连接后自动同步'}
            </span>
        </div>
    );
}
