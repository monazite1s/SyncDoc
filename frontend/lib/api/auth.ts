import { api } from './client';
import type {
    AuthResponse,
    LoginCredentials,
    RegisterCredentials,
    UpdateProfileRequest,
    User,
    WsTokenResponse,
} from '@collab/types';

export const authApi = {
    // 注册
    register: (credentials: RegisterCredentials) =>
        api.post<AuthResponse>('/auth/register', credentials),

    // 登录
    login: (credentials: LoginCredentials) => api.post<AuthResponse>('/auth/login', credentials),

    // 登出
    logout: () => api.post<void>('/auth/logout'),

    // 获取当前用户
    me: () => api.get<User>('/auth/me'),

    // 更新当前用户资料
    updateProfile: (data: UpdateProfileRequest) => api.patch<User>('/auth/profile', data),

    // 获取 WebSocket 认证 token（用于 Hocuspocus 握手）
    getWsToken: () => api.get<WsTokenResponse>('/auth/ws-token'),
};
