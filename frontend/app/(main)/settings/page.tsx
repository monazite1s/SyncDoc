'use client';

import { useAuthStore } from '@/stores/auth.store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SettingsPage() {
    const user = useAuthStore((s) => s.user);

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-8 text-foreground">设置</h1>
            <div className="bg-card rounded-lg border border-border p-6 space-y-6">
                <div>
                    <h2 className="text-lg font-medium mb-4 text-foreground">个人信息</h2>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>用户名</Label>
                            <Input value={user?.username ?? ''} disabled />
                        </div>
                        <div className="space-y-2">
                            <Label>邮箱</Label>
                            <Input value={user?.email ?? ''} disabled />
                        </div>
                        <div className="space-y-2">
                            <Label>昵称</Label>
                            <Input value={user?.nickname ?? '未设置'} disabled />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
