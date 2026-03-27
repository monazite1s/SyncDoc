'use client';

import Link from 'next/link';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/documents" className="text-xl font-bold text-primary-600">
            Collab Editor
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/documents" className="text-gray-600 hover:text-gray-900">
              Documents
            </Link>
            <Link href="/settings" className="text-gray-600 hover:text-gray-900">
              Settings
            </Link>
            <button className="text-gray-600 hover:text-gray-900">
              Logout
            </button>
          </nav>
        </div>
      </header>
      <main className="flex-1 bg-gray-50">{children}</main>
    </div>
  );
}
