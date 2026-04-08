'use client';

import Link from 'next/link';
import { AuthInitializer } from '@/components/common/auth-initializer';
import { AuthGuard } from '@/components/common/auth-guard';
import { useAuthStore } from '@/stores/auth.store';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const user = useAuthStore((s) => s.user);
    const { logout } = useAuth();

    return (
        <AuthInitializer>
            <AuthGuard>
                <div className="min-h-screen flex flex-col bg-background text-foreground">
                    <header className="bg-card border-b border-border">
                        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                            <Link href="/documents" className="text-xl font-bold text-primary">
                                Collab Editor
                            </Link>
                            <nav className="flex items-center gap-4">
                                <Link
                                    href="/documents"
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    文档
                                </Link>
                                <Link
                                    href="/settings"
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    设置
                                </Link>
                                <span className="text-sm text-muted-foreground">
                                    {user?.nickname || user?.username}
                                </span>
                                <Button variant="ghost" size="sm" onClick={() => void logout()}>
                                    登出
                                </Button>
                            </nav>
                        </div>
                    </header>
                    <main className="flex-1 bg-secondary">{children}</main>
                </div>
            </AuthGuard>
        </AuthInitializer>
    );
}
