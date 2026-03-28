import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '@/stores/auth.store';
import { UserStatus } from '@collab/types';
import type { User } from '@collab/types';

// mock 用户数据
const mockUser: User = {
    id: 'test-user-id',
    email: 'test@example.com',
    username: 'testuser',
    nickname: 'Test User',
    status: UserStatus.ACTIVE,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
};

describe('useAuthStore', () => {
    beforeEach(() => {
        // 每次测试前重置 store 状态
        useAuthStore.setState({
            user: null,
            isAuthenticated: false,
        });
    });

    it('初始状态应为未认证', () => {
        const state = useAuthStore.getState();
        expect(state.user).toBeNull();
        expect(state.isAuthenticated).toBe(false);
    });

    it('setUser 应设置用户并标记为已认证', () => {
        useAuthStore.getState().setUser(mockUser);
        const state = useAuthStore.getState();
        expect(state.user).toEqual(mockUser);
        expect(state.isAuthenticated).toBe(true);
    });

    it('setUser(null) 应清除用户并标记为未认证', () => {
        useAuthStore.getState().setUser(mockUser);
        useAuthStore.getState().setUser(null);
        const state = useAuthStore.getState();
        expect(state.user).toBeNull();
        expect(state.isAuthenticated).toBe(false);
    });

    it('logout 应清除所有状态', () => {
        useAuthStore.getState().setUser(mockUser);
        useAuthStore.getState().logout();
        const state = useAuthStore.getState();
        expect(state.user).toBeNull();
        expect(state.isAuthenticated).toBe(false);
    });
});
