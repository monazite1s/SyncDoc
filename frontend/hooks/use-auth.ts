'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { authApi } from '@/lib/api/auth';
import type { LoginCredentials, RegisterCredentials } from '@collab/types';

interface UseAuthReturn {
    /** 登录 */
    login: (credentials: LoginCredentials) => Promise<void>;
    /** 注册 */
    register: (credentials: RegisterCredentials) => Promise<void>;
    /** 登出 */
    logout: () => Promise<void>;
    /** 是否正在执行认证操作 */
    isLoading: boolean;
    /** 表单级错误信息 */
    error: string | null;
}

// 后端错误消息映射
const ERROR_MESSAGES: Record<string, string> = {
    该邮箱已被注册: '该邮箱已被注册',
    该用户名已被使用: '该用户名已被使用',
    邮箱或密码错误: '邮箱或密码错误',
    '账号已被禁用，请联系管理员': '账号已被禁用',
};

function getErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'message' in error) {
        const msg = (error as { message: string }).message;
        return ERROR_MESSAGES[msg] ?? '操作失败，请稍后重试';
    }
    return '网络错误，请检查网络连接';
}

export function useAuth(): UseAuthReturn {
    const router = useRouter();
    const setUser = useAuthStore((s) => s.setUser);
    const clearAuth = useAuthStore((s) => s.logout);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const login = useCallback(
        async (credentials: LoginCredentials) => {
            setIsLoading(true);
            setError(null);
            try {
                // api.post<T> 返回 ApiResponse<T>，即 { success, data: T, timestamp }
                const response = await authApi.login(credentials);
                setUser(response.data.user);
                router.push('/documents');
            } catch (err) {
                setError(getErrorMessage(err));
            } finally {
                setIsLoading(false);
            }
        },
        [setUser, router]
    );

    const register = useCallback(
        async (credentials: RegisterCredentials) => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await authApi.register(credentials);
                setUser(response.data.user);
                router.push('/documents');
            } catch (err) {
                setError(getErrorMessage(err));
            } finally {
                setIsLoading(false);
            }
        },
        [setUser, router]
    );

    const logout = useCallback(async () => {
        try {
            await authApi.logout();
        } catch {
            // 登出 API 失败也清除本地状态
        } finally {
            clearAuth();
            router.push('/login');
        }
    }, [clearAuth, router]);

    return { login, register, logout, isLoading, error };
}
