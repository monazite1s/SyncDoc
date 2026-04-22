'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Skeleton } from '@/components/ui/skeleton';

interface AuthGuardProps {
    children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const isInitializing = useAuthStore((s) => s.isInitializing);
    const hydrated = typeof window !== 'undefined';
    const router = useRouter();

    useEffect(() => {
        // hydration 完成 + 会话验证完成 + 未认证 → 跳转登录
        if (hydrated && !isInitializing && !isAuthenticated) {
            router.replace('/login');
        }
    }, [hydrated, isInitializing, isAuthenticated, router]);

    // hydration 或会话验证中 → 显示骨架屏
    if (!hydrated || isInitializing) {
        return (
            <div className="min-h-screen flex flex-col bg-background">
                <header className="bg-card border-b border-border">
                    <div className="mx-auto px-4 py-4 flex items-center justify-between">
                        <Skeleton className="h-7 w-32" />
                        <div className="flex gap-4">
                            <Skeleton className="h-5 w-20" />
                            <Skeleton className="h-5 w-16" />
                        </div>
                    </div>
                </header>
                <main className="flex-1 p-8 space-y-4">
                    <Skeleton className="h-8 w-40" />
                    <div className="grid grid-cols-3 gap-4">
                        <Skeleton className="h-40" />
                        <Skeleton className="h-40" />
                        <Skeleton className="h-40" />
                    </div>
                </main>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return <>{children}</>;
}
