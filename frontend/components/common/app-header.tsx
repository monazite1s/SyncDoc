'use client';

import Link from 'next/link';
import { ThemeToggle } from '@/components/common/theme-toggle';
import { useAuthStore } from '@/stores/auth.store';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';

export function AppHeader() {
    const user = useAuthStore((s) => s.user);
    const { logout } = useAuth();

    return (
        <header className="h-14 shrink-0 bg-card border-b border-border">
            <div className="h-full px-4 flex items-center justify-between">
                <Link href="/documents" className="text-lg font-bold text-primary">
                    Collab Editor
                </Link>
                <nav className="flex items-center gap-4">
                    <ThemeToggle />
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
    );
}
