export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/40">
            <div className="w-full max-w-md px-6 py-8">{children}</div>
        </div>
    );
}
