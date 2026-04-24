'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth.store';
import { authApi } from '@/lib/api/auth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
    const user = useAuthStore((s) => s.user);
    const setUser = useAuthStore((s) => s.setUser);
    const [nickname, setNickname] = useState(user?.nickname ?? '');
    const [avatar, setAvatar] = useState(user?.avatar ?? '');
    const [isSaving, setIsSaving] = useState(false);
    const [isAvatarBroken, setIsAvatarBroken] = useState(false);

    const avatarFallback = useMemo(() => {
        const displayName = user?.nickname || user?.username || 'U';
        return displayName.charAt(0).toUpperCase();
    }, [user?.nickname, user?.username]);

    const hasChanges = nickname !== (user?.nickname ?? '') || avatar !== (user?.avatar ?? '');

    async function handleSave() {
        try {
            setIsSaving(true);
            const response = await authApi.updateProfile({
                nickname: nickname.trim(),
                avatar: avatar.trim(),
            });
            setUser(response.data);
            setNickname(response.data.nickname ?? '');
            setAvatar(response.data.avatar ?? '');
            setIsAvatarBroken(false);
            toast.success('个人资料已更新');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : '保存失败，请稍后重试');
        } finally {
            setIsSaving(false);
        }
    }

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
                            <Input
                                value={nickname}
                                onChange={(event) => setNickname(event.target.value)}
                                placeholder="输入昵称"
                                maxLength={50}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>头像 URL</Label>
                            <Input
                                value={avatar}
                                onChange={(event) => {
                                    setAvatar(event.target.value);
                                    setIsAvatarBroken(false);
                                }}
                                placeholder="https://example.com/avatar.png"
                                maxLength={500}
                            />
                            <div className="pt-2">
                                <p className="text-xs text-muted-foreground mb-2">头像预览</p>
                                {avatar.trim().length > 0 && !isAvatarBroken ? (
                                    <img
                                        src={avatar}
                                        alt="头像预览"
                                        className="h-14 w-14 rounded-full border border-border object-cover"
                                        onError={() => setIsAvatarBroken(true)}
                                    />
                                ) : (
                                    <div className="h-14 w-14 rounded-full border border-border bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
                                        {avatarFallback}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <Button disabled={!hasChanges || isSaving} onClick={() => void handleSave()}>
                        {isSaving ? '保存中...' : '保存个人信息'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
