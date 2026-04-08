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
import { loginSchema, type LoginFormData } from '@/lib/validations/auth';
import { useAuth } from '@/hooks/use-auth';

export function LoginForm() {
    const { login, isLoading, error } = useAuth();

    const form = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' },
    });

    const handleFormSubmit = form.handleSubmit((values) => {
        void login(values);
    });

    return (
        <div className="bg-card p-8 rounded-lg shadow-md border border-border">
            <h1 className="text-2xl font-bold text-center mb-6 text-foreground">登录</h1>

            {error && (
                <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    {error}
                </div>
            )}

            <Form {...form}>
                <form onSubmit={(e) => void handleFormSubmit(e)} className="space-y-4">
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
                                        placeholder="请输入密码"
                                        autoComplete="current-password"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? '登录中...' : '登录'}
                    </Button>
                </form>
            </Form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
                还没有账号？{' '}
                <Link href="/register" className="text-primary hover:underline">
                    注册
                </Link>
            </p>
        </div>
    );
}
