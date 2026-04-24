import axios from 'axios';
import type { ApiResponse, ApiError } from '@collab/types';

const axiosInstance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // 自动发送 HttpOnly cookie
});

/**
 * 类型安全的 API 方法
 *
 * 成功路径：解包 AxiosResponse → ApiResponse<T>，返回 { success, data, timestamp }
 * 错误路径：reject ApiError，调用方可安全访问 error.message
 */
export const api = {
    get: <T>(url: string) =>
        axiosInstance
            .get<ApiResponse<T>>(url)
            .then((res) => res.data)
            .catch((error) => Promise.reject(extractApiError(error))),

    post: <T>(url: string, data?: unknown) =>
        axiosInstance
            .post<ApiResponse<T>>(url, data)
            .then((res) => res.data)
            .catch((error) => Promise.reject(extractApiError(error))),

    put: <T>(url: string, data?: unknown) =>
        axiosInstance
            .put<ApiResponse<T>>(url, data)
            .then((res) => res.data)
            .catch((error) => Promise.reject(extractApiError(error))),

    patch: <T>(url: string, data?: unknown) =>
        axiosInstance
            .patch<ApiResponse<T>>(url, data)
            .then((res) => res.data)
            .catch((error) => Promise.reject(extractApiError(error))),

    delete: <T>(url: string) =>
        axiosInstance
            .delete<ApiResponse<T>>(url)
            .then((res) => res.data)
            .catch((error) => Promise.reject(extractApiError(error))),
};

/**
 * 从 Axios 错误中提取标准 ApiError
 */
function extractApiError(error: unknown): ApiError {
    if (axios.isAxiosError(error) && error.response?.data) {
        return error.response.data as ApiError;
    }

    // 网络 error / 请求未发出
    return {
        success: false,
        statusCode: 0,
        message: error instanceof Error ? error.message : '网络错误，请稍后重试',
        timestamp: new Date().toISOString(),
    };
}

export default axiosInstance;
