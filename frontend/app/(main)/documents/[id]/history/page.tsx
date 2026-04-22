'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const HistoryPage = dynamic(() => import('@/components/history/history-page'), {
    ssr: false,
    loading: () => <HistoryPageSkeleton />,
});

interface HistoryPageProps {
    params: Promise<{ id: string }>;
}

export default function DocumentHistoryPage({ params }: HistoryPageProps) {
    return <HistoryPage paramsPromise={params} />;
}

function HistoryPageSkeleton() {
    return (
        <div className="h-screen flex bg-background">
            <aside className="w-[320px] border-r border-border bg-card p-4 space-y-3">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
            </aside>
            <div className="flex-1 p-6 space-y-4">
                <Skeleton className="h-8 w-56" />
                <Skeleton className="h-5 w-72" />
                <Skeleton className="h-[480px] w-full" />
            </div>
        </div>
    );
}
