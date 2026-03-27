import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Collab Editor</h1>
        <p className="text-gray-600 mb-8">
          Real-time collaborative document editor
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="px-6 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition"
          >
            Register
          </Link>
        </div>
      </div>
    </main>
  );
}
