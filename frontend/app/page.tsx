import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-foreground">Collab Editor</h1>
        <p className="text-muted-foreground mb-8">Real-time collaborative document editor</p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="px-6 py-2 border border-primary text-primary rounded-lg hover:bg-primary/10 transition"
          >
            Register
          </Link>
        </div>
      </div>
    </main>
  );
}
