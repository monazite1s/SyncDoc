'use client';

import { Wifi, WifiOff, Loader2, Eye, Users } from 'lucide-react';
import { useEditorContext } from './editor-provider';
import { cn } from '@/lib/utils';

interface EditorStatusBarProps {
    isReadonly: boolean;
}

export function EditorStatusBar({ isReadonly }: EditorStatusBarProps) {
    const { editor, connectionStatus, isSynced, provider } = useEditorContext();

    // 在线人数
    const onlineCount = provider?.awareness?.getStates().size ?? 0;

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
                />
            </div>

            <div className="flex-1" />

            {/* 中间：在线人数 */}
            {onlineCount > 0 && (
                <div className="flex items-center gap-1 mr-4">
                    <Users className="h-3 w-3" />
                    <span>{onlineCount} 人在线</span>
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
    status: 'connecting' | 'connected' | 'disconnected';
    isSynced: boolean;
    isReadonly: boolean;
}

function ConnectionIndicator({ status, isSynced, isReadonly }: ConnectionIndicatorProps) {
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

    if (status === 'disconnected') {
        return (
            <>
                <WifiOff className={cn('h-3 w-3', 'text-destructive')} />
                <span className="text-destructive">连接断开</span>
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
