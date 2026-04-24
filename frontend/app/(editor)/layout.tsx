'use client';

import { AuthInitializer } from '@/components/common/auth-initializer';
import { AuthGuard } from '@/components/common/auth-guard';
import { AppHeader } from '@/components/common/app-header';
import { Sidebar } from '@/components/common/sidebar';

export default function EditorLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthInitializer>
            <AuthGuard>
                <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
                    <AppHeader />
                    <div className="flex flex-1 min-h-0 overflow-hidden">
                        <Sidebar />
                        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                            {children}
                        </div>
                    </div>
                </div>
            </AuthGuard>
        </AuthInitializer>
    );
}
