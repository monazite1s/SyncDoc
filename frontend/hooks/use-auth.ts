'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { authApi } from '@/lib/api/auth';
import type { LoginCredentials, RegisterCredentials, ApiError } from '@collab/types';

interface UseAuthReturn {
    /** 登录 */
    login: (credentials: LoginCredentials) => Promise<void>;
    /** 注册 */
    register: (credentials: RegisterCredentials) => Promise<void>;
    /** 登出 */
    logout: () => Promise<void>;
}

/**
 * 从 ApiError 中提取用户友好的错误消息
 * client.ts 已将所有错误统一为 ApiError 类型
 */
export function getErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'message' in error) {
        return (error as ApiError).message;
    }
    return '网络错误，请稍后重试';
}

export function useAuth(): UseAuthReturn {
    const router = useRouter();
    const setUser = useAuthStore((s) => s.setUser);
    const clearAuth = useAuthStore((s) => s.logout);

    const login = useCallback(
        async (credentials: LoginCredentials) => {
            const response = await authApi.login(credentials);
            setUser(response.data.user);
            router.push('/documents');
        },
        [setUser, router]
    );

    const register = useCallback(
        async (credentials: RegisterCredentials) => {
            const response = await authApi.register(credentials);
            setUser(response.data.user);
            router.push('/documents');
        },
        [setUser, router]
    );

    const logout = useCallback(async () => {
        try {
            await authApi.logout();
        } finally {
            clearAuth();
            router.push('/login');
        }
    }, [clearAuth, router]);

    return { login, register, logout };
}
