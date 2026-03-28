'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from './theme-provider';

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
