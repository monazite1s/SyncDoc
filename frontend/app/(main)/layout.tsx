'use client';

import Link from 'next/link';
import { AuthGuard } from '@/components/common/auth-guard';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
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
                Documents
              </Link>
              <Link
                href="/settings"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Settings
              </Link>
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                Logout
              </button>
            </nav>
          </div>
        </header>
        <main className="flex-1 bg-secondary">{children}</main>
      </div>
    </AuthGuard>
  );
}
