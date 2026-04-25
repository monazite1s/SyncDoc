'use client';

import { Wifi, WifiOff, Loader2, Eye, Users, RefreshCw } from 'lucide-react';
import { useEditorContext } from './editor-provider';
import type { ConnectionStatus } from './editor-provider';
import { Button } from '@/components/ui/button';
import { usePresence } from '@/hooks/use-presence';
import { useAuthStore } from '@/stores/auth.store';

interface EditorStatusBarProps {
    isReadonly: boolean;
}

export function EditorStatusBar({ isReadonly }: EditorStatusBarProps) {
    const { editor, connectionStatus, isSynced, provider, reconnect } = useEditorContext();
    const user = useAuthStore((s) => s.user);

    // 在线人数
    const onlineCount = provider?.awareness?.getStates().size ?? 0;

    // 输入状态感知
    const { typingUsers } = usePresence(provider, user?.id ?? '');

    // 字数统计
    const wordCount = editor?.storage.characterCount?.words?.() ?? 0;
    const charCount = editor?.storage.characterCount?.characters?.() ?? 0;

    return (
        <footer className="h-8 border-t border-border bg-card flex items-center px-4 text-xs text-muted-foreground flex-shrink-0">
            {/* 左侧：连接/保存状态 */}
            <div className="flex items-center gap-1.5">
                <ConnectionIndicator
                    status={connectionStatus}
                    isSynced={isSynced}
                    isReadonly={isReadonly}
                    reconnect={reconnect}
                />
            </div>

            <div className="flex-1" />

            {/* 中间：在线人数和输入状态 */}
            {onlineCount > 0 && (
                <div className="flex items-center gap-1 mr-4">
                    <Users className="h-3 w-3" />
                    <span>{onlineCount} 人在线</span>
                    {typingUsers.length > 0 && (
                        <span className="text-primary ml-1">
                            {typingUsers.join('、')} 正在输入...
                        </span>
                    )}
                </div>
            )}

            {/* 右侧：字数统计 */}
            {editor && (
                <div className="flex items-center gap-1">
                    <span>{wordCount} 词</span>
                    <span className="opacity-40">·</span>
                    <span>{charCount} 字符</span>
                </div>
            )}
        </footer>
    );
}

interface ConnectionIndicatorProps {
    status: ConnectionStatus;
    isSynced: boolean;
    isReadonly: boolean;
    reconnect: () => void;
}

function ConnectionIndicator({
    status,
    isSynced,
    isReadonly,
    reconnect,
}: ConnectionIndicatorProps) {
    if (isReadonly) {
        return (
            <>
                <Eye className="h-3 w-3" />
                <span>只读模式</span>
            </>
        );
    }

    if (status === 'connecting') {
        return (
            <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>连接中...</span>
            </>
        );
    }

    if (status === 'reconnecting') {
        return (
            <>
                <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
                <span className="text-amber-600 dark:text-amber-400">重新连接中...</span>
                <Button
                    variant="ghost"
                    size="sm"
                    className="ml-1 h-5 px-1.5 text-[10px]"
                    onClick={reconnect}
                >
                    <RefreshCw className="h-2.5 w-2.5 mr-0.5" />
                    立即重试
                </Button>
            </>
        );
    }

    if (status === 'disconnected') {
        return (
            <>
                <WifiOff className="h-3 w-3 text-destructive" />
                <span className="text-destructive">连接断开</span>
                <Button
                    variant="ghost"
                    size="sm"
                    className="ml-1 h-5 px-1.5 text-[10px] text-destructive hover:text-destructive"
                    onClick={reconnect}
                >
                    <RefreshCw className="h-2.5 w-2.5 mr-0.5" />
                    重新连接
                </Button>
            </>
        );
    }

    if (!isSynced) {
        return (
            <>
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                <span className="text-primary">同步中...</span>
            </>
        );
    }

    return (
        <>
            <Wifi className="h-3 w-3 text-green-500" />
            <span className="text-green-600 dark:text-green-400">已保存</span>
        </>
    );
}
