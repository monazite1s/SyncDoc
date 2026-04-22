'use client';

import { AuthInitializer } from '@/components/common/auth-initializer';
import { AuthGuard } from '@/components/common/auth-guard';

export default function EditorLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthInitializer>
            <AuthGuard>
                <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
                    {children}
                </div>
            </AuthGuard>
        </AuthInitializer>
    );
}
