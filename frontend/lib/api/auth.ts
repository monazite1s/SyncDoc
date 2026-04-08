import { api } from './client';
import type { AuthResponse, LoginCredentials, RegisterCredentials, User } from '@collab/types';

export const authApi = {
    // 注册
    register: (credentials: RegisterCredentials) =>
        api.post<AuthResponse>('/auth/register', credentials),

    // 登录
    login: (credentials: LoginCredentials) => api.post<AuthResponse>('/auth/login', credentials),

    // 登出
    logout: () => api.post<void>('/auth/logout'),

    // 刷新 token — refresh_token 通过 HttpOnly cookie 自动携带，无需传参
    refresh: () => api.post<AuthResponse>('/auth/refresh', {}),

    // 获取当前用户
    me: () => api.get<User>('/auth/me'),
};
