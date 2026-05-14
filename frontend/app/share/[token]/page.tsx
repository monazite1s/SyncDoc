'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, FileText, Lock } from 'lucide-react';
import { shareApi, type ShareAccessResponse } from '@/lib/api/share';
import { base64ToHtml } from '@/lib/editor/yjs-to-html';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ShareAccessPage() {
    const params = useParams();
    const token = params.token as string;
    const [data, setData] = useState<ShareAccessResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [contentHtml, setContentHtml] = useState<string | null>(null);

    useEffect(() => {
        async function fetchShare() {
            try {
                const res = await shareApi.access(token);
                setData(res.data);
            } catch (err) {
                setError(err instanceof Error ? err.message : '链接无效');
            } finally {
                setLoading(false);
            }
        }
        if (token) void fetchShare();
    }, [token]);

    useEffect(() => {
        const doc = data?.document;
        if (doc?.contentBase64) {
            try {
                const html = base64ToHtml(doc.contentBase64 as string);
                setContentHtml(html);
            } catch {
                setContentHtml(null);
            }
        }
    }, [data?.document?.contentBase64]);

    async function handleSubmitPassword() {
        setLoading(true);
        setError(null);
        try {
            const res = await shareApi.access(token, password);
            setData(res.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : '密码错误');
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <FileText className="h-12 w-12 text-muted-foreground" />
                <p className="text-lg text-muted-foreground">{error}</p>
            </div>
        );
    }

    if (!data) return null;

    if (data.requiresPassword) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-gradient-to-br from-background via-background to-muted/40">
                <div className="bg-card p-8 sm:p-10 rounded-xl shadow-sm border border-border w-full max-w-sm">
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                            <Lock className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="text-center">
                            <h1 className="text-lg font-semibold mb-1">需要密码访问</h1>
                            <p className="text-sm text-muted-foreground">
                                文档「{data.documentTitle}」需要密码才能查看
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-6">
                        <Input
                            type="password"
                            placeholder="输入访问密码"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') void handleSubmitPassword();
                            }}
                        />
                        <Button onClick={() => void handleSubmitPassword()}>确认</Button>
                    </div>
                    {error && <p className="text-sm text-destructive mt-3 text-center">{error}</p>}
                </div>
            </div>
        );
    }

    const doc = data.document;
    if (!doc) return null;

    return (
        <div className="max-w-4xl mx-auto px-6 py-10">
            <header className="mb-8">
                <h1 className="text-2xl font-bold">{doc.title}</h1>
                {doc.description && <p className="text-muted-foreground mt-2">{doc.description}</p>}
                <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                        {(doc.author.nickname ?? doc.author.username).charAt(0).toUpperCase()}
                    </div>
                    <span>{doc.author.nickname ?? doc.author.username}</span>
                    <span className="opacity-40">·</span>
                    <span>{doc.role === 'EDITOR' ? '可编辑' : '仅查看'}</span>
                </div>
            </header>
            <div className="prose max-w-none border rounded-xl p-6 sm:p-8 min-h-[300px] bg-card shadow-sm">
                {contentHtml ? (
                    <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
                ) : (
                    <p className="text-muted-foreground">此文档暂无内容</p>
                )}
            </div>
        </div>
    );
}
