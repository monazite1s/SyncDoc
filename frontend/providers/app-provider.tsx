'use client';

import { ReactNode } from 'react';

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  // TODO: Add providers as needed
  // - QueryClientProvider (React Query)
  // - SessionProvider (NextAuth)
  // - ThemeProvider

  return <>{children}</>;
}
