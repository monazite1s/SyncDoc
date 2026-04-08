'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { authApi } from '@/lib/api/auth';

/**
 * 会话验证初始化器
 * 调用 /auth/me 验证 cookie 有效性，仅执行一次。
 * 只应在受保护路由的 layout 中使用，不要放在全局 AppProvider 中。
 */
export function AuthInitializer({ children }: { children: React.ReactNode }) {
    const setUser = useAuthStore((s) => s.setUser);
    const storeLogout = useAuthStore((s) => s.logout);
    const setInitializing = useAuthStore((s) => s.setInitializing);
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        async function verifySession() {
            try {
                // api.get<User> 返回 ApiResponse<User>
                const response = await authApi.me();
                setUser(response.data);
            } catch {
                // cookie 无效，清除本地状态
                storeLogout();
            } finally {
                setInitializing(false);
            }
        }

        void verifySession();
    }, [setUser, storeLogout, setInitializing]);

    return <>{children}</>;
}
