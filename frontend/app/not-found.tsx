import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <div className="max-w-md text-center">
                <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
                <h2 className="text-2xl font-bold text-foreground mb-4">Page not found</h2>
                <p className="text-muted-foreground mb-8">
                    The page you are looking for does not exist or has been moved.
                </p>
                <Link
                    href="/"
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition"
                >
                    Go back home
                </Link>
            </div>
        </div>
    );
}
