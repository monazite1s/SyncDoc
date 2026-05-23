'use client';

import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Camera, Pencil, Save, X } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { authApi } from '@/lib/api/auth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:3001';

/** 兼容 ApiError 对象（plain object）和 Error 实例两种 catch 值 */
function resolveErrorMessage(error: unknown, fallback: string): string {
    if (error && typeof error === 'object') {
        const msg = (error as Record<string, unknown>).message;
        if (typeof msg === 'string' && msg) return msg;
        if (Array.isArray(msg) && msg.length > 0) return (msg as string[]).join('；');
    }
    if (error instanceof Error) return error.message;
    return fallback;
}

function resolveAvatarUrl(avatar: string | null | undefined): string | null {
    if (!avatar) return null;
    if (avatar.startsWith('http://') || avatar.startsWith('https://')) return avatar;
    return `${API_BASE}${avatar}`;
}

// ─── 字段展示行（查看模式）───────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value?: string | null }) {
    return (
        <div className="flex flex-col gap-0.5 py-2">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-sm text-foreground">{value?.trim() || '未填写'}</span>
        </div>
    );
}

// ─── 主组件 ──────────────────────────────────────────────────────────────────
export function SettingsForm() {
    const user = useAuthStore((s) => s.user);
    const setUser = useAuthStore((s) => s.setUser);

    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [avatarBroken, setAvatarBroken] = useState(false);

    // 编辑态草稿
    const [nickname, setNickname] = useState('');
    const [bio, setBio] = useState('');
    const [phone, setPhone] = useState('');
    const [website, setWebsite] = useState('');
    const [location, setLocation] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const avatarFallback = useMemo(() => {
        const name = user?.nickname || user?.username || 'U';
        return name.charAt(0).toUpperCase();
    }, [user?.nickname, user?.username]);

    const resolvedAvatar = resolveAvatarUrl(user?.avatar);

    // 进入编辑模式时，将 store 数据同步到草稿
    function enterEditing() {
        setNickname(user?.nickname ?? '');
        setBio(user?.bio ?? '');
        setPhone(user?.phone ?? '');
        setWebsite(user?.website ?? '');
        setLocation(user?.location ?? '');
        setIsEditing(true);
    }

    function cancelEditing() {
        setIsEditing(false);
    }

    // 头像文件选择后立即上传
    async function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploadingAvatar(true);
            const response = await authApi.uploadAvatar(file);
            setUser(response.data);
            setAvatarBroken(false);
            toast.success('头像已更新');
        } catch (error) {
            toast.error(resolveErrorMessage(error, '头像上传失败，请重试'));
        } finally {
            setIsUploadingAvatar(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }

    async function handleSave() {
        try {
            setIsSaving(true);
            const response = await authApi.updateProfile({
                nickname: nickname.trim(),
                bio: bio.trim(),
                phone: phone.trim(),
                website: website.trim(),
                location: location.trim(),
            });
            setUser(response.data);
            setIsEditing(false);
            toast.success('个人资料已保存');
        } catch (error) {
            toast.error(resolveErrorMessage(error, '保存失败，请稍后重试'));
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="space-y-6">
            {/* ── 头像区域 ── */}
            <div className="flex items-center gap-4">
                <div className="relative group">
                    {resolvedAvatar && !avatarBroken ? (
                        <img
                            src={resolvedAvatar}
                            alt="用户头像"
                            className="h-20 w-20 rounded-full border border-border object-cover"
                            onError={() => setAvatarBroken(true)}
                        />
                    ) : (
                        <div className="h-20 w-20 rounded-full border border-border bg-muted flex items-center justify-center text-xl font-semibold text-muted-foreground select-none">
                            {avatarFallback}
                        </div>
                    )}

                    {/* 编辑模式：悬浮上传遮罩 */}
                    {isEditing && (
                        <button
                            type="button"
                            disabled={isUploadingAvatar}
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute inset-0 rounded-full flex flex-col items-center justify-center gap-0.5 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
                        >
                            {isUploadingAvatar ? (
                                <span className="text-[10px]">上传中...</span>
                            ) : (
                                <>
                                    <Camera className="h-5 w-5" />
                                    <span className="text-[10px]">更换头像</span>
                                </>
                            )}
                        </button>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => void handleAvatarFileChange(e)}
                    />
                </div>

                <div>
                    <p className="font-medium text-foreground">
                        {user?.nickname || user?.username}
                    </p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                    {isEditing && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                            点击头像可更换图片（JPG / PNG / WebP，最大 5MB）
                        </p>
                    )}
                </div>
            </div>

            <Separator />

            {/* ── 基本信息 ── */}
            <div>
                <h2 className="text-sm font-medium text-foreground mb-3">基本信息</h2>

                {isEditing ? (
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="username">用户名</Label>
                            <Input id="username" value={user?.username ?? ''} disabled />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="email">邮箱</Label>
                            <Input id="email" value={user?.email ?? ''} disabled />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="nickname">昵称</Label>
                            <Input
                                id="nickname"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                placeholder="输入昵称"
                                maxLength={50}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="bio">个人简介</Label>
                            <Textarea
                                id="bio"
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                placeholder="介绍一下自己..."
                                maxLength={300}
                                rows={3}
                                className="resize-none"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        <InfoRow label="用户名" value={user?.username} />
                        <InfoRow label="邮箱" value={user?.email} />
                        <InfoRow label="昵称" value={user?.nickname} />
                        <InfoRow label="个人简介" value={user?.bio} />
                    </div>
                )}
            </div>

            <Separator />

            {/* ── 联系方式 ── */}
            <div>
                <h2 className="text-sm font-medium text-foreground mb-3">联系方式</h2>

                {isEditing ? (
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="phone">手机号</Label>
                            <Input
                                id="phone"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="输入手机号"
                                maxLength={20}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="website">个人网站</Label>
                            <Input
                                id="website"
                                value={website}
                                onChange={(e) => setWebsite(e.target.value)}
                                placeholder="https://example.com"
                                maxLength={200}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="location">所在地</Label>
                            <Input
                                id="location"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="城市 / 省份"
                                maxLength={100}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        <InfoRow label="手机号" value={user?.phone} />
                        <InfoRow label="个人网站" value={user?.website} />
                        <InfoRow label="所在地" value={user?.location} />
                    </div>
                )}
            </div>

            {/* ── 操作按钮（右下角）── */}
            <div className="flex justify-end gap-2 pt-2">
                {isEditing ? (
                    <>
                        <Button variant="outline" onClick={cancelEditing} disabled={isSaving}>
                            <X className="h-4 w-4 mr-1.5" />
                            取消
                        </Button>
                        <Button onClick={() => void handleSave()} disabled={isSaving}>
                            <Save className="h-4 w-4 mr-1.5" />
                            {isSaving ? '保存中...' : '保存信息'}
                        </Button>
                    </>
                ) : (
                    <Button onClick={enterEditing}>
                        <Pencil className="h-4 w-4 mr-1.5" />
                        编辑信息
                    </Button>
                )}
            </div>
        </div>
    );
}
