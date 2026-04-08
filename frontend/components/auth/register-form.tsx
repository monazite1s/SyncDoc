'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
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
import { useAuth } from '@/hooks/use-auth';

export function RegisterForm() {
    const { register: registerUser, isLoading, error } = useAuth();

    const form = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
        defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
    });

    const handleFormSubmit = form.handleSubmit((values) => {
        const { confirmPassword: _, ...credentials } = values;
        void registerUser(credentials);
    });

    return (
        <div className="bg-card p-8 rounded-lg shadow-md border border-border">
            <h1 className="text-2xl font-bold text-center mb-6 text-foreground">注册</h1>

            {error && (
                <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    {error}
                </div>
            )}

            <Form {...form}>
                <form onSubmit={(e) => void handleFormSubmit(e)} className="space-y-4">
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
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? '注册中...' : '注册'}
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
