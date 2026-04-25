'use client';

import { useEffect, useState } from 'react';
import type { HocuspocusProvider } from '@hocuspocus/provider';

interface RemotePresence {
    clientId: number;
    name: string;
    isTyping: boolean;
}

/**
 * 感知状态 hook — 检测远程协作者的输入状态
 * 通过 Awareness 协议读取 isTyping 字段
 */
export function usePresence(
    provider: HocuspocusProvider | null,
    currentUserId: string
): {
    remoteUsers: RemotePresence[];
    typingUsers: string[];
} {
    const [remoteUsers, setRemoteUsers] = useState<RemotePresence[]>([]);

    useEffect(() => {
        if (!provider?.awareness) return;

        const awareness = provider.awareness;

        const updatePresence = () => {
            const states = awareness.getStates();
            const users: RemotePresence[] = [];

            states.forEach((state, clientId) => {
                if (clientId === awareness.clientID) return;
                users.push({
                    clientId,
                    name: state.user?.name ?? '匿名用户',
                    isTyping: state.isTyping ?? false,
                });
            });

            setRemoteUsers(users);
        };

        // 监听 awareness 变化
        awareness.on('change', updatePresence);
        updatePresence();

        return () => {
            awareness.off('change', updatePresence);
        };
    }, [provider, currentUserId]);

    const typingUsers = remoteUsers.filter((u) => u.isTyping).map((u) => u.name);

    return { remoteUsers, typingUsers };
}
