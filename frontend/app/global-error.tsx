'use client';

import { Button } from '@/components/ui/button';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html lang="en">
            <body className="bg-background text-foreground">
                <div className="flex min-h-screen flex-col items-center justify-center p-4">
                    <div className="max-w-md text-center">
                        <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
                        <p className="text-muted-foreground mb-6">
                            {error.message || 'An unexpected error occurred.'}
                        </p>
                        <Button onClick={reset}>Try again</Button>
                    </div>
                </div>
            </body>
        </html>
    );
}
