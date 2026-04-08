import { z } from 'zod';

// 登录表单验证 schema
export const loginSchema = z.object({
    email: z.string().min(1, '请输入邮箱').email('邮箱格式不正确'),
    password: z.string().min(1, '请输入密码'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// 注册表单验证 schema
export const registerSchema = z
    .object({
        username: z
            .string()
            .min(2, '用户名至少 2 个字符')
            .max(20, '用户名最多 20 个字符')
            .regex(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/, '用户名只能包含字母、数字、下划线和中文'),
        email: z.string().min(1, '请输入邮箱').email('邮箱格式不正确'),
        password: z.string().min(8, '密码至少 8 个字符').max(32, '密码最多 32 个字符'),
        confirmPassword: z.string().min(1, '请确认密码'),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: '两次密码不一致',
        path: ['confirmPassword'],
    });

export type RegisterFormData = z.infer<typeof registerSchema>;
