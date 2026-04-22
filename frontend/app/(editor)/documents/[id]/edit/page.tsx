'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const EditorPage = dynamic(() => import('@/components/editor/editor-page'), {
    ssr: false,
    loading: () => <EditorLoadingSkeleton />,
});

interface DocumentEditPageProps {
    params: Promise<{ id: string }>;
}

export default function DocumentEditPage({ params }: DocumentEditPageProps) {
    return <EditorPage paramsPromise={params} />;
}

function EditorLoadingSkeleton() {
    return (
        <div className="h-screen flex flex-col bg-background">
            {/* 标题栏骨架 */}
            <div className="h-14 border-b border-border bg-card flex items-center px-4 gap-4 flex-shrink-0">
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-6 w-64" />
                <div className="flex-1" />
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-8 w-8 rounded" />
            </div>
            {/* 工具栏骨架 */}
            <div className="h-10 border-b border-border bg-card flex items-center px-4 gap-1 flex-shrink-0">
                {Array.from({ length: 12 }).map((_, i) => (
                    <Skeleton key={i} className="h-7 w-7 rounded" />
                ))}
            </div>
            {/* 编辑区骨架 */}
            <div className="flex-1 overflow-auto p-8">
                <div className="max-w-[800px] mx-auto space-y-4">
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                </div>
            </div>
            {/* 状态栏骨架 */}
            <div className="h-8 border-t border-border bg-card flex items-center px-4 gap-2 flex-shrink-0">
                <Skeleton className="h-4 w-20" />
                <div className="flex-1" />
                <Skeleton className="h-4 w-16" />
            </div>
        </div>
    );
}
