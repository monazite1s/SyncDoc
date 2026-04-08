import axios from 'axios';
import type { ApiResponse } from '@collab/types';

const axiosInstance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // 自动发送 HttpOnly cookie
});

// 刷新锁：防止并发 401 触发多次 refresh
let refreshPromise: Promise<unknown> | null = null;

// 响应拦截器：只处理 401 自动刷新，不做 success response unwrap
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // 401 且未重试过 → 尝试刷新 token
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // 所有并发请求共享同一个 refresh Promise
                if (!refreshPromise) {
                    refreshPromise = axios
                        .post(
                            `${axiosInstance.defaults.baseURL}/auth/refresh`,
                            {},
                            { withCredentials: true }
                        )
                        .finally(() => {
                            refreshPromise = null;
                        });
                }
                await refreshPromise;

                // 刷新成功，重试原始请求（新 cookie 已自动设置）
                return axiosInstance(originalRequest);
            } catch {
                // 刷新失败，清除认证状态
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('auth-storage');
                    window.location.href = '/login';
                }
            }
        }

        return Promise.reject(error.response?.data || error);
    }
);

/**
 * 类型安全的 API 方法
 *
 * 解包 AxiosResponse 层，返回后端 TransformInterceptor 包装的 ApiResponse<T>。
 * 后端统一返回 { success, data, timestamp }，泛型 T 是 data 字段的类型。
 * 类型来自 @collab/types，前后端共享，无需额外声明。
 */
export const api = {
    get: <T>(url: string) => axiosInstance.get<ApiResponse<T>>(url).then((res) => res.data),

    post: <T>(url: string, data?: unknown) =>
        axiosInstance.post<ApiResponse<T>>(url, data).then((res) => res.data),

    put: <T>(url: string, data?: unknown) =>
        axiosInstance.put<ApiResponse<T>>(url, data).then((res) => res.data),

    delete: <T>(url: string) => axiosInstance.delete<ApiResponse<T>>(url).then((res) => res.data),
};

export default axiosInstance;
