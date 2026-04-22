import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
    return (
        <div className="mx-auto px-4 py-8 space-y-6">
            {/* 标题栏骨架 */}
            <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-10 w-32" />
            </div>
            {/* 卡片网格骨架 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-card rounded-lg border border-border p-6 space-y-3">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                ))}
            </div>
        </div>
    );
}
