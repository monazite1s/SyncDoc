'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from './theme-provider';
import { Toaster } from 'sonner';

interface AppProviderProps {
    children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
    return (
        <ThemeProvider>
            {children}
            <Toaster position="top-center" richColors />
        </ThemeProvider>
    );
}
