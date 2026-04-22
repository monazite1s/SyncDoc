'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { registerSchema, type RegisterFormData } from '@/lib/validations/auth';
import { useAuth, getErrorMessage } from '@/hooks/use-auth';

export function RegisterForm() {
    const { register: registerUser } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
        defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
        mode: 'onChange', // 实时验证
    });

    const onSubmit = async (values: RegisterFormData) => {
        setIsSubmitting(true);
        try {
            // 移除 confirmPassword，只发送需要的字段
            const { confirmPassword: _, ...credentials } = values;
            await registerUser(credentials);
            toast.success('注册成功');
        } catch (error) {
            const message = getErrorMessage(error);
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-card p-8 rounded-lg shadow-md border border-border">
            <h1 className="text-2xl font-bold text-center mb-6 text-foreground">注册</h1>

            <Form {...form}>
                <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>用户名</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="字母、数字、下划线或中文"
                                        autoComplete="username"
                                        disabled={isSubmitting}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>邮箱</FormLabel>
                                <FormControl>
                                    <Input
                                        type="email"
                                        placeholder="请输入邮箱"
                                        autoComplete="email"
                                        disabled={isSubmitting}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>密码</FormLabel>
                                <FormControl>
                                    <Input
                                        type="password"
                                        placeholder="至少 8 个字符"
                                        autoComplete="new-password"
                                        disabled={isSubmitting}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>确认密码</FormLabel>
                                <FormControl>
                                    <Input
                                        type="password"
                                        placeholder="再次输入密码"
                                        autoComplete="new-password"
                                        disabled={isSubmitting}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSubmitting ? '注册中...' : '注册'}
                    </Button>
                </form>
            </Form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
                已有账号？{' '}
                <Link href="/login" className="text-primary hover:underline">
                    登录
                </Link>
            </p>
        </div>
    );
}
