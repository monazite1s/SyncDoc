'use client';

import Link from 'next/link';

const inputClass =
    'w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground';

export default function RegisterPage() {
    return (
        <div className="bg-card p-8 rounded-lg shadow-md border border-border">
            <h1 className="text-2xl font-bold text-center mb-6 text-foreground">Register</h1>
            <form className="space-y-4">
                <div>
                    <label
                        htmlFor="username"
                        className="block text-sm font-medium text-foreground mb-1"
                    >
                        Username
                    </label>
                    <input
                        type="text"
                        id="username"
                        className={inputClass}
                        placeholder="Choose a username"
                    />
                </div>
                <div>
                    <label
                        htmlFor="email"
                        className="block text-sm font-medium text-foreground mb-1"
                    >
                        Email
                    </label>
                    <input
                        type="email"
                        id="email"
                        className={inputClass}
                        placeholder="Enter your email"
                    />
                </div>
                <div>
                    <label
                        htmlFor="password"
                        className="block text-sm font-medium text-foreground mb-1"
                    >
                        Password
                    </label>
                    <input
                        type="password"
                        id="password"
                        className={inputClass}
                        placeholder="Create a password"
                    />
                </div>
                <button
                    type="submit"
                    className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition"
                >
                    Register
                </button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="text-primary hover:underline">
                    Login
                </Link>
            </p>
        </div>
    );
}
