import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
    sidebarCollapsed: boolean;
    setSidebarCollapsed: (collapsed: boolean) => void;
    toggleSidebar: () => void;
}

export const useUIStore = create<UIState>()(
    persist(
        (set) => ({
            sidebarCollapsed: false,
            setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
            toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
        }),
        {
            name: 'ui-storage',
            partialize: (state) => ({
                sidebarCollapsed: state.sidebarCollapsed,
            }),
        }
    )
);
