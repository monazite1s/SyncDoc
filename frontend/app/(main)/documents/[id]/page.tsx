'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const ViewerPage = dynamic(() => import('@/components/viewer/viewer-page'), {
    ssr: false,
    loading: () => <ViewerLoadingSkeleton />,
});

interface DocumentViewPageProps {
    params: Promise<{ id: string }>;
}

export default function DocumentViewPage({ params }: DocumentViewPageProps) {
    return <ViewerPage paramsPromise={params} />;
}

function ViewerLoadingSkeleton() {
    return (
        <div className="h-screen flex flex-col bg-background">
            {/* Header 骨架 */}
            <div className="border-b border-border bg-card">
                <div className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-3 flex-1">
                        <Skeleton className="h-8 w-8 rounded" />
                        <Skeleton className="h-6 w-64" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-8 w-16" />
                    </div>
                </div>
                <div className="flex items-center gap-4 px-6 py-2 border-t border-border/50">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-12" />
                </div>
            </div>
            {/* 内容区骨架 */}
            <div className="flex-1 overflow-auto">
                <div className="max-w-[800px] mx-auto px-6 py-8 space-y-4">
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                </div>
            </div>
        </div>
    );
}
