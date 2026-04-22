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
import { loginSchema, type LoginFormData } from '@/lib/validations/auth';
import { useAuth, getErrorMessage } from '@/hooks/use-auth';

export function LoginForm() {
    const { login } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' },
        mode: 'onChange', // 实时验证
    });

    const onSubmit = async (values: LoginFormData) => {
        setIsSubmitting(true);
        try {
            await login(values);
            toast.success('登录成功');
        } catch (error) {
            const message = getErrorMessage(error);
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-card p-8 rounded-lg shadow-md border border-border">
            <h1 className="text-2xl font-bold text-center mb-6 text-foreground">登录</h1>

            <Form {...form}>
                <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-4">
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
                                        placeholder="请输入密码"
                                        autoComplete="current-password"
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
                        {isSubmitting ? '登录中...' : '登录'}
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
