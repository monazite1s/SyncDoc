import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@collab/types';

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    /** 会话验证中（应用启动时） */
    isInitializing: boolean;
    setUser: (user: User | null) => void;
    setInitializing: (loading: boolean) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            isInitializing: true,
            setUser: (user) => set({ user, isAuthenticated: !!user }),
            setInitializing: (isInitializing) => set({ isInitializing }),
            logout: () => set({ user: null, isAuthenticated: false, isInitializing: false }),
        }),
        {
            name: 'auth-storage',
            // isInitializing 不持久化，每次启动默认 true
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);
