'use client';

export default function SettingsPage() {
    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-8 text-foreground">Settings</h1>
            <div className="bg-card rounded-lg border border-border p-6 space-y-6">
                <div>
                    <h2 className="text-lg font-medium mb-4 text-foreground">Profile</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                                Username
                            </label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
                                placeholder="Username"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
                                placeholder="Email"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                                Nickname
                            </label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
                                placeholder="Nickname (optional)"
                            />
                        </div>
                    </div>
                </div>
                <div className="pt-4 border-t border-border">
                    <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition">
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
