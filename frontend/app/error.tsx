'use client';

import { Button } from '@/components/ui/button';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <div className="max-w-md text-center">
                <h2 className="text-2xl font-bold text-foreground mb-4">Something went wrong</h2>
                <p className="text-muted-foreground mb-6">
                    {error.message || 'An unexpected error occurred.'}
                </p>
                <Button onClick={reset}>Try again</Button>
            </div>
        </div>
    );
}
