'use client';

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
                        <button
                            onClick={reset}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition"
                        >
                            Try again
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
